/**
 * מודול לטיפול באירועים וקישור אירועים בממשק
 * מרחיב את מחלקת UICore
 */
class UIHandlers extends UICore {
    /**
     * קישור אירועים להעלאת קבצים
     */
    bindFileEvents() {
        if (this.selectFileBtn && this.fileInput) {
            this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        if (this.uploadArea) {
            this.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });

            this.uploadArea.addEventListener('dragleave', () => {
                this.uploadArea.classList.remove('dragover');
            });

            this.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                this.handleFileSelect(e.dataTransfer.files);
            });
        }
    }

    /**
     * קישור אירועים לכפתורים
     */
    bindButtonEvents() {
        // כפתור תמלול
        if (this.transcribeBtn) {
            this.transcribeBtn.addEventListener('click', () => {
                this.onTranscribeClick();
            });
        }

        // אם יש מודול טרנסקריפשן, עדכן את מפתח ה-API
        if (this.transcription) {
            this.transcription.HUGGINGFACE_API_KEY = this.huggingfaceApiKey;
        }

        // כפתור העתקה
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                this.copyTranscription();
            });
        }

        // כפתור תמלול חדש
        if (this.newBtn) {
            this.newBtn.addEventListener('click', () => {
                this.resetUI();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // הגדרות פיצול אודיו
        if (this.splitAudioCheckbox && this.splitSettings) {
            this.splitAudioCheckbox.addEventListener('change', () => {
                this.splitSettings.style.display = this.splitAudioCheckbox.checked ? 'block' : 'none';
            });
        }

        // כפתור סיכום
        const generateSummaryBtn = document.getElementById('generate-summary-btn');
        if (generateSummaryBtn) {
            generateSummaryBtn.addEventListener('click', () => {
                if (typeof this.performSummary === 'function') {
                    this.performSummary();
                }
            });
        }
    }

    /**
     * קישור אירועים לניהול API
     */
    bindAPIEvents() {
        // קישור אירועים לשמירת מפתח API של Huggingface
        if (this.saveHuggingfaceKeyBtn) {
            this.saveHuggingfaceKeyBtn.addEventListener('click', () => {
                this.saveHuggingfaceApiKey();
            });
        }

        // קישור אירועים לשמירת מפתח API של Groq
        if (this.saveGroqKeyBtn) {
            this.saveGroqKeyBtn.addEventListener('click', () => {
                this.saveGroqApiKey();
            });
        }

        // הצגת/הסתרת מפתח API של Huggingface
        if (this.showHuggingfaceKeyCheckbox && this.huggingfaceApiKeyInput) {
            this.showHuggingfaceKeyCheckbox.addEventListener('change', () => {
                this.huggingfaceApiKeyInput.type = this.showHuggingfaceKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // הצגת/הסתרת מפתח API של Groq
        if (this.showGroqKeyCheckbox && this.groqApiKeyInput) {
            this.showGroqKeyCheckbox.addEventListener('change', () => {
                this.groqApiKeyInput.type = this.showGroqKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // טיפול באירועים של מדריך ה-API
        if (this.apiHelpIcon && this.apiGuideModal && this.closeModalBtn) {
            this.apiHelpIcon.addEventListener('click', () => {
                this.apiGuideModal.style.display = 'block';
            });

            this.closeModalBtn.addEventListener('click', () => {
                this.apiGuideModal.style.display = 'none';
            });

            // סגירת המודאל בלחיצה מחוץ לתוכן
            window.addEventListener('click', (e) => {
                if (e.target === this.apiGuideModal) {
                    this.apiGuideModal.style.display = 'none';
                }
            });

            // סגירת המודאל בלחיצה על Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.apiGuideModal.style.display === 'block') {
                    this.apiGuideModal.style.display = 'none';
                }
            });
        }
    }

    /**
     * קישור אירועים ללשוניות ותפריטים נפתחים
     */
    bindTabsAndDropdowns() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        if (tabButtons.length > 0) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // איפוס מוחלט של הממשק לפני מעבר ללשונית
                    this.resetUI();

                    // הסרת מחלקת active מכל הלשוניות
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    // הוספת מחלקת active ללשונית הנבחרת
                    button.classList.add('active');
                    const tabId = button.getAttribute('data-tab');
                    const contentElement = document.getElementById(`${tabId}-content`);
                    if (contentElement) {
                        contentElement.classList.add('active');
                    }

                    // טיפול ספציפי בכל לשונית
                    if (tabId === 'record-audio') {
                        // איפוס ממשק ההקלטה
                        if (this.recordingHandler && typeof this.recordingHandler.resetRecordingUI === 'function') {
                            this.recordingHandler.resetRecordingUI();
                        }
                    } else if (tabId === 'youtube-link') {
                        // איפוס שדה הקלט של YouTube
                        const youtubeInput = document.getElementById('youtube-url');
                        const youtubeInfoBox = document.querySelector('.youtube-info');

                        if (youtubeInput) {
                            youtubeInput.value = '';

                            // ודא שלא נוספו מאזינים כפולים
                            youtubeInput.removeEventListener('_validate', youtubeInput._validateListener);

                            // מאזין חדש לבדיקה בזמן הקלדה
                            const validateInput = () => {
                                const value = youtubeInput.value.trim();
                                const isValidYoutube = value.includes('youtube.com/') || value.includes('youtu.be/');

                                if (!isValidYoutube && youtubeInfoBox) {
                                    youtubeInfoBox.innerHTML = '';
                                    youtubeInfoBox.style.display = 'none';
                                }
                            };

                            // שמירת הפונקציה על האובייקט כדי למנוע ריבוי מאזינים
                            youtubeInput._validateListener = validateInput;
                            youtubeInput.addEventListener('input', validateInput);
                        }
                    }
                    // אם עוזבים את טאב YouTube ואין קישור – איפוס תצוגה
                    if (tabId !== 'youtube-link') {
                        const youtubeInput = document.getElementById('youtube-url');
                        const youtubeInfoBox = document.querySelector('.youtube-info');
                        const url = youtubeInput?.value?.trim();
                        //   const isValidYoutube = url && (url.includes('youtube.com/') || url.includes('youtu.be/'));

                        const leftYoutubeTab = tabId !== 'youtube-link';
                        const youtubeFieldEmpty = !url;

                        if ((leftYoutubeTab || youtubeFieldEmpty) && youtubeInfoBox) {
                            youtubeInfoBox.innerHTML = '';
                            youtubeInfoBox.style.display = 'none';
                        }

                    }



                });
            });
        }

        // טיפול בתפריט נפתח להורדה
        const downloadDropdownBtn = document.getElementById('download-dropdown-btn');
        const downloadOptions = document.getElementById('download-options');
        const dropdown = document.querySelector('.dropdown');

        if (downloadDropdownBtn && downloadOptions && dropdown) {
            // פתיחה וסגירה של התפריט
            downloadDropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.toggle('open');
            });

            // סגירת התפריט בלחיצה מחוץ לאזור
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            });

            // טיפול באפשרויות ההורדה השונות
            const downloadItems = document.querySelectorAll('.dropdown-item');
            downloadItems.forEach(item => {
                item.addEventListener('click', () => {
                    const format = item.getAttribute('data-format');
                    this.downloadTranscription(format);
                    dropdown.classList.remove('open');
                });
            });
        }
    }
    getSelectedProvider() {
        const modeSelect = document.getElementById('transcription-mode');
        if (!modeSelect) return 'groq';
        const mode = modeSelect.value;
        return mode === 'hf-plus-groq' ? 'huggingface' : 'groq';
    }
    
    /**
     * העתקת תוכן התמלול
     */
    copyTranscription() {
        // מציאת הטאב הפעיל
        const activeResultTab = document.querySelector('.result-tab-btn.active');
        if (!activeResultTab) return;

        const tabType = activeResultTab.getAttribute('data-result-tab');

        // בחירת תיבת הטקסט המתאימה
        let textArea;
        switch (tabType) {
            case 'original':
                textArea = document.getElementById('transcription-result');
                break;
            case 'enhanced':
                textArea = document.getElementById('enhanced-result');
                break;
            case 'summary':
                // אם נבחר פרומפט חופשי 
                const summaryLengthSelect = document.getElementById('summary-length');
                const customPromptContainer = document.getElementById('custom-prompt-container');

                if (summaryLengthSelect.value === 'custom' &&
                    customPromptContainer.style.display !== 'none') {
                    // אם נבחר פרומפט חופשי והוא מוצג
                    textArea = document.getElementById('summary-result');
                } else {
                    // בכל מקרה אחר
                    textArea = document.getElementById('summary-result');
                }
                break;
            default:
                return;
        }

        if (!textArea) return;

        // בחירת הטקסט והעתקה
        textArea.select();
        document.execCommand('copy');

        // אנימציה להודעת העתקה
        const originalText = this.copyBtn.innerHTML;
        this.copyBtn.innerHTML = '<i class="fas fa-check"></i> הועתק!';

        setTimeout(() => {
            this.copyBtn.innerHTML = originalText;
        }, 2000);
    }
    switchTab(tabId) {
        const targetTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (targetTab) {
            // איפוס UI לפני מעבר ללשונית החדשה
            this.resetUI();
            targetTab.click(); // מפעיל את האירוע של המעבר
        }
    }

}

// ייצוא המחלקה
window.UIHandlers = UIHandlers;