/**
 * מודול לטיפול באירועים וקישור אירועים בממשק - מעודכן לOpenAI בלבד
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
    }

    /**
     * קישור אירועים לניהול API
     */
    bindAPIEvents() {
        // קישור אירועים לשמירת מפתח API של OpenAI
        if (this.saveOpenaiKeyBtn) {
            this.saveOpenaiKeyBtn.addEventListener('click', () => {
                this.saveOpenaiApiKey();
            });
        }

        // הצגת/הסתרת מפתח API של OpenAI
        if (this.showOpenaiKeyCheckbox && this.openaiApiKeyInput) {
            this.showOpenaiKeyCheckbox.addEventListener('change', () => {
                this.openaiApiKeyInput.type = this.showOpenaiKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // טיפול במודל עזרה של OpenAI
        if (this.openaiHelpIcon && this.openaiGuideModal) {
            this.openaiHelpIcon.addEventListener('click', () => {
                this.openaiGuideModal.style.display = 'block';
            });

            const closeModal = this.openaiGuideModal.querySelector('.close-modal');
            if (closeModal) {
                closeModal.addEventListener('click', () => {
                    this.openaiGuideModal.style.display = 'none';
                });
            }

            // סגירת המודאל בלחיצה מחוץ לתוכן
            window.addEventListener('click', (e) => {
                if (e.target === this.openaiGuideModal) {
                    this.openaiGuideModal.style.display = 'none';
                }
            });

            // סגירת המודאל בלחיצה על Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.openaiGuideModal.style.display === 'block') {
                    this.openaiGuideModal.style.display = 'none';
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

                            youtubeInput._validateListener = validateInput;
                            youtubeInput.addEventListener('input', validateInput);
                        }
                    }

                    // איפוס תצוגת YouTube אם עוזבים את הטאב
                    if (tabId !== 'youtube-link') {
                        const youtubeInput = document.getElementById('youtube-url');
                        const youtubeInfoBox = document.querySelector('.youtube-info');
                        const url = youtubeInput?.value?.trim();

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
    
    /**
     * העתקת תוכן התמלול
     */
    copyTranscription() {
        const textArea = document.getElementById('transcription-result');
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