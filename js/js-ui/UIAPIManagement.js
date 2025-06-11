/**
 * מודול לטיפול בניהול מפתחות API - עם תמיכה בכל ספקי ה-AI
 */
class UIAPIManagement extends UIFileOperations {
    /**
     * אתחול הגדרות API
     */
    initAPISettings() {
        // טעינת מפתחות API
        this.loadApiKeys();
        
        // קישור אירועים לניהול API
        this.bindAPIEvents();
        
        // עדכון סטטוס מפתחות
        this.updateApiKeyStatuses();
    }

    /**
     * טעינת מפתחות API מ-localStorage
     */
    loadApiKeys() {
        // OpenAI
        this.openaiApiKey = localStorage.getItem('openai_api_key') || '';
        if (this.openaiApiKeyInput) {
            this.openaiApiKeyInput.value = this.openaiApiKey;
        }
        this.apiKey = this.openaiApiKey; // לתמלול

        // Groq
        this.groqApiKey = localStorage.getItem('groq_api_key') || '';
        const groqInput = document.getElementById('groq-api-key');
        if (groqInput) {
            groqInput.value = this.groqApiKey;
        }

        // Anthropic
        this.anthropicApiKey = localStorage.getItem('anthropic_api_key') || '';
        const anthropicInput = document.getElementById('anthropic-api-key');
        if (anthropicInput) {
            anthropicInput.value = this.anthropicApiKey;
        }
    }

    /**
     * עדכון סטטוס מפתחות API
     */
    updateApiKeyStatuses() {
        // OpenAI
        if (this.openaiApiKey && this.openaiKeyStatus) {
            this.openaiKeyStatus.textContent = 'מפתח API של OpenAI נטען בהצלחה';
            this.openaiKeyStatus.style.color = '#28a745';
        }

        // Groq
        const groqStatus = document.getElementById('groq-key-status');
        if (this.groqApiKey && groqStatus) {
            groqStatus.textContent = 'מפתח API של Groq נטען בהצלחה';
            groqStatus.style.color = '#28a745';
        }

        // Anthropic
        const anthropicStatus = document.getElementById('anthropic-key-status');
        if (this.anthropicApiKey && anthropicStatus) {
            anthropicStatus.textContent = 'מפתח API של Anthropic נטען בהצלחה';
            anthropicStatus.style.color = '#28a745';
        }
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

            this.showApiKeySuccess(this.openaiKeyStatus, 'OpenAI');
        } else {
            this.showApiKeyError(this.openaiKeyStatus, 'נא להזין מפתח API תקין');
        }
    }

    /**
     * שמירת מפתח API של Groq
     */
    saveGroqApiKey() {
        const groqInput = document.getElementById('groq-api-key');
        const groqStatus = document.getElementById('groq-key-status');
        
        if (!groqInput || !groqStatus) return;

        const newApiKey = groqInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('groq_api_key', newApiKey);
            this.groqApiKey = newApiKey;
            this.showApiKeySuccess(groqStatus, 'Groq');
        } else {
            localStorage.removeItem('groq_api_key');
            this.groqApiKey = '';
            groqStatus.textContent = '';
        }
    }

    /**
     * שמירת מפתח API של Anthropic
     */
    saveAnthropicApiKey() {
        const anthropicInput = document.getElementById('anthropic-api-key');
        const anthropicStatus = document.getElementById('anthropic-key-status');
        
        if (!anthropicInput || !anthropicStatus) return;

        const newApiKey = anthropicInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('anthropic_api_key', newApiKey);
            this.anthropicApiKey = newApiKey;
            this.showApiKeySuccess(anthropicStatus, 'Anthropic');
        } else {
            localStorage.removeItem('anthropic_api_key');
            this.anthropicApiKey = '';
            anthropicStatus.textContent = '';
        }
    }

    /**
     * הצגת הודעת הצלחה לשמירת מפתח API
     */
    showApiKeySuccess(statusElement, providerName) {
        statusElement.textContent = `מפתח API של ${providerName} נשמר בהצלחה!`;
        statusElement.style.color = '#28a745';
        statusElement.style.animation = 'fadeIn 0.3s';

        setTimeout(() => {
            statusElement.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                statusElement.textContent = `מפתח API של ${providerName} פעיל`;
                statusElement.style.animation = '';
                statusElement.style.opacity = '1';
            }, 500);
        }, 3000);
    }

    /**
     * הצגת הודעת שגיאה לשמירת מפתח API
     */
    showApiKeyError(statusElement, message) {
        statusElement.textContent = message;
        statusElement.style.color = '#dc3545';
        statusElement.style.animation = 'shake 0.5s';

        setTimeout(() => {
            statusElement.style.animation = '';
        }, 500);
    }

    /**
     * קישור אירועים מורחב לכל ספקי ה-AI
     */
    bindAPIEvents() {
        // OpenAI
        if (this.saveOpenaiKeyBtn) {
            this.saveOpenaiKeyBtn.addEventListener('click', () => {
                this.saveOpenaiApiKey();
            });
        }

        if (this.showOpenaiKeyCheckbox && this.openaiApiKeyInput) {
            this.showOpenaiKeyCheckbox.addEventListener('change', () => {
                this.openaiApiKeyInput.type = this.showOpenaiKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // Groq
        const saveGroqBtn = document.getElementById('save-groq-key');
        if (saveGroqBtn) {
            saveGroqBtn.addEventListener('click', () => {
                this.saveGroqApiKey();
            });
        }

        // Anthropic
        const saveAnthropicBtn = document.getElementById('save-anthropic-key');
        if (saveAnthropicBtn) {
            saveAnthropicBtn.addEventListener('click', () => {
                this.saveAnthropicApiKey();
            });
        }

        // הצגת/הסתרת כל המפתחות
        const showAllKeysCheckbox = document.getElementById('show-all-keys');
        if (showAllKeysCheckbox) {
            showAllKeysCheckbox.addEventListener('change', () => {
                const isChecked = showAllKeysCheckbox.checked;
                
                // OpenAI
                if (this.openaiApiKeyInput) {
                    this.openaiApiKeyInput.type = isChecked ? 'text' : 'password';
                }
                
                // Groq
                const groqInput = document.getElementById('groq-api-key');
                if (groqInput) {
                    groqInput.type = isChecked ? 'text' : 'password';
                }
                
                // Anthropic
                const anthropicInput = document.getElementById('anthropic-api-key');
                if (anthropicInput) {
                    anthropicInput.type = isChecked ? 'text' : 'password';
                }

                // סנכרון עם checkbox של OpenAI
                if (this.showOpenaiKeyCheckbox) {
                    this.showOpenaiKeyCheckbox.checked = isChecked;
                }
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
     * קבלת מפתח API לפי ספק
     */
    getApiKey(provider) {
        switch (provider) {
            case 'openai':
                return this.openaiApiKey;
            case 'groq':
                return this.groqApiKey;
            case 'anthropic':
                return this.anthropicApiKey;
            default:
                return '';
        }
    }

    /**
     * בדיקה אם ספק AI זמין
     */
    isProviderAvailable(provider) {
        return !!this.getApiKey(provider);
    }

    /**
     * קבלת רשימת ספקים זמינים
     */
    getAvailableProviders() {
        const providers = [];
        
        if (this.isProviderAvailable('openai')) {
            providers.push({ id: 'openai', name: 'OpenAI GPT' });
        }
        
        if (this.isProviderAvailable('groq')) {
            providers.push({ id: 'groq', name: 'Groq Llama' });
        }
        
        if (this.isProviderAvailable('anthropic')) {
            providers.push({ id: 'anthropic', name: 'Anthropic Claude' });
        }
        
        return providers;
    }
}

// ייצוא המחלקה
window.UIAPIManagement = UIAPIManagement;