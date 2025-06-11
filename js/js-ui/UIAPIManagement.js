/**
 * מודול לטיפול בניהול מפתחות API - מעודכן לOpenAI בלבד
 */
class UIAPIManagement extends UIFileOperations {
    /**
     * אתחול הגדרות API
     */
    initAPISettings() {
        // OpenAI
        if (this.openaiApiKey) {
            if (this.openaiApiKeyInput) {
                this.openaiApiKeyInput.value = this.openaiApiKey;
            }            
            if (this.openaiKeyStatus) {
                this.openaiKeyStatus.textContent = 'מפתח API של OpenAI נטען בהצלחה';
                this.openaiKeyStatus.style.color = '#28a745';
            }
        }

        this.apiKey = this.openaiApiKey;
    
        // קישור אירועים לניהול API
        this.bindAPIEvents();
    }

    /**
     * שמירת מפתח API של OpenAI
     */
    saveOpenaiApiKey() {
        const newApiKey = this.openaiApiKeyInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('openai_api_key', newApiKey);
            this.openaiApiKey = newApiKey;
            this.apiKey = newApiKey;

            // הצגת אישור הצלחה עם אנימציה
            this.openaiKeyStatus.textContent = 'מפתח API של OpenAI נשמר בהצלחה!';
            this.openaiKeyStatus.style.color = '#28a745';
            this.openaiKeyStatus.style.animation = 'fadeIn 0.3s';

            setTimeout(() => {
                this.openaiKeyStatus.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    this.openaiKeyStatus.textContent = '';
                    this.openaiKeyStatus.style.animation = '';
                }, 500);
            }, 3000);
        } else {
            this.openaiKeyStatus.textContent = 'נא להזין מפתח API תקין';
            this.openaiKeyStatus.style.color = '#dc3545';
            this.openaiKeyStatus.style.animation = 'shake 0.5s';

            setTimeout(() => {
                this.openaiKeyStatus.style.animation = '';
            }, 500);
        }
    }
}

// ייצוא המחלקה
window.UIAPIManagement = UIAPIManagement;