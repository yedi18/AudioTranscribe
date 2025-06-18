/**
 * מודול מלא לטיפול בהגהה וסיכום חכמים עם AI - עם OpenAI כברירת מחדל
 */

class EnhancementHandler {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.enhancementPerformed = false;
        this.summaryPerformed = false;
        this.currentProcessingAbortController = null;

        // מפתחות API לשירותי AI שונים (ללא Hugging Face)
        this.API_KEYS = {
            openai: localStorage.getItem('openai_api_key') || '',
            groq: localStorage.getItem('groq_api_key') || '',
            anthropic: localStorage.getItem('anthropic_api_key') || '',
            gemini: localStorage.getItem('gemini_api_key') || ''
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
        if (this.enhancedResult) {
            this.enhancedResult.innerHTML = '<div class="processing-message"><i class="fas fa-magic"></i>לחץ על "בצע הגהה" כדי לשפר את הטקסט באמצעות AI</div>';
        }

        // איפוס סיכום
        if (this.summaryLengthSelect) this.summaryLengthSelect.value = 'medium';
        if (this.customPromptContainer) this.customPromptContainer.style.display = 'none';
        if (this.customPrompt) this.customPrompt.value = '';
        if (this.summaryResult) {
            this.summaryResult.innerHTML = '<div class="processing-message"><i class="fas fa-brain"></i>לחץ על "צור סיכום" כדי לקבל סיכום חכם של הטקסט</div>';
        }

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
        const provider = this.enhanceProviderSelect?.value || 'openai'; // ברירת מחדל: OpenAI
        const apiKey = this.getApiKey(provider);

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

            // שמירה בהיסטוריה
            if (this.ui.transcriptionHistory && this.ui.selectedFile) {
                this.ui.transcriptionHistory.addTranscription({
                    fileName: this.ui.selectedFile.name,
                    source: this.ui.selectedFile.source || 'upload',
                    transcription: text,
                    enhanced: enhancedResult,
                    fileSize: this.ui.selectedFile.size
                });
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                this.enhancedResult.innerHTML = '<div class="error-message">התהליך בוטל על ידי המשתמש</div>';
            } else {
                this.enhancedResult.innerHTML = `<div class="error-message">שגיאה בהגהה: ${err.message}</div>`;
            }
        } finally {
            this.enhanceTabBtn.innerHTML = '<i class="fas fa-magic"></i> הגהה חכמה';
            this.generateEnhancementBtn.disabled = false;
            this.generateEnhancementBtn.innerHTML = '<i class="fas fa-pen-to-square"></i> בצע הגהה';
            this.currentProcessingAbortController = null;
        }
    }

    /**
     * ביצוע סיכום AI
     */
    async performSummary() {
        const provider = this.summaryProviderSelect?.value || 'openai'; // ברירת מחדל: OpenAI
        const apiKey = this.getApiKey(provider);

        if (!apiKey) {
            alert(`נא להזין מפתח API של ${this.getProviderName(provider)} בהגדרות`);
            return;
        }

        const text = this.ui.transcriptionResult?.value;
        if (!text || !this.summaryResult || !this.summaryTabBtn) return;

        // עדכון ממשק
        this.summaryTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מסכם...';
        this.summaryResult.innerHTML = '<div class="processing-message"><i class="fas fa-cog fa-spin"></i> מתחיל יצירת סיכום...</div>';

        // יצירת AbortController לביטול
        this.currentProcessingAbortController = new AbortController();

        try {
            // קבלת הפרומפט
            const prompt = this.getSummaryPrompt();
            
            // חלוקת הטקסט
            const textChunks = this.splitTextIntoChunks(text, 3500);
            
            if (textChunks.length > 1) {
                this.summaryResult.innerHTML = `<div class="processing-message"><i class="fas fa-cut"></i> מחלק טקסט ל-${textChunks.length} חלקים...</div>`;
            }

            let summaryResult = '';

            for (let i = 0; i < textChunks.length; i++) {
                if (this.currentProcessingAbortController.signal.aborted) {
                    return;
                }

                this.summaryResult.innerHTML = `<div class="processing-message"><i class="fas fa-brain fa-spin"></i> מסכם חלק ${i + 1} מתוך ${textChunks.length}...</div>`;

                const chunkPrompt = textChunks.length > 1 
                    ? `${prompt}\n\nחלק ${i + 1} מתוך ${textChunks.length}:\n${textChunks[i]}`
                    : `${prompt}\n\n${textChunks[i]}`;

                const result = await this.callAI(provider, apiKey, chunkPrompt, this.currentProcessingAbortController.signal);
                
                if (result) {
                    summaryResult += (summaryResult ? '\n\n' : '') + result;
                }

                // עיכוב קטן בין בקשות
                if (i < textChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            this.summaryResult.innerHTML = this.formatTextWithMarkdown(summaryResult || "לא התקבל סיכום.");
            this.summaryPerformed = true;

            // שמירה בהיסטוריה
            if (this.ui.transcriptionHistory && this.ui.selectedFile) {
                this.ui.transcriptionHistory.addTranscription({
                    fileName: this.ui.selectedFile.name,
                    source: this.ui.selectedFile.source || 'upload',
                    transcription: text,
                    summary: summaryResult,
                    fileSize: this.ui.selectedFile.size
                });
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                this.summaryResult.innerHTML = '<div class="error-message">התהליך בוטל על ידי המשתמש</div>';
            } else {
                this.summaryResult.innerHTML = `<div class="error-message">שגיאה בסיכום: ${err.message}</div>`;
            }
        } finally {
            this.summaryTabBtn.innerHTML = '<i class="fas fa-brain"></i> סיכום AI';
            this.generateSummaryBtn.disabled = false;
            this.generateSummaryBtn.innerHTML = '<i class="fas fa-brain"></i> צור סיכום';
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
            },
            gemini: {
                url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4000
                    }
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
        switch (provider) {
            case 'anthropic':
                return data.content?.[0]?.text || '';
            case 'gemini':
                return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            case 'openai':
            case 'groq':
            default:
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
     * קבלת מפתח API לפי ספק
     */
    getApiKey(provider) {
        // רענון מפתחות מ-localStorage
        this.API_KEYS = {
            openai: localStorage.getItem('openai_api_key') || '',
            groq: localStorage.getItem('groq_api_key') || '',
            anthropic: localStorage.getItem('anthropic_api_key') || '',
            gemini: localStorage.getItem('gemini_api_key') || ''
        };
        
        return this.API_KEYS[provider] || '';
    }

    /**
     * קבלת שם ספק
     */
    getProviderName(provider) {
        const names = {
            openai: 'OpenAI',
            groq: 'Groq',
            anthropic: 'Anthropic Claude',
            gemini: 'Google Gemini'
        };
        return names[provider] || provider;
    }

    /**
     * בדיקה אם ספק תומך בתמלול
     */
    supportsTranscription(provider) {
        const transcriptionProviders = ['openai', 'groq', 'gemini'];
        return transcriptionProviders.includes(provider);
    }

    /**
     * בדיקה אם ספק תומך בהגהה וסיכום
     */
    supportsEnhancement(provider) {
        const enhancementProviders = ['openai', 'groq', 'anthropic', 'gemini'];
        return enhancementProviders.includes(provider);
    }

    /**
     * קבלת רשימת ספקים זמינים להגהה
     */
    getAvailableEnhancementProviders() {
        const providers = [];
        
        ['openai', 'groq', 'anthropic', 'gemini'].forEach(provider => {
            if (this.getApiKey(provider)) {
                providers.push({
                    id: provider,
                    name: this.getProviderName(provider),
                    supportsTranscription: this.supportsTranscription(provider),
                    supportsEnhancement: this.supportsEnhancement(provider)
                });
            }
        });
        
        return providers;
    }

    /**
     * עדכון אפשרויות ספקים בממשק
     */
    updateProviderOptions() {
        const availableProviders = this.getAvailableEnhancementProviders();
        
        // עדכון select של הגהה
        if (this.enhanceProviderSelect) {
            const currentValue = this.enhanceProviderSelect.value;
            this.enhanceProviderSelect.innerHTML = '';
            
            availableProviders.forEach(provider => {
                if (provider.supportsEnhancement) {
                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = provider.name;
                    // הגדרת OpenAI כברירת מחדל
                    if (provider.id === 'openai') {
                        option.selected = true;
                    }
                    this.enhanceProviderSelect.appendChild(option);
                }
            });
            
            // שחזור הערך הקודם אם קיים ולא OpenAI
            if (currentValue && currentValue !== 'openai' && this.enhanceProviderSelect.querySelector(`option[value="${currentValue}"]`)) {
                this.enhanceProviderSelect.value = currentValue;
            }
        }
        
        // עדכון select של סיכום
        if (this.summaryProviderSelect) {
            const currentValue = this.summaryProviderSelect.value;
            this.summaryProviderSelect.innerHTML = '';
            
            availableProviders.forEach(provider => {
                if (provider.supportsEnhancement) {
                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = provider.name;
                    // הגדרת OpenAI כברירת מחדל
                    if (provider.id === 'openai') {
                        option.selected = true;
                    }
                    this.summaryProviderSelect.appendChild(option);
                }
            });
            
            // שחזור הערך הקודם אם קיים ולא OpenAI
            if (currentValue && currentValue !== 'openai' && this.summaryProviderSelect.querySelector(`option[value="${currentValue}"]`)) {
                this.summaryProviderSelect.value = currentValue;
            }
        }
    }

    /**
     * יצירת הודעת שגיאה מפורטת
     */
    createErrorMessage(error, provider) {
        let errorMsg = `שגיאה ב${this.getProviderName(provider)}: `;
        
        if (error.message.includes('401')) {
            errorMsg += 'מפתח API לא תקין או פג תוקפו';
        } else if (error.message.includes('429')) {
            errorMsg += 'חרגת ממכסת השימוש. נסה מאוחר יותר';
        } else if (error.message.includes('503')) {
            errorMsg += 'השירות זמנית לא זמין. נסה מאוחר יותר';
        } else {
            errorMsg += error.message;
        }
        
        return errorMsg;
    }

    /**
     * בדיקת תקינות מפתח API
     */
    async validateApiKey(provider, apiKey) {
        try {
            const testPrompt = "בדיקה";
            await this.callAI(provider, apiKey, testPrompt);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * קבלת הגדרות ברירת מחדל לספק
     */
    getProviderDefaults(provider) {
        const defaults = {
            openai: {
                model: 'gpt-3.5-turbo',
                temperature: 0.3,
                maxTokens: 4000
            },
            groq: {
                model: 'llama3-70b-8192',
                temperature: 0.3,
                maxTokens: 4000
            },
            anthropic: {
                model: 'claude-3-sonnet-20240229',
                temperature: 0.3,
                maxTokens: 4000
            },
            gemini: {
                model: 'gemini-pro',
                temperature: 0.3,
                maxTokens: 4000
            }
        };
        
        return defaults[provider] || defaults.openai;
    }

    /**
     * פורמט הודעות לספקים שונים
     */
    formatPromptForProvider(provider, prompt) {
        switch (provider) {
            case 'anthropic':
                return `אתה עוזר AI מומחה בעיבוד טקסט בעברית. ${prompt}`;
            case 'gemini':
                return `אנא עבד את הטקסט הבא בעברית לפי ההוראות: ${prompt}`;
            case 'groq':
            case 'openai':
            default:
                return prompt;
        }
    }

    /**
     * טיפול בשגיאות רשת
     */
    handleNetworkError(error, provider) {
        if (error.name === 'AbortError') {
            return 'התהליך בוטל על ידי המשתמש';
        }
        
        if (error.message.includes('Failed to fetch')) {
            return `בעיית חיבור ל${this.getProviderName(provider)}. בדוק את החיבור לאינטרנט`;
        }
        
        return this.createErrorMessage(error, provider);
    }

    /**
     * שמירת תוצאות בזיכרון מקומי
     */
    saveResultToCache(text, result, provider, type) {
        const cacheKey = `${type}_cache_${provider}`;
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        const textHash = this.simpleHash(text);
        
        cache[textHash] = {
            result,
            timestamp: Date.now(),
            provider
        };
        
        // שמירה של מקסימום 10 תוצאות אחרונות
        const entries = Object.entries(cache);
        if (entries.length > 10) {
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            const newCache = {};
            entries.slice(0, 10).forEach(([key, value]) => {
                newCache[key] = value;
            });
            localStorage.setItem(cacheKey, JSON.stringify(newCache));
        } else {
            localStorage.setItem(cacheKey, JSON.stringify(cache));
        }
    }

    /**
     * קבלת תוצאה מהזיכרון המקומי
     */
    getResultFromCache(text, provider, type) {
        const cacheKey = `${type}_cache_${provider}`;
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        const textHash = this.simpleHash(text);
        
        const cached = cache[textHash];
        if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) { // 24 שעות
            return cached.result;
        }
        
        return null;
    }

    /**
     * יצירת hash פשוט לטקסט
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    /**
     * ניקוי זיכרון מקומי של תוצאות ישנות
     */
    cleanupCache() {
        const cacheKeys = ['enhancement_cache_', 'summary_cache_'];
        const providers = ['openai', 'groq', 'anthropic', 'gemini'];
        
        cacheKeys.forEach(baseKey => {
            providers.forEach(provider => {
                const cacheKey = baseKey + provider;
                const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                const now = Date.now();
                const cleaned = {};
                
                Object.entries(cache).forEach(([key, value]) => {
                    if (now - value.timestamp < 7 * 24 * 60 * 60 * 1000) { // שבוע
                        cleaned[key] = value;
                    }
                });
                
                localStorage.setItem(cacheKey, JSON.stringify(cleaned));
            });
        });
    }

    /**
     * רענון מפתחות API מ-localStorage
     */
    refreshApiKeys() {
        this.API_KEYS = {
            openai: localStorage.getItem('openai_api_key') || '',
            groq: localStorage.getItem('groq_api_key') || '',
            anthropic: localStorage.getItem('anthropic_api_key') || '',
            gemini: localStorage.getItem('gemini_api_key') || ''
        };
    }

    /**
     * בדיקה אם יש ספק זמין להגהה
     */
    hasAvailableProviders() {
        this.refreshApiKeys();
        return Object.values(this.API_KEYS).some(key => key.length > 0);
    }

    /**
     * קבלת ספק ברירת מחדל זמין (OpenAI ראשון)
     */
    getDefaultAvailableProvider() {
        this.refreshApiKeys();
        
        // סדר עדיפות - OpenAI ראשון
        const priorityOrder = ['openai', 'groq', 'gemini', 'anthropic'];
        
        for (const provider of priorityOrder) {
            if (this.API_KEYS[provider]) {
                return provider;
            }
        }
        
        return null;
    }

    /**
     * הצגת הודעה אם אין ספקים זמינים
     */
    showNoProvidersMessage() {
        const message = `
            <div class="no-providers-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>לא הוגדרו מפתחות API</h4>
                <p>כדי להשתמש בהגהה וסיכום חכמים, יש להגדיר לפחות מפתח API אחד בהגדרות.</p>
                <button onclick="document.getElementById('api-settings-btn').click()" class="btn btn-primary">
                    <i class="fas fa-cog"></i> פתח הגדרות API
                </button>
            </div>
        `;
        
        return message;
    }

    /**
     * אתחול מחדש של המנהל
     */
    reinitialize() {
        this.refreshApiKeys();
        this.updateProviderOptions();
        this.cleanupCache();
        
        // איפוס מצב אם נדרש
        if (!this.hasAvailableProviders()) {
            this.resetState();
        }
    }

    /**
     * הרס המנהל וניקוי משאבים
     */
    destroy() {
        // עצירת תהליכים רצים
        if (this.currentProcessingAbortController) {
            this.currentProcessingAbortController.abort();
            this.currentProcessingAbortController = null;
        }
        
        // ניקוי event listeners
        if (this.generateEnhancementBtn) {
            this.generateEnhancementBtn.removeEventListener('click', this.performEnhancement);
        }
        
        if (this.generateSummaryBtn) {
            this.generateSummaryBtn.removeEventListener('click', this.performSummary);
        }
        
        // ניקוי זיכרון
        this.cleanupCache();
    }
}

// ייצוא המחלקה
window.EnhancementHandler = EnhancementHandler;