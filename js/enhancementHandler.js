/**
 * עדכון לקובץ enhancementHandler.js - הוספת תמיכה בפרומפט חופשי
 */

class EnhancementHandler {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.enhancementPerformed = false;
        this.summaryPerformed = false;

        // מפתח API של שירות ה-AI (Groq במקרה הזה)
        this.GROQ_API_KEY = localStorage.getItem('groq_api_key');

        // אלמנטי ממשק
        this.enhancedResult = document.getElementById('enhanced-result');
        this.summaryResult = document.getElementById('summary-result');
        this.enhanceTabBtn = document.querySelector('[data-result-tab="enhanced"]');
        this.summaryTabBtn = document.querySelector('[data-result-tab="summary"]');
        this.summaryLengthSelect = document.getElementById('summary-length');
        this.customPromptContainer = document.getElementById('custom-prompt-container');
        this.customPrompt = document.getElementById('custom-prompt');
        this.generateSummaryBtn = document.getElementById('generate-summary-btn');

        this.enhanceModeSelect = document.getElementById('enhance-mode');
        this.enhanceCustomPromptContainer = document.getElementById('enhance-custom-prompt-container');
        this.enhanceCustomPrompt = document.getElementById('enhance-custom-prompt');
        this.generateEnhancementBtn = document.getElementById('generate-enhancement-btn');


        // קישור אירועים
        this.bindEvents();
    }

    /**
     * קישור אירועים לאלמנטי שיפור AI
     * (מתוך קובץ enhancementHandler.js)
     */
    bindEvents() {
        // קישור לשוניות תוצאה
        const resultTabButtons = document.querySelectorAll('.result-tab-btn');
        const resultTabContents = document.querySelectorAll('.result-tab-content');

        if (resultTabButtons.length > 0) {
            resultTabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // החלפת הטאב הפעיל - חשוב שזה יקרה קודם!
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


                    // לא מפעילים סיכום אוטומטי - משאירים את זה לכפתור "צור סיכום"
                });
            });
        }

        // הוספת האזנה לשינוי באורך הסיכום כדי להציג/להסתיר את אזור הפרומפט החופשי
        if (this.summaryLengthSelect) {
            this.summaryLengthSelect.addEventListener('change', () => {
                // בדיקה אם נבחר פרומפט חופשי
                if (this.summaryLengthSelect.value === 'custom' && this.customPromptContainer) {
                    this.customPromptContainer.style.display = 'block';
                } else if (this.customPromptContainer) {
                    this.customPromptContainer.style.display = 'none';
                }
            });
        }

        // הוספת האזנה לכפתור יצירת הסיכום
        const generateSummaryBtn = document.getElementById('generate-summary-btn');
        if (generateSummaryBtn) {
            console.log('מוסיף האזנה לכפתור "צור סיכום"');

            // שמירת התייחסות ל-this כדי שיהיה נגיש בתוך פונקציית האירוע
            const self = this;

            // מסיר האזנות קודמות (במידה וקיימות)
            const newBtn = generateSummaryBtn.cloneNode(true);
            generateSummaryBtn.parentNode.replaceChild(newBtn, generateSummaryBtn);

            // מוסיף האזנה חדשה (עם שמירת התייחסות ל-this הנכון)
            newBtn.addEventListener('click', function () {
                console.log('כפתור "צור סיכום" נלחץ');
                self.performSummary();
            });
        }

        // הצגת אזור פרומפט חופשי לפי בחירה
        // הצגת אזור פרומפט חופשי אם נבחר
        if (this.enhanceModeSelect) {
            this.enhanceModeSelect.addEventListener('change', () => {
                const isCustom = this.enhanceModeSelect.value === 'custom';
                this.enhanceCustomPromptContainer.style.display = isCustom ? 'block' : 'none';
            });
        }

        // ביצוע הגהה בלחיצה בלבד
        if (this.generateEnhancementBtn) {
            this.generateEnhancementBtn.addEventListener('click', () => {
                this.performEnhancement();
            });
        }


    }

    /**
     * איפוס מצב לשוניות השיפור
     */
    resetState() {
        this.enhancementPerformed = false;
        this.summaryPerformed = false;

        if (this.enhanceModeSelect) this.enhanceModeSelect.value = 'default';
        if (this.enhanceCustomPromptContainer) this.enhanceCustomPromptContainer.style.display = 'none';
        if (this.enhanceCustomPrompt) this.enhanceCustomPrompt.value = '';

        if (this.enhancedResult) this.enhancedResult.value = '';
        if (this.summaryResult) this.summaryResult.value = '';

        // איפוס תיבת פרומפט חופשי
        if (this.customPrompt) this.customPrompt.value = '';
        if (this.customPromptContainer) this.customPromptContainer.style.display = 'none';
        if (this.summaryLengthSelect) this.summaryLengthSelect.value = 'medium';
    }
    /**
     * חלוקת טקסט ארוך לחלקים
     * @param {string} text - הטקסט המלא
     * @param {number} maxTokens - מספר מקסימלי של תווים בכל חלק
     * @returns {string[]} מערך של חלקים
     */
    splitTextIntoChunks(text, maxTokens = 4000) {
        // אם הטקסט קצר מספיק, החזר אותו כמו שהוא
        if (text.length <= maxTokens) {
            return [text];
        }

        // חלוקה לפסקאות
        const paragraphs = text.split('\n\n');
        const chunks = [];
        let currentChunk = '';

        // בניית חלקים מהפסקאות
        for (const paragraph of paragraphs) {
            // אם הוספת הפסקה תחרוג מהגודל המקסימלי
            if (currentChunk.length + paragraph.length + 2 > maxTokens) {
                // שמירת החלק הנוכחי (אם לא ריק)
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }

                // אם הפסקה עצמה ארוכה מדי, חלק אותה לתתי-חלקים
                if (paragraph.length > maxTokens) {
                    let tempParagraph = paragraph;
                    while (tempParagraph.length > 0) {
                        // חיפוש נקודת סיום משפט בגבולות המגבלה
                        let endIndex = maxTokens;
                        while (endIndex > 0 && tempParagraph[endIndex] !== '.' &&
                            tempParagraph[endIndex] !== '!' && tempParagraph[endIndex] !== '?') {
                            endIndex--;
                        }

                        // אם לא נמצאה נקודת סיום, פשוט חתוך במגבלה
                        if (endIndex === 0) {
                            endIndex = Math.min(maxTokens, tempParagraph.length);
                        } else {
                            // כלול את סימן הפיסוק
                            endIndex++;
                        }

                        chunks.push(tempParagraph.substring(0, endIndex));
                        tempParagraph = tempParagraph.substring(endIndex).trim();
                    }
                } else {
                    currentChunk = paragraph;
                }
            } else {
                // הוסף הפסקה לחלק הנוכחי
                if (currentChunk.length > 0) {
                    currentChunk += '\n\n';
                }
                currentChunk += paragraph;
            }
        }

        // הוסף את החלק האחרון אם קיים
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    /**
     * ביצוע הגהה חכמה על התמלול - עם תמיכה בטקסטים ארוכים
     */
    async performEnhancement() {
        if (!this.GROQ_API_KEY) {
            alert('נא להזין מפתח API של Groq בהגדרות כדי להשתמש בהגהה חכמה.');
            return;
        }

        const text = this.ui.transcriptionResult?.value;
        if (!text || !this.enhancedResult || !this.enhanceTabBtn) return;

        // עדכון ממשק בזמן טיפול
        this.enhanceTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מגיה...';
        this.enhancedResult.value = "ממתין להגיה ...";

        // פרומפט ברירת מחדל
        const defaultPrompt = `הטקסט הבא הוא תמלול חופשי או טקסט לא ערוך בעברית.
    
    אנא בצע עליו עריכה לשונית וארגונית מלאה ("הגהה חכמה") הכוללת את הפעולות הבאות:
    
    - תקן שגיאות כתיב, תחביר ופיסוק
    - הפוך את הטקסט לברור, זורם ונעים לקריאה בעברית תקנית בלבד
    - סדר את הטקסט בפסקאות ברורות לפי נושאים
    - הסר חזרות מיותרות וניסוחים מסורבלים
    - אל תדלג על רעיונות חשובים ולא על חלקים משמעותיים
    - שמור על משמעות הדברים המקורית כפי שנאמרו
    - אל תתרגם, אל תכתוב באנגלית, ואל תשתמש בביטויים לועזיים כלל
    - התוצאה הסופית צריכה להיות טקסט עברי ערוך, רהוט, קריא ומובנה — מוכן לפרסום`;

        // בדיקה אם נבחר פרומפט חופשי
        const useCustomPrompt = this.enhanceModeSelect?.value === 'custom';
        const userPrompt = this.enhanceCustomPrompt?.value?.trim();
        const promptPrefix = useCustomPrompt && userPrompt
            ? userPrompt
            : defaultPrompt;

        // חלוקת הטקסט לחלקים אם הוא ארוך מדי
        const textChunks = this.splitTextIntoChunks(text, 3500); // 3500 תווים לכל היותר
        let enhancedResult = '';

        try {
            // עיבוד כל חלק בנפרד
            for (let i = 0; i < textChunks.length; i++) {
                // עדכון הממשק לגבי ההתקדמות
                this.enhancedResult.value = `מעבד חלק ${i + 1} מתוך ${textChunks.length}...`;

                // הכנת הפרומפט המלא עם הטקסט הנוכחי
                const promptText = `${promptPrefix}\n\nהטקסט לעריכה (חלק ${i + 1} מתוך ${textChunks.length}):\n"""\n${textChunks[i]}\n"""`;

                // שליחה ל-API
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama3-70b-8192",
                        messages: [
                            {
                                role: "system",
                                content: promptText
                            }
                        ],
                        temperature: 0.2
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`שגיאת API: ${response.status} - ${error.error?.message || 'שגיאה לא ידועה'}`);
                }

                const data = await response.json();
                const result = data?.choices?.[0]?.message?.content;

                if (result) {
                    // הוספת החלק המוגה לתוצאה המלאה
                    enhancedResult += (enhancedResult ? '\n\n' : '') + result;
                }
            }

            // הצגת התוצאה הסופית
            this.enhancedResult.value = enhancedResult || "לא התקבל טקסט מתוקן.";
            this.enhancementPerformed = true;

        } catch (err) {
            this.enhancedResult.value = `שגיאה בעת ניסיון ההגהה: ${err.message}`;
            console.error(err);
        } finally {
            this.enhanceTabBtn.innerHTML = "הגהה חכמה";
        }
    }


    async performSummary() {
        if (!this.GROQ_API_KEY) {
            alert('נא להזין מפתח API של Groq בהגדרות כדי להשתמש בהגהה חכמה.');
            return;
        }
        const text = this.ui.transcriptionResult?.value;

        if (!text) {
            alert('אין טקסט לסיכום. נא להזין טקסט תחילה.');
            return;
        }

        if (!this.summaryResult || !this.summaryTabBtn || !this.generateSummaryBtn) {
            console.error('חסרים אלמנטים נדרשים לסיכום');
            return;
        }

        // הצגת אייקון טעינה 
        this.summaryTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מסכם...';
        this.generateSummaryBtn.disabled = true;
        this.generateSummaryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מעבד...';
        this.summaryResult.value = "ממתין לתגובה מהשירות...";

        // קבלת ערך הבחירה מהתפריט הנפתח
        const summaryLength = this.summaryLengthSelect?.value || "medium";
        console.log('סוג סיכום נבחר:', summaryLength);

        // פרומפטים מובנים לפי אורך
        const prompts = {
            short: `סכם את הטקסט הבא בעברית פשוטה וקצרה מאוד. כלול רק את הרעיונות המרכזיים ביותר בפסקה אחת.`,
            medium: `סכם את הטקסט הבא בעברית פשוטה וברורה. חלק את הסיכום לפסקאות לפי נושאים. התמקד ברעיונות העיקריים והנקודות המרכזיות.`,
            long: `סכם את הטקסט הבא בעברית מפורטת, ברורה וזורמת. סדר את הסיכום לפי נושאים עם כותרות ביניים, פסקאות נפרדות, ודיוק בנקודות העיקריות. נסח את הדברים בצורה ערוכה, ברורה ונעימה לקריאה, בלי לדלג על פרטים חשובים.`,
            custom: `עבד את הטקסט הבא לפי ההנחיות שתקבל.`
        };

        // קביעת תוכן הפרומפט בהתאם לבחירה
        let promptPrefix;

        if (summaryLength === 'custom' && this.customPrompt) {
            // שימוש בפרומפט החופשי שהוקלד
            promptPrefix = this.customPrompt.value.trim();
            if (!promptPrefix) {
                // אם הפרומפט החופשי ריק, השתמש בברירת מחדל
                promptPrefix = prompts.medium;
                console.log('פרומפט חופשי ריק, משתמש בברירת מחדל');
            }
        } else {
            // שימוש בפרומפט מוגדר מראש
            promptPrefix = prompts[summaryLength] || prompts.medium;
            console.log('משתמש בפרומפט מובנה:', summaryLength);
        }

        // חלוקת הטקסט לחלקים אם הוא ארוך מדי
        const textChunks = this.splitTextIntoChunks(text, 3500); // מגביל ל-3500 תווים לבטיחות
        let summaryResult = '';

        try {
            // אם יש יותר מחלק אחד, נעבד כל אחד בנפרד ואז נסכם את הסיכומים
            if (textChunks.length > 1) {
                // סיכום ראשוני לכל חלק
                const chunkSummaries = [];

                for (let i = 0; i < textChunks.length; i++) {
                    // עדכון הממשק
                    this.summaryResult.value = `מסכם חלק ${i + 1} מתוך ${textChunks.length}...`;

                    // סיכום החלק הנוכחי
                    const promptContent = `${promptPrefix}\n\nזהו חלק ${i + 1} מתוך ${textChunks.length} של טקסט ארוך. סכם חלק זה בנפרד:\n\n${textChunks[i]}`;

                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${this.GROQ_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "llama3-70b-8192",
                            messages: [
                                {
                                    role: "system",
                                    content: promptContent
                                }
                            ],
                            temperature: 0.3
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`שגיאת שרת: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    const chunkSummary = data?.choices?.[0]?.message?.content;

                    if (chunkSummary) {
                        chunkSummaries.push(chunkSummary);
                    }
                }

                // עכשיו סיכום מסכם לכל החלקים יחד
                if (chunkSummaries.length > 0) {
                    this.summaryResult.value = `יוצר סיכום סופי מכל החלקים...`;

                    const combinedSummaries = chunkSummaries.join("\n\n--- חלק נוסף ---\n\n");
                    const finalPrompt = `הנה סיכומים נפרדים של חלקים שונים מטקסט ארוך יותר. 
                    אנא שלב אותם לסיכום אחד קוהרנטי וזורם, בהתאם להנחיות הבאות:
                    ${promptPrefix}
                    
                    הסיכומים הנפרדים:
                    ${combinedSummaries}`;

                    const finalResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${this.GROQ_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "llama3-70b-8192",
                            messages: [
                                {
                                    role: "system",
                                    content: finalPrompt
                                }
                            ],
                            temperature: 0.3
                        })
                    });

                    if (!finalResponse.ok) {
                        throw new Error(`שגיאת שרת בסיכום הסופי: ${finalResponse.status}`);
                    }

                    const finalData = await finalResponse.json();
                    summaryResult = finalData?.choices?.[0]?.message?.content || "לא התקבל סיכום סופי.";
                } else {
                    throw new Error("לא הצלחנו לקבל סיכומים לחלקי הטקסט");
                }
            } else {
                // אם יש רק חלק אחד, נסכם אותו ישירות
                const promptContent = `${promptPrefix}\n\n${text}`;

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama3-70b-8192",
                        messages: [
                            {
                                role: "system",
                                content: promptContent
                            }
                        ],
                        temperature: 0.3
                    })
                });

                if (!response.ok) {
                    throw new Error(`שגיאת שרת: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                summaryResult = data?.choices?.[0]?.message?.content || "לא התקבל סיכום.";
            }

            // הצגת התוצאה הסופית
            this.summaryResult.value = summaryResult;
            this.summaryPerformed = true;

            // החלפת הטאב הפעיל לסיכום
            const summaryTabBtn = document.querySelector('[data-result-tab="summary"]');
            const summaryTabContent = document.getElementById('summary-content');

            if (summaryTabBtn && summaryTabContent) {
                document.querySelectorAll('.result-tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.result-tab-content').forEach(tab => tab.classList.remove('active'));

                summaryTabBtn.classList.add('active');
                summaryTabContent.classList.add('active');
            }

        } catch (err) {
            console.error('שגיאה בתהליך הסיכום:', err);
            this.summaryResult.value = `שגיאה בעת ניסיון הסיכום: ${err.message}`;
            if (this.ui && typeof this.ui.showError === 'function') {
                this.ui.showError(err.message);
            }
        } finally {
            // איפוס כפתורים וטאבים
            if (this.summaryTabBtn) {
                this.summaryTabBtn.innerHTML = "סיכום AI";
            }
            if (this.generateSummaryBtn) {
                this.generateSummaryBtn.disabled = false;
                this.generateSummaryBtn.innerHTML = '<i class="fas fa-magic"></i> צור סיכום';
            }
        }
    }
}

// ייצוא המחלקה
window.EnhancementHandler = EnhancementHandler;