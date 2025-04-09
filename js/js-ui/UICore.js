/**
 * מודול ליבה של ממשק המשתמש
 * מכיל את המחלקה הבסיסית והקונסטרקטור
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

        // אלמנטים API Huggingface
        this.huggingfaceApiKeyInput = document.getElementById('huggingface-api-key');
        this.saveHuggingfaceKeyBtn = document.getElementById('save-huggingface-key');
        this.huggingfaceKeyStatus = document.getElementById('huggingface-key-status');
        this.showHuggingfaceKeyCheckbox = document.getElementById('show-huggingface-key');
        this.huggingfaceHelpIcon = document.getElementById('huggingface-help-icon');

        // אלמנטים Groq
        this.groqApiKeyInput = document.getElementById('groq-api-key');
        this.saveGroqKeyBtn = document.getElementById('save-groq-key');
        this.groqKeyStatus = document.getElementById('groq-key-status');
        this.showGroqKeyCheckbox = document.getElementById('show-groq-key');
        this.groqHelpIcon = document.getElementById('groq-help-icon');
        this.groqGuideModal = document.getElementById('groq-guide-modal');

        // טעינת מפתחות API
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

        // אתחול מודול שיפורים אם הוא זמין
        if (window.EnhancementHandler) {
            this.enhancementHandler = new EnhancementHandler(this);
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

// ייצוא המחלקה
window.UICore = UICore;