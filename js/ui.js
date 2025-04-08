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
        //this.downloadBtn = document.getElementById('download-btn');
        this.newBtn = document.getElementById('new-btn');
        this.uploadContainer = document.getElementById('upload-container');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        this.apiKeyStatus = document.getElementById('api-key-status');
        this.showApiKeyCheckbox = document.getElementById('show-api-key');
        this.splitAudioCheckbox = document.getElementById('split-audio');
        this.splitSettings = document.getElementById('split-settings');
        this.segmentLengthInput = document.getElementById('segment-length');
        this.tipsCard = document.getElementById('tips-card');
        
        // מצב הממשק
        this.selectedFile = null;
        this.apiKey = localStorage.getItem('huggingface_api_key') || '';
        
        // אתחול הממשק
        this.init();
        this.timeEstimate = document.getElementById('time-estimate');
        this.estimatedTimeContainer = document.getElementById('estimated-time');

        this.apiHelpIcon = document.getElementById('api-help-icon');
        this.apiGuideModal = document.getElementById('api-guide-modal');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.downloadDropdownBtn = document.getElementById('download-dropdown-btn');
        this.enhanceBtn = document.getElementById('enhance-btn');


    }
    
    /**
     * אתחול הממשק וקישור אירועים
     */
    init() {
        // טעינת מפתח API מהאחסון המקומי
        if (this.apiKey) {
            this.apiKeyInput.value = this.apiKey;
            this.apiKeyStatus.textContent = 'מפתח API נטען בהצלחה מהאחסון המקומי';
            this.apiKeyStatus.style.color = '#28a745';
        }
        
        // קישור אירועים
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

        this.transcribeBtn.addEventListener('click', () => {
            // הפעלת התמלול
            this.onTranscribeClick();
        });

        this.copyBtn.addEventListener('click', () => {
            this.transcriptionResult.select();
            document.execCommand('copy');
            
            // אנימציה להודעת העתקה
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<i class="fas fa-check"></i> הועתק!';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
            }, 2000);
        });
        
        /*this.downloadBtn.addEventListener('click', () => {
            this.downloadTranscription();
        });*/

        this.newBtn.addEventListener('click', () => {
            this.resetUI();
            // חזרה לתצוגת העלאת קובץ עם אנימציה
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // שמירת מפתח API
        this.saveApiKeyBtn.addEventListener('click', () => {
            this.saveApiKey();
        });
        
        this.showApiKeyCheckbox.addEventListener('change', () => {
            this.apiKeyInput.type = this.showApiKeyCheckbox.checked ? 'text' : 'password';
            console.log("Checkbox changed:", this.showApiKeyCheckbox.checked);
        });
        
        // הצגת/הסתרת הגדרות פיצול אודיו
        // הצגת/הסתרת הגדרות פיצול אודיו - עם בדיקת קיום
        if (this.splitAudioCheckbox) {
            this.splitAudioCheckbox.addEventListener('change', () => {
                if (this.splitSettings) {
                    this.splitSettings.style.display = this.splitAudioCheckbox.checked ? 'block' : 'none';
                }
            });
        }

        // הצגת הגדרות פיצול לפי ערך הצ'קבוקס הנוכחי - עם בדיקת קיום
        if (this.splitSettings && this.splitAudioCheckbox) {
            this.splitSettings.style.display = this.splitAudioCheckbox.checked ? 'block' : 'none';
        }

        // טיפול בכפתור הגדרות מתקדמות
        const toggleAdvancedBtn = document.getElementById('toggle-advanced-settings');
        if (toggleAdvancedBtn && this.splitSettings) {
            toggleAdvancedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // החלפת מצב התצוגה של הגדרות הפיצול
                this.splitSettings.style.display = this.splitSettings.style.display === 'none' ? 'flex' : 'none';
            });
        }
        
        // טיפול בכפתור הגהה
        this.enhanceBtn = document.getElementById('enhance-btn');
        if (this.enhanceBtn) {
            this.enhanceBtn.addEventListener('click', () => {
                this.performEnhancement();
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
                // טיפול בכפתור הגדרות מתקדמות
            const toggleAdvancedBtn = document.getElementById('toggle-advanced-settings');
            const splitSettings = document.getElementById('split-settings');

            if (toggleAdvancedBtn && splitSettings) {
                toggleAdvancedBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // החלפת מצב התצוגה של הגדרות הפיצול
                    splitSettings.style.display = splitSettings.style.display === 'none' ? 'flex' : 'none';
                });
            }

            // אם הצ'קבוקס מוסתר, נוודא שהוא תמיד מסומן (פיצול אוטומטי)
            const splitAudioCheckbox = document.getElementById('split-audio');
            if (splitAudioCheckbox) {
                splitAudioCheckbox.checked = true;
            }
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

        // טיפול בכפתורי הקלטה
        const startRecordBtn = document.getElementById('start-record-btn');
        const stopRecordBtn = document.getElementById('stop-record-btn');
        const recordTimer = document.getElementById('record-timer');
        const recordWave = document.getElementById('record-wave');

        if (startRecordBtn && stopRecordBtn) {
            let recorder = null;
            let recordedChunks = [];
            let recordingTime = 0;
            let recordingInterval = null;
            
            startRecordBtn.addEventListener('click', async () => {
                try {
                    // בקשת גישה למיקרופון
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    
                    // יצירת מקליט
                    recorder = new MediaRecorder(stream);
                    recordedChunks = [];
                    
                    // טיפול בנתוני ההקלטה
                    recorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            recordedChunks.push(e.data);
                        }
                    };
                    
                    // טיפול בסיום ההקלטה
                    recorder.onstop = () => {
                        // יצירת blob מהקטעים שהוקלטו
                        const blob = new Blob(recordedChunks, { type: 'audio/mp3' });
                        
                        // יצירת קובץ
                        const recordedFile = new File([blob], `הקלטה_${new Date().toISOString()}.mp3`, { type: 'audio/mp3' });
                        
                        // טיפול בקובץ כאילו הועלה
                        this.handleFileSelect([recordedFile]);
                        
                        // עצירת סטרים המיקרופון
                        stream.getTracks().forEach(track => track.stop());
                        
                        // איפוס טיימר ההקלטה
                        clearInterval(recordingInterval);
                        recordingTime = 0;
                        recordTimer.textContent = '00:00';
                        recordWave.classList.remove('recording');
                        
                        // החלפת לשונית להעלאת קובץ
                        document.querySelector('[data-tab="upload-file"]').click();
                    };
                    
                    // התחלת ההקלטה
                    recorder.start();
                    
                    // עדכון ממשק המשתמש
                    startRecordBtn.disabled = true;
                    stopRecordBtn.disabled = false;
                    recordWave.classList.add('recording');
                    
                    // התחלת טיימר
                    recordingTime = 0;
                    recordingInterval = setInterval(() => {
                        recordingTime++;
                        const minutes = Math.floor(recordingTime / 60).toString().padStart(2, '0');
                        const seconds = (recordingTime % 60).toString().padStart(2, '0');
                        recordTimer.textContent = `${minutes}:${seconds}`;
                    }, 1000);
                } catch (error) {
                    console.error('שגיאה בהקלטה:', error);
                    alert('לא הצלחנו לגשת למיקרופון. אנא ודא שאישרת גישה למיקרופון ונסה שוב.');
                }
            });
            
            stopRecordBtn.addEventListener('click', () => {
                if (recorder && recorder.state !== 'inactive') {
                    recorder.stop();
                    startRecordBtn.disabled = false;
                    stopRecordBtn.disabled = true;
                }
            });
        }

        // טיפול בתמלול מסרטון יוטיוב
        const youtubeUrlInput = document.getElementById('youtube-url');
        const processYoutubeBtn = document.getElementById('process-youtube-btn');

        if (youtubeUrlInput && processYoutubeBtn) {
            processYoutubeBtn.addEventListener('click', () => {
                const youtubeUrl = youtubeUrlInput.value.trim();
                
                if (!youtubeUrl) {
                    alert('נא להזין קישור יוטיוב תקין');
                    return;
                }
                
                // בדיקה שהקישור הוא אכן מיוטיוב
                if (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/')) {
                    alert('נא להזין קישור יוטיוב תקין');
                    return;
                }
                
                // כאן יהיה הקוד שמעבד את סרטון היוטיוב
                // לצורך הדגמה, נציג הודעה
                alert('הפונקציונליות של תמלול מסרטוני יוטיוב תהיה זמינה בקרוב!');
                
                // בגרסה מלאה, כאן יהיה קוד שמוריד את האודיו מהסרטון ושולח אותו לתמלול
            });
        }
        // טיפול בלשוניות תוצאה
        const resultTabButtons = document.querySelectorAll('.result-tab-btn');
        const resultTabContents = document.querySelectorAll('.result-tab-content');

        if (resultTabButtons.length > 0) {
            resultTabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // הסרת מחלקת active מכל הלשוניות
                    resultTabButtons.forEach(btn => btn.classList.remove('active'));
                    resultTabContents.forEach(content => content.classList.remove('active'));
                    
                    // הוספת מחלקת active ללשונית הנבחרת
                    button.classList.add('active');
                    const tabId = button.getAttribute('data-result-tab');
                    document.getElementById(`${tabId}-content`).classList.add('active');
                    
                    // הפעלת הגהה אוטומטית אם נבחרה לשונית ההגהה
                    if (tabId === 'enhanced' && !this.enhancementPerformed) {
                        this.performEnhancement();
                        this.enhancementPerformed = true;
                    }
                    
                    // הפעלת סיכום אוטומטי אם נבחרה לשונית הסיכום
                    if (tabId === 'summary' && !this.summaryPerformed) {
                        this.performSummary();
                        this.summaryPerformed = true;
                    }
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
        }
        // בדוק את אורך הקובץ ועדכן את הזמן המשוער
    // בדוק את אורך הקובץ ועדכן את הזמן המשוער
    // בדיקה של הפונקציה המתאימה והפעלתה
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
                this.progressStatus.innerHTML = `<i class="fas fa-microphone"></i> מתמלל (קטע ${progressData.completedSegments}/${progressData.totalSegments})...`;
                break;
            case 'complete':
                this.progressStatus.innerHTML = '<i class="fas fa-check-circle"></i> הושלם!';
                break;
            case 'error':
                this.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> אירעה שגיאה: ' + (progressData.error || 'שגיאה לא מוכרת');
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
    const segmentLength = 25; // תוכל לשנות לפי מה שמוגדר באינפוט
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

    if (this.timeEstimate) {
        this.timeEstimate.textContent = estimatedTime;
    }
        if (this.estimatedTimeContainer) {
        this.estimatedTimeContainer.style.display = 'block';
    }
}

    /**
     * מתחיל תמלול כאשר לוחצים על כפתור "התחל תמלול"
     */
    onTranscribeClick() {
        // פונקציה זו תמולא בקובץ main.js
        // כאן היא ריקה כי היא תיקרא מ-main.js
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
    
        // איפוס מצב הלשוניות
        this.enhancementPerformed = false;
        this.summaryPerformed = false;
        
        // איפוס תיבות הטקסט של הלשוניות האחרות
        const enhancedResult = document.getElementById('enhanced-result');
        const summaryResult = document.getElementById('summary-result');
        
        if (enhancedResult) enhancedResult.value = '';
        if (summaryResult) summaryResult.value = '';
        
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
     * הורדת התמלול בפורמט הנבחר
     * @param {string} format - פורמט הקובץ (txt, srt, word)
     */
    downloadTranscription(format = 'txt') {
        const text = this.transcriptionResult.value;
        if (!text) return;
        
        let blob, fileName, mimeType;
        
        switch (format) {
            case 'srt':
                // המרה לפורמט SRT
                const srtContent = this.convertToSRT(text);
                blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
                mimeType = 'text/srt';
                break;
                
            case 'word':
                // יצירת HTML בסיסי לייצוא ל-Word
                const htmlContent = `
                    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                        xmlns:w="urn:schemas-microsoft-com:office:word" 
                        xmlns="http://www.w3.org/TR/REC-html40">
                    <head>
                        <meta charset="utf-8">
                        <title>תמלול</title>
                        <!--[if gte mso 9]>
                        <xml>
                            <w:WordDocument>
                                <w:View>Print</w:View>
                                <w:Zoom>90</w:Zoom>
                            </w:WordDocument>
                        </xml>
                        <![endif]-->
                        <style>
                            body { font-family: 'Arial', sans-serif; direction: rtl; }
                            p { line-height: 1.6; margin-bottom: 10px; }
                        </style>
                    </head>
                    <body>
                        <h1>תמלול</h1>
                        ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
                    </body>
                    </html>
                `;
                blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
                mimeType = 'application/msword';
                break;
                
            case 'txt':
            default:
                // ברירת מחדל - טקסט רגיל
                blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                mimeType = 'text/plain';
                break;
        }
        
        // יצירת שם לקובץ
        fileName = this.selectedFile ? 
            this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_transcript.${format}` :
            `transcript.${format}`;
        
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
     * המרת טקסט לפורמט SRT
     * @param {string} text - טקסט התמלול
     * @returns {string} - תוכן בפורמט SRT
     */
    convertToSRT(text) {
        // מחלק את הטקסט למשפטים
        const sentences = text.replace(/([.!?])\s+/g, '$1\n').split('\n').filter(s => s.trim() !== '');
        
        let srtContent = '';
        let counter = 1;
        let startTime = 0;
        
        // מניחים שכל משפט אורך 5 שניות בממוצע
        const avgSentenceTime = 5;
        
        sentences.forEach((sentence, index) => {
            const endTime = startTime + (sentence.length / 15 * avgSentenceTime);
            
            // פורמט זמן SRT: 00:00:00,000 --> 00:00:00,000
            const startTimeFormatted = this.formatSRTTime(startTime);
            const endTimeFormatted = this.formatSRTTime(endTime);
            
            srtContent += `${counter}\n${startTimeFormatted} --> ${endTimeFormatted}\n${sentence}\n\n`;
            
            counter++;
            startTime = endTime;
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
        /**
     * ביצוע הגהה חכמה על התמלול
     */
    performEnhancement() {
        // בדיקה שיש טקסט לתיקון
        const text = this.transcriptionResult.value;
        if (!text || text.trim() === '') {
            alert('אין טקסט להגהה. יש לבצע תמלול תחילה.');
            return;
        }
        
        // שינוי מצב הכפתור למצב טעינה
        const originalBtnText = this.enhanceBtn.innerHTML;
        this.enhanceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מבצע הגהה...';
        this.enhanceBtn.disabled = true;
        
        // פה אפשר לבצע קריאה לשירות הגהה חיצוני
        // לדוגמה, אפשר להשתמש ב-ChatGPT API
        
        // לצורך הדגמה, אני מדמה הגהה פשוטה עם setTimeout
        setTimeout(() => {
            // הפעלת הגהה
            const enhancedText = this.simulateEnhancement(text);
            
            // הצגת הטקסט המשופר
            this.transcriptionResult.value = enhancedText;
            
            // החזרת הכפתור למצב הרגיל
            this.enhanceBtn.innerHTML = originalBtnText;
            this.enhanceBtn.disabled = false;
            
            // הודעה למשתמש
            alert('ההגהה הושלמה בהצלחה!');
        }, 2000);
    }

    /**
     * פונקציה לדימוי הגהה (יוחלף בקריאה אמיתית ל-API)
     */
    simulateEnhancement(text) {
        // רק לצורך הדגמה - כאן תהיה הקריאה האמיתית ל-API
        
        // מתקן שגיאות פשוטות לדוגמה
        let enhancedText = text;
        
        // תיקון רווחים מיותרים
        enhancedText = enhancedText.replace(/\s+/g, ' ');
        
        // תיקון סימני פיסוק
        enhancedText = enhancedText.replace(/ ,/g, ',');
        enhancedText = enhancedText.replace(/ \./g, '.');
        
        // הוספת פיסוק בסוף משפטים
        enhancedText = enhancedText.replace(/([א-ת])\s+([א-ת])/g, function(match, p1, p2) {
            if (p1.match(/[אבגדהוזחטיכלמנסעפצקרשת]/) && p2.match(/[אבגדהוזחטיכלמנסעפצקרשת]/i)) {
                return p1 + '. ' + p2;
            }
            return match;
        });
        
        // לסימולציה בלבד - שיפור כללי של הטקסט
        enhancedText += "\n\n[הטקסט עבר הגהה והתאמה על ידי AI]";
        
        return enhancedText;
    }

    /**
     * ביצוע סיכום של התמלול
     */
    performSummary() {
        // בדיקה שיש טקסט לסיכום
        const text = this.transcriptionResult.value;
        const summaryResult = document.getElementById('summary-result');
        
        if (!text || !summaryResult || text.trim() === '') {
            if (summaryResult) summaryResult.value = 'אין טקסט לסיכום. יש לבצע תמלול תחילה.';
            return;
        }
        
        // שינוי מצב הלשונית למצב טעינה
        const summaryTabBtn = document.querySelector('[data-result-tab="summary"]');
        const originalBtnText = summaryTabBtn.innerHTML;
        summaryTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מסכם...';
        
        // פה אפשר לבצע קריאה לשירות סיכום חיצוני
        // לדוגמה, אפשר להשתמש ב-ChatGPT API
        
        // לצורך הדגמה, אני מדמה סיכום פשוט עם setTimeout
        setTimeout(() => {
            // הפעלת סיכום
            const summaryText = this.simulateSummary(text);
            
            // הצגת הטקסט המסוכם
            summaryResult.value = summaryText;
            
            // החזרת הלשונית למצב הרגיל
            summaryTabBtn.innerHTML = originalBtnText;
        }, 2000);
    }

    /**
     * פונקציה לדימוי סיכום (יוחלף בקריאה אמיתית ל-API)
     */
    simulateSummary(text) {
        // רק לצורך הדגמה - כאן תהיה הקריאה האמיתית ל-API
        
        // יצירת סיכום פשוט
        const sentences = text.split(/[.!?]\s+/);
        const shortSummary = sentences.slice(0, 3).join('. ') + '.';
        
        return `סיכום תמלול:
    -------------------
    ${shortSummary}

    [סיכום זה נוצר באופן אוטומטי ע"י AI]`;
    }
}

// ייצוא המודול
window.UI = UI;