/**
 * מודול מלא לטיפול בהגהה וסיכום חכמים עם AI
 */

class EnhancementHandler {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.enhancementPerformed = false;
        this.summaryPerformed = false;
        this.currentProcessingAbortController = null;

        // מפתחות API לשירותי AI שונים
        this.API_KEYS = {
            openai: localStorage.getItem('openai_api_key') || '',
            groq: localStorage.getItem('groq_api_key') || '',
            anthropic: localStorage.getItem('anthropic_api_key') || ''
        };

        // אלמנטי ממשק
        this.enhancedResult = document.getElementById('enhanced-result');
        this.summaryResult = document.getElementById('summary-result');
        this.enhanceTabBtn = document.querySelector('[data-result-tab="enhanced"]');
        this.summaryTabBtn = document.querySelector('[data-result-tab="summary"]');
        
        // אלמנטי הגהה
        this.enhanceModeSelect = document.getElementById('enhance-mode');
        this.enhanceCustomPromptContainer = document.getElementById('enhance-custom-prompt-container');
        this.enhanceCustomPrompt = document.getElementById('enhance-custom-prompt');
        this.generateEnhancementBtn = document.getElementById('generate-enhancement-btn');
        this.enhanceProviderSelect = document.getElementById('enhance-provider-select');
        
        // אלמנטי סיכום
        this.summaryLengthSelect = document.getElementById('summary-length');
        this.customPromptContainer = document.getElementById('custom-prompt-container');
        this.customPrompt = document.getElementById('custom-prompt');
        this.generateSummaryBtn = document.getElementById('generate-summary-btn');
        this.summaryProviderSelect = document.getElementById('summary-provider-select');

        // קישור אירועים
        this.bindEvents();
    }

    /**
     * קישור אירועים לאלמנטי הגהה וסיכום
     */
    bindEvents() {
        // קישור לשוניות תוצאה
        const resultTabButtons = document.querySelectorAll('.result-tab-btn');
        const resultTabContents = document.querySelectorAll('.result-tab-content');

        if (resultTabButtons.length > 0) {
            resultTabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.getAttribute('data-result-tab');

                    // הסרת מחלקת active מכל הטאבים
                    resultTabButtons.forEach(btn => btn.classList.remove('active'));
                    resultTabContents.forEach(content => content.classList.remove('active'));

                    // הוספת מחלקת active לטאב שנבחר
                    button.classList.add('active');
                    const contentElement = document.getElementById(`${tabId}-content`);
                    if (contentElement) {
                        contentElement.classList.add('active');
                    }
                });
            });
        }

        // אירועי הגהה
        if (this.enhanceModeSelect) {
            this.enhanceModeSelect.addEventListener('change', () => {
                const isCustom = this.enhanceModeSelect.value === 'custom';
                if (this.enhanceCustomPromptContainer) {
                    this.enhanceCustomPromptContainer.style.display = isCustom ? 'block' : 'none';
                }
            });
        }

        if (this.generateEnhancementBtn) {
            this.generateEnhancementBtn.addEventListener('click', () => {
                this.performEnhancement();
            });
        }

        // אירועי סיכום
        if (this.summaryLengthSelect) {
            this.summaryLengthSelect.addEventListener('change', () => {
                const isCustom = this.summaryLengthSelect.value === 'custom';
                if (this.customPromptContainer) {
                    this.customPromptContainer.style.display = isCustom ? 'block' : 'none';
                }
            });
        }

        if (this.generateSummaryBtn) {
            this.generateSummaryBtn.addEventListener('click', () => {
                this.performSummary();
            });
        }
    }

    /**
     * איפוס מצב הגהה וסיכום
     */
    resetState() {
        this.enhancementPerformed = false;
        this.summaryPerformed = false;

        // איפוס הגהה
        if (this.enhanceModeSelect) this.enhanceModeSelect.value = 'default';
        if (this.enhanceCustomPromptContainer) this.enhanceCustomPromptContainer.style.display = 'none';
        if (this.enhanceCustomPrompt) this.enhanceCustomPrompt.value = '';
        if (this.enhancedResult) this.enhancedResult.innerHTML = '';

        // איפוס סיכום
        if (this.summaryLengthSelect) this.summaryLengthSelect.value = 'medium';
        if (this.customPromptContainer) this.customPromptContainer.style.display = 'none';
        if (this.customPrompt) this.customPrompt.value = '';
        if (this.summaryResult) this.summaryResult.innerHTML = '';

        // עצירת תהליכים רצים
        if (this.currentProcessingAbortController) {
            this.currentProcessingAbortController.abort();
            this.currentProcessingAbortController = null;
        }
    }

    /**
     * חלוקת טקסט ארוך לחלקים חכמה
     */
    splitTextIntoChunks(text, maxTokens = 3500) {
        if (text.length <= maxTokens) {
            return [text];
        }

        const paragraphs = text.split('\n\n');
        const chunks = [];
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length + 2 > maxTokens) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }

                if (paragraph.length > maxTokens) {
                    let tempParagraph = paragraph;
                    while (tempParagraph.length > 0) {
                        let endIndex = maxTokens;
                        while (endIndex > 0 && 
                               tempParagraph[endIndex] !== '.' &&
                               tempParagraph[endIndex] !== '!' && 
                               tempParagraph[endIndex] !== '?' &&
                               tempParagraph[endIndex] !== '\n') {
                            endIndex--;
                        }

                        if (endIndex === 0) {
                            endIndex = Math.min(maxTokens, tempParagraph.length);
                        } else {
                            endIndex++;
                        }

                        chunks.push(tempParagraph.substring(0, endIndex).trim());
                        tempParagraph = tempParagraph.substring(endIndex).trim();
                    }
                } else {
                    currentChunk = paragraph;
                }
            } else {
                if (currentChunk.length > 0) {
                    currentChunk += '\n\n';
                }
                currentChunk += paragraph;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * ביצוע הגהה חכמה
     */
    async performEnhancement() {
        const provider = this.enhanceProviderSelect?.value || 'openai';
        const apiKey = this.API_KEYS[provider];

        if (!apiKey) {
            alert(`נא להזין מפתח API של ${this.getProviderName(provider)} בהגדרות`);
            return;
        }

        const text = this.ui.transcriptionResult?.value;
        if (!text || !this.enhancedResult || !this.enhanceTabBtn) return;

        // עדכון ממשק
        this.enhanceTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מגיה...';
        this.enhancedResult.innerHTML = '<div class="processing-message"><i class="fas fa-cog fa-spin"></i> מתחיל הגהה חכמה...</div>';

        // יצירת AbortController לביטול
        this.currentProcessingAbortController = new AbortController();

        try {
            // קבלת הפרומפט
            const prompt = this.getEnhancementPrompt();
            
            // חלוקת הטקסט
            const textChunks = this.splitTextIntoChunks(text, 3500);
            
            if (textChunks.length > 1) {
                this.enhancedResult.innerHTML = `<div class="processing-message"><i class="fas fa-cut"></i> מחלק טקסט ל-${textChunks.length} חלקים...</div>`;
            }

            let enhancedResult = '';

            for (let i = 0; i < textChunks.length; i++) {
                if (this.currentProcessingAbortController.signal.aborted) {
                    return;
                }

                this.enhancedResult.innerHTML = `<div class="processing-message"><i class="fas fa-magic fa-spin"></i> מעבד חלק ${i + 1} מתוך ${textChunks.length}...</div>`;

                const chunkPrompt = textChunks.length > 1 
                    ? `${prompt}\n\nחלק ${i + 1} מתוך ${textChunks.length}:\n${textChunks[i]}`
                    : `${prompt}\n\n${textChunks[i]}`;

                const result = await this.callAI(provider, apiKey, chunkPrompt, this.currentProcessingAbortController.signal);
                
                if (result) {
                    enhancedResult += (enhancedResult ? '\n\n' : '') + result;
                }

                // עיכוב קטן בין בקשות
                if (i < textChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            this.enhancedResult.innerHTML = this.formatTextWithMarkdown(enhancedResult || "לא התקבל טקסט מתוקן.");
            this.enhancementPerformed = true;

        } catch (err) {
            if (err.name === 'AbortError') {
                this.enhancedResult.innerHTML = '<div class="error-message">התהליך בוטל על ידי המשתמש</div>';
            } else {
                this.enhancedResult.innerHTML = `<div class="error-message">שגיאה בהגהה: ${err.message}</div>`;
                console.error(err);
            }
        } finally {
            this.enhanceTabBtn.innerHTML = "הגהה חכמה";
            this.currentProcessingAbortController = null;
        }
    }

    /**
     * ביצוע סיכום חכם
     */
    async performSummary() {
        const provider = this.summaryProviderSelect?.value || 'openai';
        const apiKey = this.API_KEYS[provider];

        if (!apiKey) {
            alert(`נא להזין מפתח API של ${this.getProviderName(provider)} בהגדרות`);
            return;
        }

        const text = this.ui.transcriptionResult?.value;
        if (!text) {
            alert('אין טקסט לסיכום');
            return;
        }

        // עדכון ממשק
        this.summaryTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מסכם...';
        this.generateSummaryBtn.disabled = true;
        this.generateSummaryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מעבד...';
        this.summaryResult.innerHTML = '<div class="processing-message"><i class="fas fa-brain fa-spin"></i> מתחיל סיכום חכם...</div>';

        // יצירת AbortController לביטול
        this.currentProcessingAbortController = new AbortController();

        try {
            // קבלת הפרומפט
            const prompt = this.getSummaryPrompt();
            
            // חלוקת הטקסט
            const textChunks = this.splitTextIntoChunks(text, 3500);
            let summaryResult = '';

            if (textChunks.length > 1) {
                this.summaryResult.innerHTML = `<div class="processing-message"><i class="fas fa-cut"></i> מחלק טקסט ל-${textChunks.length} חלקים...</div>`;
                
                // סיכום חלקי
                const chunkSummaries = [];

                for (let i = 0; i < textChunks.length; i++) {
                    if (this.currentProcessingAbortController.signal.aborted) {
                        return;
                    }

                    this.summaryResult.innerHTML = `<div class="processing-message"><i class="fas fa-compress fa-spin"></i> מסכם חלק ${i + 1} מתוך ${textChunks.length}...</div>`;

                    const chunkPrompt = `${prompt}\n\nחלק ${i + 1} מתוך ${textChunks.length}:\n${textChunks[i]}`;
                    const chunkSummary = await this.callAI(provider, apiKey, chunkPrompt, this.currentProcessingAbortController.signal);

                    if (chunkSummary) {
                        chunkSummaries.push(chunkSummary);
                    }

                    if (i < textChunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // סיכום סופי
                if (chunkSummaries.length > 0) {
                    this.summaryResult.innerHTML = '<div class="processing-message"><i class="fas fa-magic fa-spin"></i> יוצר סיכום סופי...</div>';

                    const combinedSummaries = chunkSummaries.join("\n\n");
                    const finalPrompt = `שלב את הסיכומים הבאים לסיכום אחד קוהרנטי:\n\n${combinedSummaries}`;

                    summaryResult = await this.callAI(provider, apiKey, finalPrompt, this.currentProcessingAbortController.signal);
                }
            } else {
                // טקסט קצר - סיכום ישיר
                const fullPrompt = `${prompt}\n\n${text}`;
                summaryResult = await this.callAI(provider, apiKey, fullPrompt, this.currentProcessingAbortController.signal);
            }

            this.summaryResult.innerHTML = this.formatTextWithMarkdown(summaryResult || "לא התקבל סיכום.");
            this.summaryPerformed = true;

            // מעבר לטאב הסיכום
            const summaryTabBtn = document.querySelector('[data-result-tab="summary"]');
            const summaryTabContent = document.getElementById('summary-content');

            if (summaryTabBtn && summaryTabContent) {
                document.querySelectorAll('.result-tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.result-tab-content').forEach(tab => tab.classList.remove('active'));

                summaryTabBtn.classList.add('active');
                summaryTabContent.classList.add('active');
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                this.summaryResult.innerHTML = '<div class="error-message">התהליך בוטל על ידי המשתמש</div>';
            } else {
                console.error('שגיאה בסיכום:', err);
                this.summaryResult.innerHTML = `<div class="error-message">שגיאה בסיכום: ${err.message}</div>`;
            }
        } finally {
            this.summaryTabBtn.innerHTML = "סיכום AI";
            this.generateSummaryBtn.disabled = false;
            this.generateSummaryBtn.innerHTML = '<i class="fas fa-magic"></i> צור סיכום';
            this.currentProcessingAbortController = null;
        }
    }

    /**
     * קבלת פרומפט הגהה
     */
    getEnhancementPrompt() {
        const mode = this.enhanceModeSelect?.value || 'default';
        
        if (mode === 'custom' && this.enhanceCustomPrompt?.value?.trim()) {
            return this.enhanceCustomPrompt.value.trim();
        }

        return `הטקסט הבא הוא תמלול חופשי בעברית. בצע עליו הגהה מלאה:

🔧 משימות הגהה:
• תקן שגיאות כתיב, תחביר ופיסוק
• הפוך את הטקסט לזורם ונעים לקריאה
• סדר בפסקאות ברורות לפי נושאים
• הסר חזרות מיותרות וביטויים מסורבלים
• שמור על המשמעות המקורית של הדברים
• השתמש בעברית תקנית בלבד

📝 עקרונות עיצוב:
• הוסף כותרות משנה רלוונטיות (##)
• השתמש ברשימות מסודרות בהתאם לצורך
• הדגש נקודות חשובות עם **טקסט מודגש**
• הוסף אמוג'ים רלוונטיים לשיפור הקריאות

התוצאה צריכה להיות טקסט ערוך, מובנה וקריא.`;
    }

    /**
     * קבלת פרומפט סיכום
     */
    getSummaryPrompt() {
        const length = this.summaryLengthSelect?.value || 'medium';
        
        if (length === 'custom' && this.customPrompt?.value?.trim()) {
            return this.customPrompt.value.trim();
        }

        const prompts = {
            short: `סכם את הטקסט הבא בעברית קצרה וחדה. כלול רק את הרעיונות המרכזיים ביותר:
• הצג את העיקרי בפסקה אחת
• הדגש נקודות מפתח עם **טקסט מודגש**
• השתמש באמוג'ים רלוונטיים`,

            medium: `סכם את הטקסט הבא בעברית ברורה ומאורגנת:
• חלק לפסקאות לפי נושאים
• השתמש בכותרות משנה (##) לנושאים עיקריים
• הדגש נקודות חשובות עם **טקסט מודגש**
• הוסף אמוג'ים רלוונטיים לשיפור הקריאות
• שמור על איזון בין פירוט לתמציתיות`,

            long: `צור סיכום מפורט ומובנה של הטקסט הבא:
• חלק לסעיפים עם כותרות משנה ברורות (##)
• השתמש ברשימות מסודרות לנקודות מרובות
• הוסף **הדגשות** לנקודות חשובות
• כלול אמוג'ים רלוונטיים
• שמור על הקשר מלא ופרטים משמעותיים
• סיים עם סיכום של המסקנות העיקריות`
        };

        return prompts[length] || prompts.medium;
    }

    /**
     * קריאה לשירות AI
     */
    async callAI(provider, apiKey, prompt, signal) {
        const apis = {
            openai: {
                url: 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                }
            },
            groq: {
                url: 'https://api.groq.com/openai/v1/chat/completions',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    model: 'llama3-70b-8192',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                }
            },
            anthropic: {
                url: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: {
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: prompt }]
                }
            }
        };

        const config = apis[provider];
        if (!config) {
            throw new Error(`ספק AI לא נתמך: ${provider}`);
        }

        const response = await fetch(config.url, {
            method: 'POST',
            headers: config.headers,
            body: JSON.stringify(config.body),
            signal
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`שגיאת API (${response.status}): ${error.error?.message || 'שגיאה לא ידועה'}`);
        }

        const data = await response.json();

        // טיפול בתגובות שונות לפי ספק
        if (provider === 'anthropic') {
            return data.content?.[0]?.text || '';
        } else {
            return data.choices?.[0]?.message?.content || '';
        }
    }

    /**
     * פורמט טקסט עם Markdown
     */
    formatTextWithMarkdown(text) {
        if (!text) return '';

        return text
            // כותרות משנה
            .replace(/^## (.+)$/gm, '<h3 class="section-title">$1</h3>')
            .replace(/^# (.+)$/gm, '<h2 class="main-title">$1</h2>')
            
            // טקסט מודגש
            .replace(/\*\*(.+?)\*\*/g, '<strong class="highlight">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            
            // רשימות
            .replace(/^• (.+)$/gm, '<li class="bullet-item">$1</li>')
            .replace(/^- (.+)$/gm, '<li class="bullet-item">$1</li>')
            
            // שורות ריקות לפסקאות
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            
            // קווים מפרידים
            .replace(/^---$/gm, '<hr class="section-divider">')
            
            // ניקוי HTML שבור
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[23])/g, '$1')
            .replace(/(<\/h[23]>)<\/p>/g, '$1');
    }

    /**
     * קבלת שם ספק
     */
    getProviderName(provider) {
        const names = {
            openai: 'OpenAI',
            groq: 'Groq',
            anthropic: 'Anthropic Claude'
        };
        return names[provider] || provider;
    }
}

// ייצוא המחלקה
window.EnhancementHandler = EnhancementHandler;