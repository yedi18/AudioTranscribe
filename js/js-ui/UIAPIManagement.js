/**
 * מודול לטיפול בניהול מפתחות API
 * מרחיב את מחלקת UIFileOperations
 */
class UIAPIManagement extends UIFileOperations {
    /**
     * אתחול הגדרות API
     */
    initAPISettings() {
        // Huggingface
        if (this.huggingfaceApiKey) {
            if (this.huggingfaceApiKeyInput) {
                this.huggingfaceApiKeyInput.value = this.huggingfaceApiKey;
            }            
            if (this.huggingfaceKeyStatus) {
                this.huggingfaceKeyStatus.textContent = 'מפתח API של Huggingface נטען בהצלחה';
                this.huggingfaceKeyStatus.style.color = '#28a745';
            }
        }
        this.apiKey = this.huggingfaceApiKey;

        // Groq
        if (this.groqApiKey) {
            if (this.groqApiKeyInput) {
                this.groqApiKeyInput.value = this.groqApiKey;
            }
            
            if (this.groqKeyStatus) {
                this.groqKeyStatus.textContent = 'מפתח API של Groq נטען בהצלחה';
                this.groqKeyStatus.style.color = '#28a745';
            }
        }

        // קישור אירועים לניהול API
        this.bindAPIEvents();
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
     * שמירת מפתח API (Legacy)
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
}

// ייצוא המחלקה
window.UIAPIManagement = UIAPIManagement;