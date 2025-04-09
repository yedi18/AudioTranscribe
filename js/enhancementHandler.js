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

                    // הפעלת הגהה אוטומטית אם נבחרה לשונית ההגהה
                    if (tabId === 'enhanced') {
                        // בדיקה אם כבר יש תוכן או שצריך לבצע הגהה חדשה
                        if (!this.enhancedResult.value || this.enhancedResult.value.trim() === '') {
                            this.performEnhancement();
                        }
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
    }

    /**
     * איפוס מצב לשוניות השיפור
     */
    resetState() {
        this.enhancementPerformed = false;
        this.summaryPerformed = false;

        if (this.enhancedResult) this.enhancedResult.value = '';
        if (this.summaryResult) this.summaryResult.value = '';

        // איפוס תיבת פרומפט חופשי
        if (this.customPrompt) this.customPrompt.value = '';
        if (this.customPromptContainer) this.customPromptContainer.style.display = 'none';
        if (this.summaryLengthSelect) this.summaryLengthSelect.value = 'medium';
    }

    /**
     * ביצוע הגהה חכמה על התמלול
     */
    async performEnhancement() {
        if (!this.GROQ_API_KEY) {
            alert('נא להזין מפתח API של Groq בהגדרות כדי להשתמש בסיכום AI.');
            return;
        }
        const text = this.ui.transcriptionResult?.value;

        if (!text || !this.enhancedResult || !this.enhanceTabBtn) return;

        this.enhanceTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מגיה...';
        this.enhancedResult.value = "ממתין להגיה ...";

        try {
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
                            content: `הטקסט הבא הוא תמלול חופשי או טקסט לא ערוך בעברית.
  
  אנא בצע עליו עריכה לשונית וארגונית מלאה ("הגהה חכמה") הכוללת את הפעולות הבאות:
  
  - תקן שגיאות כתיב, תחביר ופיסוק
  - הפוך את הטקסט לברור, זורם ונעים לקריאה בעברית תקנית בלבד
  - סדר את הטקסט בפסקאות ברורות לפי נושאים
  - הסר חזרות מיותרות וניסוחים מסורבלים
  - אל תדלג על רעיונות חשובים ולא על חלקים משמעותיים
  - שמור על משמעות הדברים המקורית כפי שנאמרו
  - אל תתרגם, אל תכתוב באנגלית, ואל תשתמש בביטויים לועזיים כלל
  - התוצאה הסופית צריכה להיות טקסט עברי ערוך, רהוט, קריא ומובנה — מוכן לפרסום
  
  להלן הטקסט לעריכה:
  """
  ${text}
  """
  `
                        }
                    ],
                    temperature: 0.2
                })
            });

            const data = await response.json();
            const result = data?.choices?.[0]?.message?.content;

            this.enhancedResult.value = result || "לא התקבל טקסט מתוקן.";
            this.enhancementPerformed = true;
        } catch (err) {
            this.enhancedResult.value = "שגיאה בעת ניסיון ההגהה.";
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
        let promptContent;

        if (summaryLength === 'custom' && this.customPrompt) {
            // שימוש בפרומפט החופשי שהוקלד
            promptContent = this.customPrompt.value.trim();
            if (!promptContent) {
                // אם הפרומפט החופשי ריק, השתמש בברירת מחדל
                promptContent = prompts.medium;
                console.log('פרומפט חופשי ריק, משתמש בברירת מחדל');
            }
        } else {
            // שימוש בפרומפט מוגדר מראש
            promptContent = prompts[summaryLength] || prompts.medium;
            console.log('משתמש בפרומפט מובנה:', summaryLength);
        }

        try {
            console.log('שולח בקשת סיכום לשרת...');
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
                        },
                        {
                            role: "user",
                            content: text.slice(0, 4000)
                        }
                    ],
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`שגיאת שרת: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('התקבלה תשובה מהשרת');

            const summary = data?.choices?.[0]?.message?.content;

            if (!summary) {
                throw new Error('לא התקבל תוכן בתשובה');
            }

            // בדיקה שיש תוכן לפני עדכון
            if (this.summaryResult) {
                this.summaryResult.value = summary;
            } else {
                console.error('תיבת סיכום לא נמצאה');
            }

            // החלפת הטאב הפעיל לסיכום
            const summaryTabBtn = document.querySelector('[data-result-tab="summary"]');
            const summaryTabContent = document.getElementById('summary-content');

            if (summaryTabBtn && summaryTabContent) {
                document.querySelectorAll('.result-tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.result-tab-content').forEach(tab => tab.classList.remove('active'));

                summaryTabBtn.classList.add('active');
                summaryTabContent.classList.add('active');
            }

            this.summaryPerformed = true;
            console.log('הסיכום הושלם בהצלחה');

        } catch (err) {
            console.error('שגיאה בתהליך הסיכום:', err);

            // הצגת הודעת שגיאה מפורטת
            const errorMessage = `שגיאה בעת ניסיון הסיכום: ${err.message}`;

            if (this.summaryResult) {
                this.summaryResult.value = errorMessage;
            }

            // הצגת השגיאה גם במסך
            if (this.ui && typeof this.ui.showError === 'function') {
                this.ui.showError(errorMessage);
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