/**
 * מודול לטיפול בממשק המשתמש
 */
class UI {
    constructor() {
        // אלמנטים של הממשק
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.uploadArea = document.getElementById('upload-area');
        this.fileInfo = document.getElementById('file-info');
        this.fileName = document.getElementById('file-name');
        this.fileSize = document.getElementById('file-size');
        this.transcribeBtn = document.getElementById('transcribe-btn');
        this.progressContainer = document.getElementById('progress-container');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.progressStatus = document.getElementById('progress-status');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.errorMessage = document.getElementById('error-message');
        this.resultContainer = document.getElementById('result-container');
        this.transcriptionResult = document.getElementById('transcription-result');
        this.copyBtn = document.getElementById('copy-btn');
        this.newBtn = document.getElementById('new-btn');
        this.uploadContainer = document.getElementById('upload-container');
        this.showApiKeyCheckbox = document.getElementById('show-api-key');
        this.splitAudioCheckbox = document.getElementById('split-audio');
        this.splitSettings = document.getElementById('split-settings');
        this.segmentLengthInput = document.getElementById('segment-length');
        this.tipsCard = document.getElementById('tips-card');
        this.timeEstimate = document.getElementById('time-estimate');
        this.estimatedTimeContainer = document.getElementById('estimated-time');
        this.apiHelpIcon = document.getElementById('api-help-icon');
        this.apiGuideModal = document.getElementById('api-guide-modal');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.downloadDropdownBtn = document.getElementById('download-dropdown-btn');

        this.huggingfaceApiKeyInput = document.getElementById('huggingface-api-key');
        this.saveHuggingfaceKeyBtn = document.getElementById('save-huggingface-key');
        this.huggingfaceKeyStatus = document.getElementById('huggingface-key-status');
        this.showHuggingfaceKeyCheckbox = document.getElementById('show-huggingface-key');
        this.huggingfaceHelpIcon = document.getElementById('huggingface-help-icon');

        // אלמנטים חדשים עבור Groq
        this.groqApiKeyInput = document.getElementById('groq-api-key');
        this.saveGroqKeyBtn = document.getElementById('save-groq-key');
        this.groqKeyStatus = document.getElementById('groq-key-status');
        this.showGroqKeyCheckbox = document.getElementById('show-groq-key');
        this.groqHelpIcon = document.getElementById('groq-help-icon');
        this.groqGuideModal = document.getElementById('groq-guide-modal');

        this.huggingfaceApiKey = localStorage.getItem('huggingface_api_key') || '';
        if (this.huggingfaceApiKeyInput) {
            this.huggingfaceApiKeyInput.value = this.huggingfaceApiKey;
        }
        this.groqApiKey = localStorage.getItem('groq_api_key') || '';
        if (this.groqApiKeyInput) {
            this.groqApiKeyInput.value = this.groqApiKey;
        }
        // מצב הממשק
        this.selectedFile = null;

        // יצירת מופעים של מנהלי המודולים השונים
        this.recordingHandler = null;
        this.youtubeHandler = null;
        this.enhancementHandler = null;

        // אתחול הממשק
        this.init();
    }

    /**
     * אתחול הממשק וקישור אירועים
     */
    init() {

        if (this.huggingfaceApiKey) {
            if (this.huggingfaceApiKeyInput) {
                this.huggingfaceApiKeyInput.value = this.huggingfaceApiKey;
            }            
            this.huggingfaceKeyStatus.textContent = 'מפתח API של Huggingface נטען בהצלחה';
            this.huggingfaceKeyStatus.style.color = '#28a745';
        }
        this.apiKey = this.huggingfaceApiKey;

        if (this.groqApiKey) {
            if (this.groqApiKeyInput) {
                this.groqApiKeyInput.value = this.groqApiKey;
            }
            
            this.groqKeyStatus.textContent = 'מפתח API של Groq נטען בהצלחה';
            this.groqKeyStatus.style.color = '#28a745';
        }


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
        if (this.showHuggingfaceKeyCheckbox) {
            this.showHuggingfaceKeyCheckbox.addEventListener('change', () => {
                this.huggingfaceApiKeyInput.type = this.showHuggingfaceKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // הצגת/הסתרת מפתח API של Groq
        if (this.showGroqKeyCheckbox) {
            this.showGroqKeyCheckbox.addEventListener('change', () => {
                this.groqApiKeyInput.type = this.showGroqKeyCheckbox.checked ? 'text' : 'password';
            });
        }
        // טעינת מפתח API מהאחסון המקומי

        // קישור אירועים להעלאת קבצים
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

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

        // כפתור תמלול
        this.transcribeBtn.addEventListener('click', () => {
            this.onTranscribeClick();
        });

        if (this.transcription) {
            this.transcription.HUGGINGFACE_API_KEY = this.huggingfaceApiKey;
          }
          

        // כפתור העתקה
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
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
            });
        }        // כפתור תמלול חדש
        this.newBtn.addEventListener('click', () => {
            this.resetUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // הגדרות פיצול אודיו
        if (this.splitAudioCheckbox) {
            this.splitAudioCheckbox.addEventListener('change', () => {
                if (this.splitSettings) {
                    this.splitSettings.style.display = this.splitAudioCheckbox.checked ? 'block' : 'none';
                }
            });
        }
        const generateSummaryBtn = document.getElementById('generate-summary-btn');
        if (generateSummaryBtn) {
            generateSummaryBtn.addEventListener('click', () => {
                this.performSummary();
            });
        }


        // טיפול באירועים של מדריך ה-API
        if (this.apiHelpIcon && this.apiGuideModal) {
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

        // טיפול בלשוניות
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        if (tabButtons.length > 0) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // הסרת מחלקת active מכל הלשוניות
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    // הוספת מחלקת active ללשונית הנבחרת
                    button.classList.add('active');
                    const tabId = button.getAttribute('data-tab');
                    document.getElementById(`${tabId}-content`).classList.add('active');
                });
            });
        }

        // טיפול בתפריט נפתח להורדה
        const downloadDropdownBtn = document.getElementById('download-dropdown-btn');
        const downloadOptions = document.getElementById('download-options');
        const dropdown = document.querySelector('.dropdown');

        if (downloadDropdownBtn && downloadOptions) {
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


        // אתחול מופעי מנהלי המודולים השונים
        this.initModules();
    }

    /**
     * אתחול מופעי המודולים השונים
     */
    initModules() {
        // אתחול מודול הקלטה אם הוא זמין
        if (window.RecordingHandler) {
            this.recordingHandler = new RecordingHandler(this);
        }

        // אתחול מודול YouTube אם הוא זמין
        if (window.YouTubeHandler) {
            this.youtubeHandler = new YouTubeHandler(this);
        }

        // אתחול מודול שיפורים אם הוא זמין
        if (window.EnhancementHandler) {
            this.enhancementHandler = new EnhancementHandler(this);
        }
    }

    /**
     * טיפול בבחירת קובץ
     * @param {FileList} files - רשימת הקבצים שנבחרו
     */
    handleFileSelect(files) {
        if (files.length > 0) {
            this.selectedFile = files[0];

            // בדיקה אם הקובץ הוא mp3
            if (!this.selectedFile.type.includes('mp3') &&
                !this.selectedFile.name.toLowerCase().endsWith('.mp3')) {
                this.showError('נא להעלות קובץ MP3 בלבד. פורמטים אחרים אינם נתמכים כרגע.');
                return;
            }

            this.fileName.textContent = this.selectedFile.name;
            this.fileSize.textContent = `גודל: ${this.formatFileSize(this.selectedFile.size)}`;

            // הצגת אזור מידע הקובץ עם אנימציה
            this.fileInfo.style.display = 'block';

            // גלילה עדינה למטה כדי להראות את האפשרויות
            setTimeout(() => {
                this.fileInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.transcribeBtn.focus();
            }, 300);

            this.errorMessage.style.display = 'none';

            // הצג טיפים רלוונטיים
            if (this.tipsCard) {
                this.tipsCard.style.display = 'block';
            }

            // בדיקת אורך הקובץ ועדכון הזמן המשוער
            this.checkFileDurationAndUpdateEstimate();
        }
    }

    /**
     * בדיקת משך הקובץ ועדכון הזמן המשוער
     */
    checkFileDurationAndUpdateEstimate() {
        if (typeof getAudioDuration === 'function') {
            // השתמש בפונקציה הגלובלית
            getAudioDuration(this.selectedFile).then(duration => {
                this.updateEstimatedTime(duration);
            }).catch(error => {
                console.error('שגיאה בקריאת אורך הקובץ:', error);
                this.updateEstimatedTime(60); // הערכה ברירת מחדל של דקה
            });
        } else if (typeof AudioSplitter !== 'undefined' && typeof AudioSplitter.getAudioDuration === 'function') {
            // השתמש בפונקציה מתוך מחלקת AudioSplitter
            AudioSplitter.getAudioDuration(this.selectedFile).then(duration => {
                this.updateEstimatedTime(duration);
            }).catch(error => {
                console.error('שגיאה בקריאת אורך הקובץ:', error);
                this.updateEstimatedTime(60);
            });
        } else {
            // אם הפונקציה לא קיימת, השתמש בהערכה ברירת מחדל
            console.error('פונקציית getAudioDuration לא נמצאה');
            this.updateEstimatedTime(60);
        }
    }

    /**
     * פורמט של גודל קובץ
     * @param {number} bytes - גודל בבייטים
     * @returns {string} - גודל מפורמט (B/KB/MB)
     */
    formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
    }

    /**
     * שמירת מפתח API
     */
    saveApiKey() {
        const newApiKey = this.apiKeyInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('huggingface_api_key', newApiKey);
            this.apiKey = newApiKey;

            // הצגת אישור הצלחה עם אנימציה
            this.apiKeyStatus.textContent = 'מפתח API נשמר בהצלחה!';
            this.apiKeyStatus.style.color = '#28a745';
            this.apiKeyStatus.style.animation = 'fadeIn 0.3s';

            setTimeout(() => {
                this.apiKeyStatus.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    this.apiKeyStatus.textContent = '';
                    this.apiKeyStatus.style.animation = '';
                }, 500);
            }, 3000);
        } else {
            this.apiKeyStatus.textContent = 'נא להזין מפתח API תקין';
            this.apiKeyStatus.style.color = '#dc3545';
            this.apiKeyStatus.style.animation = 'shake 0.5s';

            setTimeout(() => {
                this.apiKeyStatus.style.animation = '';
            }, 500);
        }
    }
    /**
     * שמירת מפתח API של Huggingface
     */
    saveHuggingfaceApiKey() {
        const newApiKey = this.huggingfaceApiKeyInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('huggingface_api_key', newApiKey);
            this.huggingfaceApiKey = newApiKey;

            // עדכון המפתח בשאר המערכת
            this.apiKey = newApiKey; // לשמור תאימות עם הקוד הקיים

            // הצגת אישור הצלחה עם אנימציה
            this.huggingfaceKeyStatus.textContent = 'מפתח API של Huggingface נשמר בהצלחה!';
            this.huggingfaceKeyStatus.style.color = '#28a745';
            this.huggingfaceKeyStatus.style.animation = 'fadeIn 0.3s';

            setTimeout(() => {
                this.huggingfaceKeyStatus.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    this.huggingfaceKeyStatus.textContent = '';
                    this.huggingfaceKeyStatus.style.animation = '';
                }, 500);
            }, 3000);
        } else {
            this.huggingfaceKeyStatus.textContent = 'נא להזין מפתח API תקין';
            this.huggingfaceKeyStatus.style.color = '#dc3545';
            this.huggingfaceKeyStatus.style.animation = 'shake 0.5s';

            setTimeout(() => {
                this.huggingfaceKeyStatus.style.animation = '';
            }, 500);
        }
    }

    /**
     * שמירת מפתח API של Groq
     */
    saveGroqApiKey() {
        const newApiKey = this.groqApiKeyInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('groq_api_key', newApiKey);
            this.groqApiKey = newApiKey;

            // הצגת אישור הצלחה עם אנימציה
            this.groqKeyStatus.textContent = 'מפתח API של Groq נשמר בהצלחה!';
            this.groqKeyStatus.style.color = '#28a745';
            this.groqKeyStatus.style.animation = 'fadeIn 0.3s';

            // עדכון המפתח גם במודול EnhancementHandler אם הוא קיים
            if (this.enhancementHandler) {
                this.enhancementHandler.GROQ_API_KEY = newApiKey;
            }

            setTimeout(() => {
                this.groqKeyStatus.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    this.groqKeyStatus.textContent = '';
                    this.groqKeyStatus.style.animation = '';
                }, 500);
            }, 3000);
        } else {
            this.groqKeyStatus.textContent = 'נא להזין מפתח API תקין';
            this.groqKeyStatus.style.color = '#dc3545';
            this.groqKeyStatus.style.animation = 'shake 0.5s';

            setTimeout(() => {
                this.groqKeyStatus.style.animation = '';
            }, 500);
        }
    }
    /**
     * הצגת הודעת שגיאה
     * @param {string} message - הודעת השגיאה
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.errorMessage.style.animation = 'shake 0.5s';

        setTimeout(() => {
            this.errorMessage.style.animation = '';
        }, 500);

        this.loadingSpinner.style.display = 'none';

        // גלילה אל הודעת השגיאה
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * עדכון פס ההתקדמות
     * @param {Object} progressData - נתוני ההתקדמות
     */
    updateProgress(progressData) {
        this.progressBar.style.width = progressData.progress + '%';
        this.progressText.textContent = Math.round(progressData.progress) + '%';

        // עדכון הודעת הסטטוס
        switch (progressData.status) {
            case 'decoding':
                this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> מפענח את קובץ האודיו...';
                break;
            case 'splitting':
                if (progressData.totalSegments > 1) {
                    this.progressStatus.innerHTML = `<i class="fas fa-cut"></i> מפצל את האודיו לקטעים (${progressData.currentSegment || 0}/${progressData.totalSegments})...`;
                } else {
                    this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> מכין את האודיו לתמלול...';
                }
                break;
            case 'transcribing':
                this.progressStatus.innerHTML = `<i class="fas fa-microphone"></i> מתמלל (קטע ${progressData.completedSegments || 1}/${progressData.totalSegments || 1})...`;
                break;
            case 'complete':
                this.progressStatus.innerHTML = '<i class="fas fa-check-circle"></i> הושלם!';
                break;
            case 'error':
                this.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> אירעה שגיאה: ' + (progressData.error || 'שגיאה לא מוכרת');
                break;
            case 'processing':
                this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> ' + (progressData.message || 'מעבד...');
                break;
        }

        // אם התקדמות מלאה, הצג אפקט של סיום
        if (progressData.progress >= 100) {
            this.progressBar.style.transition = 'all 0.3s';
            this.progressBar.style.boxShadow = '0 0 15px rgba(55, 178, 77, 0.7)';
        }
    }

    /**
     * מעדכן את הזמן המשוער לתמלול
     * @param {number} durationInSeconds - אורך הקובץ בשניות
     */
    updateEstimatedTime(durationInSeconds) {
        if (!this.timeEstimate) return;

        // נחשב לפי פיצול לקטעים של 25 שניות
        const segmentLength = 25;
        const secondsPerSegment = 5; // כמה שניות יקח לתמלל כל קטע

        const numSegments = Math.ceil(durationInSeconds / segmentLength);
        const estimatedSeconds = numSegments * secondsPerSegment;

        // הפוך לשעות:דקות:שניות – או פשוט טקסט נוח
        let estimatedTime;
        if (estimatedSeconds < 60) {
            estimatedTime = `${estimatedSeconds} שניות`;
        } else {
            const minutes = Math.floor(estimatedSeconds / 60);
            const seconds = estimatedSeconds % 60;
            estimatedTime = `${minutes} דקות ${seconds} שניות`;
        }

        this.timeEstimate.textContent = estimatedTime;

        if (this.estimatedTimeContainer) {
            this.estimatedTimeContainer.style.display = 'block';
        }
    }

    /**
     * מתחיל תמלול כאשר לוחצים על כפתור "התחל תמלול"
     * פונקציה זו תמולא בקובץ main.js
     */
    onTranscribeClick() {
        // פונקציה זו תמולא בקובץ main.js
    }

    /**
     * מציג את תוצאות התמלול
     * @param {string} transcription - טקסט התמלול
     */
    showResults(transcription) {
        // מסתיר את אזור ההעלאה ומציג את התוצאות
        this.uploadContainer.style.display = 'none';
        this.resultContainer.style.display = 'block';
        this.loadingSpinner.style.display = 'none';
        this.progressContainer.style.display = 'none';

        // מציג את התמלול
        this.transcriptionResult.value = transcription || "לא התקבל תמלול. נא לנסות שוב.";

        // איפוס מצב לשוניות השיפור אם המודול קיים
        if (this.enhancementHandler) {
            this.enhancementHandler.resetState();
        }

        // החזרת הלשונית הראשונה למצב פעיל
        const resultTabButtons = document.querySelectorAll('.result-tab-btn');
        const resultTabContents = document.querySelectorAll('.result-tab-content');

        resultTabButtons.forEach(btn => btn.classList.remove('active'));
        resultTabContents.forEach(content => content.classList.remove('active'));

        const originalTabBtn = document.querySelector('[data-result-tab="original"]');
        if (originalTabBtn) originalTabBtn.classList.add('active');

        const originalContent = document.getElementById('original-content');
        if (originalContent) originalContent.classList.add('active');

        // גלילה אל התוצאות
        this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // הסתרת כרטיס הטיפים
        if (this.tipsCard) {
            this.tipsCard.style.display = 'none';
        }

        // הצגת התוצאות עם אפקט כניסה
        this.resultContainer.style.animation = 'fadeIn 0.5s';
    }
    /**
     * המרת טקסט לפורמט SRT
     * @param {string} text - הטקסט להמרה
     * @returns {string} - טקסט בפורמט SRT
     */
    convertToSRT(text) {
        // פיצול הטקסט לשורות
        const lines = text.split('\n');
        let srtContent = '';

        // כל שורה תהיה תת-כתובת נפרדת
        lines.forEach((line, index) => {
            if (line.trim()) {
                const startTime = index * 5; // 5 שניות לכל שורה
                const endTime = (index + 1) * 5;

                srtContent += `${index + 1}\n`;
                srtContent += `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n`;
                srtContent += `${line}\n\n`;
            }
        });

        return srtContent;
    }

    /**
     * פורמט זמן לפורמט SRT
     * @param {number} seconds - זמן בשניות
     * @returns {string} - זמן בפורמט SRT
     */
    formatSRTTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);

        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');
        const ms = date.getUTCMilliseconds().toString().padStart(3, '0');

        return `${hours}:${minutes}:${secs},${ms}`;
    }
    /**
        * הורדת התמלול בפורמט הנבחר
        * @param {string} format - פורמט הקובץ (txt, srt, word)
        */
    downloadTranscription(format = 'txt') {
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
                textArea = document.getElementById('summary-result');
                break;
            default:
                return;
        }

        if (!textArea) return;

        const text = textArea.value.trim();
        if (!text) return;

        let blob, fileName;

        // שמות התאמה לסוגי הטאבים
        const tabNames = {
            'original': 'תמלול_מקורי',
            'enhanced': 'הגהה_חכמה',
            'summary': 'סיכום_AI'
        };

        const tabSuffix = tabNames[tabType] || 'תמלול';

        switch (format) {
            case 'srt':
                const srtContent = this.convertToSRT(text);
                blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
                break;

            case 'word':
                const htmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:w="urn:schemas-microsoft-com:office:word" 
                xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <title>${tabSuffix}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; direction: rtl; }
                    p { line-height: 1.6; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <h1>${tabSuffix}</h1>
                ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
            </body>
            </html>
            `;
                blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
                break;

            case 'txt':
            default:
                blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                break;
        }

        // יצירת שם קובץ
        fileName = this.selectedFile ?
            this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_${tabSuffix}.${format}` :
            `${tabSuffix}.${format}`;

        // יצירת קישור להורדה
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;

        // הפעלת ההורדה
        document.body.appendChild(link);
        link.click();

        // הצגת אישור הורדה
        const originalText = this.downloadDropdownBtn.innerHTML;
        this.downloadDropdownBtn.innerHTML = '<i class="fas fa-check"></i> הקובץ הורד!';

        setTimeout(() => {
            this.downloadDropdownBtn.innerHTML = originalText;
            document.body.removeChild(link);
        }, 2000);
    }

    /**
     * איפוס הממשק
     */
    resetUI() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.fileInfo.style.display = 'none';
        this.progressContainer.style.display = 'none';
        this.loadingSpinner.style.display = 'none';
        this.resultContainer.style.display = 'none';
        this.uploadContainer.style.display = 'block';
        this.errorMessage.style.display = 'none';
        this.transcribeBtn.disabled = false;
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '0%';
        this.progressBar.style.boxShadow = '';

        // הסתרת כרטיס הטיפים
        if (this.tipsCard) {
            this.tipsCard.style.display = 'none';
        }
        if (this.estimatedTimeContainer) {
            this.estimatedTimeContainer.style.display = 'none';
        }
    }
}
// שיטת דיבוג לבדיקת localStorage
function debugLocalStorage() {
    console.group('Local Storage Debug');
    
    // בדיקת מפתחות Huggingface
    const huggingfaceKey = localStorage.getItem('huggingface_api_key');
    console.log('Huggingface API Key:', huggingfaceKey ? 'Exists' : 'Not Found');
    
    // בדיקת מפתחות Groq
    const groqKey = localStorage.getItem('groq_api_key');
    console.log('Groq API Key:', groqKey ? 'Exists' : 'Not Found');
    
    // הדפסת כל המפתחות ב-localStorage
    console.log('All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`${key}: ${localStorage.getItem(key)}`);
    }
    
    console.groupEnd();
}

// הוספת פונקציית דיבוג לאירועים
document.addEventListener('DOMContentLoaded', () => {
    // הדפסת מפתחות localStorage בעת טעינת הדף
    debugLocalStorage();
    
    // הוספת לחצן דיבוג
    const debugButton = document.createElement('button');
    debugButton.textContent = 'Debug API Keys';
    debugButton.style.position = 'fixed';
    debugButton.style.bottom = '10px';
    debugButton.style.left = '10px';
    debugButton.style.zIndex = '1000';
    debugButton.addEventListener('click', debugLocalStorage);
    document.body.appendChild(debugButton);
    
    // שיפור הטיפול בשמירת המפתחות
    const huggingfaceInput = document.getElementById('huggingface-api-key');
    const groqInput = document.getElementById('groq-api-key');
    const saveHuggingfaceKeyBtn = document.getElementById('save-huggingface-key');
    const saveGroqKeyBtn = document.getElementById('save-groq-key');
    
    if (saveHuggingfaceKeyBtn) {
        saveHuggingfaceKeyBtn.addEventListener('click', () => {
            if (huggingfaceInput) {
                const apiKey = huggingfaceInput.value.trim();
                console.log('Saving Huggingface API Key', apiKey);
                localStorage.setItem('huggingface_api_key', apiKey);
                debugLocalStorage(); // הדפסת המצב לאחר השמירה
            }
        });
    }
    
    if (saveGroqKeyBtn) {
        saveGroqKeyBtn.addEventListener('click', () => {
            if (groqInput) {
                const apiKey = groqInput.value.trim();
                console.log('Saving Groq API Key', apiKey);
                localStorage.setItem('groq_api_key', apiKey);
                debugLocalStorage(); // הדפסת המצב לאחר השמירה
            }
        });
    }
});
// ייצוא המחלקה
window.UI = UI;