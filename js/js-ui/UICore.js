/**
 * מודול ליבה של ממשק המשתמש - מעודכן לOpenAI בלבד
 */
class UICore {
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
        this.tipsCard = document.getElementById('tips-card');
        this.timeEstimate = document.getElementById('time-estimate');
        this.estimatedTimeContainer = document.getElementById('estimated-time-container');
        this.downloadDropdownBtn = document.getElementById('download-dropdown-btn');

        // אלמנטים OpenAI
        this.openaiApiKeyInput = document.getElementById('openai-api-key');
        this.saveOpenaiKeyBtn = document.getElementById('save-openai-key');
        this.openaiKeyStatus = document.getElementById('openai-key-status');
        this.showOpenaiKeyCheckbox = document.getElementById('show-openai-key');
        this.openaiHelpIcon = document.getElementById('openai-help-icon');
        this.openaiGuideModal = document.getElementById('openai-guide-modal');

        // טעינת מפתח API של OpenAI
        this.openaiApiKey = localStorage.getItem('openai_api_key') || '';
        if (this.openaiApiKeyInput) {
            this.openaiApiKeyInput.value = this.openaiApiKey;
        }
        this.apiKey = this.openaiApiKey;

        // מצב הממשק
        this.selectedFile = null;

        // יצירת מופעים של מנהלי המודולים השונים
        this.recordingHandler = null;
        this.youtubeHandler = null;

        this.isTranscriptionInProgress = false;
        this.transcriptionState = {
            status: null,
            progress: 0,
            completedSegments: 0,
            totalSegments: 0
        };
    }

    /**
     * אתחול הממשק וקישור אירועים
     */
    init() {
        // טעינת מפתחות API והגדרות
        this.initAPISettings();

        // קישור אירועים להעלאת קבצים
        this.bindFileEvents();

        // קישור אירועים לכפתורים
        this.bindButtonEvents();

        // טיפול בלשוניות ותפריטים נפתחים
        this.bindTabsAndDropdowns();

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
     * איפוס הממשק
     */
    resetUI() {
        // איפוס הממשק
        if (this.fileInput) this.fileInput.value = '';
        if (this.fileInfo) this.fileInfo.style.display = 'none';
        if (this.progressContainer) this.progressContainer.style.display = 'none';
        if (this.loadingSpinner) this.loadingSpinner.style.display = 'none';
        if (this.resultContainer) this.resultContainer.style.display = 'none';
        if (this.errorMessage) this.errorMessage.style.display = 'none';

        // איפוס כפתורים וסרגל התקדמות
        if (this.transcribeBtn) this.transcribeBtn.disabled = false;
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.style.boxShadow = '';
        }
        if (this.progressText) this.progressText.textContent = '0%';

        // וידוא שאזור ההעלאה מוצג
        if (this.uploadArea) {
            console.log('מציג את uploadArea');
            this.uploadArea.style.display = 'flex';
        } else {
            console.error('אלמנט uploadArea לא נמצא');
        }

        if (this.uploadContainer) {
            this.uploadContainer.style.display = 'block';
        }

        // הסתרת כרטיס הטיפים
        if (this.tipsCard) {
            this.tipsCard.style.display = 'none';
        }
        if (this.estimatedTimeContainer) {
            this.estimatedTimeContainer.style.display = 'none';
        }

        // איפוס selectedFile
        this.selectedFile = null;
    }
}

// ייצוא המחלקה
window.UICore = UICore;