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
        this.downloadBtn = document.getElementById('download-btn');
        this.newBtn = document.getElementById('new-btn');
        this.uploadContainer = document.getElementById('upload-container');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        this.apiKeyStatus = document.getElementById('api-key-status');
        this.showApiKeyCheckbox = document.getElementById('show-api-key');
        this.splitAudioCheckbox = document.getElementById('split-audio');
        this.splitSettings = document.getElementById('split-settings');
        this.segmentLengthInput = document.getElementById('segment-length');
        
        
        // מצב הממשק
        this.selectedFile = null;
        this.apiKey = localStorage.getItem('huggingface_api_key') || '';
        
        // אתחול הממשק
        this.init();
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
            this.copyBtn.textContent = 'הועתק!';
            setTimeout(() => {
                this.copyBtn.textContent = 'העתק תמלול';
            }, 2000);
        });
        
        this.downloadBtn.addEventListener('click', () => {
            this.downloadTranscription();
        });

        this.newBtn.addEventListener('click', () => {
            this.resetUI();
        });
        
        // שמירת מפתח API
        this.saveApiKeyBtn.addEventListener('click', () => {
            this.saveApiKey();
        });
        
        // הצגת/הסתרת מפתח API
        this.showApiKeyCheckbox.addEventListener('change', () => {
            this.apiKeyInput.type = this.showApiKeyCheckbox.checked ? 'text' : 'password';
        });
        
        // הצגת/הסתרת הגדרות פיצול אודיו
        this.splitAudioCheckbox.addEventListener('change', () => {
            this.splitSettings.style.display = this.splitAudioCheckbox.checked ? 'block' : 'none';
        });
        
        // הצגת הגדרות פיצול לפי ערך הצ'קבוקס הנוכחי
        this.splitSettings.style.display = this.splitAudioCheckbox.checked ? 'block' : 'none';
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
            this.fileInfo.style.display = 'block';
            this.errorMessage.style.display = 'none';
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
            this.apiKeyStatus.textContent = 'מפתח API נשמר בהצלחה!';
            this.apiKeyStatus.style.color = '#28a745';
            setTimeout(() => {
                this.apiKeyStatus.textContent = '';
            }, 3000);
        } else {
            this.apiKeyStatus.textContent = 'נא להזין מפתח API תקין';
            this.apiKeyStatus.style.color = '#dc3545';
        }
    }
    
    /**
     * הצגת הודעת שגיאה
     * @param {string} message - הודעת השגיאה
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.loadingSpinner.style.display = 'none';
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
                this.progressStatus.textContent = 'מפענח את קובץ האודיו...';
                break;
            case 'splitting':
                if (progressData.totalSegments > 1) {
                    this.progressStatus.textContent = `מפצל את האודיו לקטעים (${progressData.currentSegment || 0}/${progressData.totalSegments})...`;
                } else {
                    this.progressStatus.textContent = 'מכין את האודיו לתמלול...';
                }
                break;
            case 'transcribing':
                this.progressStatus.textContent = `מתמלל (קטע ${progressData.completedSegments}/${progressData.totalSegments})...`;
                break;
            case 'complete':
                this.progressStatus.textContent = 'הושלם!';
                break;
            case 'error':
                this.progressStatus.textContent = 'אירעה שגיאה: ' + (progressData.error || 'שגיאה לא מוכרת');
                break;
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
    }
    
    /**
     * הורדת התמלול כקובץ טקסט
     */
    downloadTranscription() {
        const text = this.transcriptionResult.value;
        if (!text) return;
        
        // יצירת קובץ למצב טקסט בלבד
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        
        // יצירת שם לקובץ
        const fileName = this.selectedFile ? 
            this.selectedFile.name.replace(/\.[^/.]+$/, '') + '_transcript.txt' :
            'transcript.txt';
        
        // יצירת קישור להורדה
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        
        // הפעלת ההורדה
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
    }
}

// ייצוא המודול
window.UI = UI;