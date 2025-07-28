/**
 * מודול לטיפול בניהול מפתחות API - עם תמיכה ב-OpenAI, Ivrit.ai, Groq, Gemini, Anthropic
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

        // אתחול בחירת ספק ברירת מחדל
        this.initProviderSelection();
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

        // Ivrit.ai (RunPod)
        this.ivritApiKey = localStorage.getItem('ivrit_api_key') || '';
        this.ivritEndpointId = localStorage.getItem('ivrit_endpoint_id') || '';
        const ivritApiInput = document.getElementById('ivrit-api-key');
        const ivritEndpointInput = document.getElementById('ivrit-endpoint-id');
        if (ivritApiInput) {
            ivritApiInput.value = this.ivritApiKey;
        }
        if (ivritEndpointInput) {
            ivritEndpointInput.value = this.ivritEndpointId;
        }

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

        // Gemini
        this.geminiApiKey = localStorage.getItem('gemini_api_key') || '';
        const geminiInput = document.getElementById('gemini-api-key');
        if (geminiInput) {
            geminiInput.value = this.geminiApiKey;
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

        // Ivrit.ai
        const ivritStatus = document.getElementById('ivrit-key-status');
        if (this.ivritApiKey && this.ivritEndpointId && ivritStatus) {
            ivritStatus.textContent = 'הגדרות Ivrit.ai נטענו בהצלחה';
            ivritStatus.style.color = '#28a745';
        } else if ((this.ivritApiKey || this.ivritEndpointId) && ivritStatus) {
            ivritStatus.textContent = 'חסרים פרטים להגדרת Ivrit.ai';
            ivritStatus.style.color = '#dc3545';
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

        // Gemini
        const geminiStatus = document.getElementById('gemini-key-status');
        if (this.geminiApiKey && geminiStatus) {
            geminiStatus.textContent = 'מפתח API של Gemini נטען בהצלחה';
            geminiStatus.style.color = '#28a745';
        }
    }

    /**
     * אתחול בחירת ספק תמלול
     */
    initProviderSelection() {
        const transcriptionModeSelect = document.getElementById('transcription-mode');
        if (transcriptionModeSelect) {
            // טעינת בחירה שמורה
            const savedProvider = localStorage.getItem('transcription_provider') || 'openai';
            transcriptionModeSelect.value = savedProvider;
        }
    }

    /**
     * עדכון מידע על הספק הנבחר
     */
    updateProviderInfo(provider) {
        // כאן אפשר להוסיף לוגיקה להצגת מידע ספציפי לספק
        // לדוגמה: הצגת מגבלות גודל קובץ
        console.log(`ספק תמלול נבחר: ${provider}`);
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
     * שמירת מפתח API של Ivrit.ai (RunPod)
     */
    saveIvritApiKey() {
        const ivritApiInput = document.getElementById('ivrit-api-key');
        const ivritStatus = document.getElementById('ivrit-key-status');
        
        if (!ivritApiInput || !ivritStatus) return;

        const newApiKey = ivritApiInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('ivrit_api_key', newApiKey);
            this.ivritApiKey = newApiKey;
            
            // בדיקה אם יש גם endpoint ID
            if (this.ivritEndpointId) {
                this.showApiKeySuccess(ivritStatus, 'RunPod (Ivrit.ai)');
            } else {
                ivritStatus.textContent = 'מפתח API נשמר, נא להזין גם Endpoint ID';
                ivritStatus.style.color = '#ffc107';
            }
        } else {
            localStorage.removeItem('ivrit_api_key');
            this.ivritApiKey = '';
            this.showApiKeyError(ivritStatus, 'נא להזין מפתח API תקין');
        }
    }

    /**
     * שמירת Endpoint ID של Ivrit.ai
     */
    saveIvritEndpointId() {
        const ivritEndpointInput = document.getElementById('ivrit-endpoint-id');
        const ivritStatus = document.getElementById('ivrit-key-status');
        
        if (!ivritEndpointInput) return;

        const newEndpointId = ivritEndpointInput.value.trim();
        if (newEndpointId) {
            localStorage.setItem('ivrit_endpoint_id', newEndpointId);
            this.ivritEndpointId = newEndpointId;
            
            // בדיקה אם יש גם API key
            if (this.ivritApiKey && ivritStatus) {
                this.showApiKeySuccess(ivritStatus, 'RunPod (Ivrit.ai)');
            } else if (ivritStatus) {
                ivritStatus.textContent = 'Endpoint ID נשמר, נא להזין גם מפתח API';
                ivritStatus.style.color = '#ffc107';
            }
        } else {
            localStorage.removeItem('ivrit_endpoint_id');
            this.ivritEndpointId = '';
            if (ivritStatus) {
                this.showApiKeyError(ivritStatus, 'נא להזין Endpoint ID תקין');
            }
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
     * שמירת מפתח API של Gemini
     */
    saveGeminiApiKey() {
        const geminiInput = document.getElementById('gemini-api-key');
        const geminiStatus = document.getElementById('gemini-key-status');
        
        if (!geminiInput || !geminiStatus) return;

        const newApiKey = geminiInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('gemini_api_key', newApiKey);
            this.geminiApiKey = newApiKey;
            this.showApiKeySuccess(geminiStatus, 'Gemini');
        } else {
            localStorage.removeItem('gemini_api_key');
            this.geminiApiKey = '';
            geminiStatus.textContent = '';
        }
    }

    /**
     * הצגת הודעת הצלחה לשמירת מפתח API
     */
    showApiKeySuccess(statusElement, providerName) {
        if (!statusElement) return;
        
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
        if (!statusElement) return;
        
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

        // Ivrit.ai
        const saveIvritBtn = document.getElementById('save-ivrit-key');
        const saveIvritEndpointBtn = document.getElementById('save-ivrit-endpoint');
        
        if (saveIvritBtn) {
            saveIvritBtn.addEventListener('click', () => {
                this.saveIvritApiKey();
            });
        }

        if (saveIvritEndpointBtn) {
            saveIvritEndpointBtn.addEventListener('click', () => {
                this.saveIvritEndpointId();
            });
        }

        // הצגת/הסתרת מפתח Ivrit.ai
        const showIvritKeyCheckbox = document.getElementById('show-ivrit-key');
        const ivritApiInput = document.getElementById('ivrit-api-key');
        if (showIvritKeyCheckbox && ivritApiInput) {
            showIvritKeyCheckbox.addEventListener('change', () => {
                ivritApiInput.type = showIvritKeyCheckbox.checked ? 'text' : 'password';
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

        // Gemini
        const saveGeminiBtn = document.getElementById('save-gemini-key');
        if (saveGeminiBtn) {
            saveGeminiBtn.addEventListener('click', () => {
                this.saveGeminiApiKey();
            });
        }

        // הצגת/הסתרת כל המפתחות
        const showAllKeysCheckbox = document.getElementById('show-all-keys');
        if (showAllKeysCheckbox) {
            showAllKeysCheckbox.addEventListener('change', () => {
                const isChecked = showAllKeysCheckbox.checked;
                
                // רשימת כל שדות המפתחות
                const keyInputs = [
                    'openai-api-key',
                    'ivrit-api-key', 
                    'groq-api-key',
                    'anthropic-api-key',
                    'gemini-api-key'
                ];

                keyInputs.forEach(inputId => {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.type = isChecked ? 'text' : 'password';
                    }
                });

                // סנכרון עם checkbox של OpenAI
                if (this.showOpenaiKeyCheckbox) {
                    this.showOpenaiKeyCheckbox.checked = isChecked;
                }
            });
        }

        // מודל עזרה של OpenAI
        this.bindModalEvents('openai');
        // מודל עזרה של Ivrit.ai
        this.bindModalEvents('ivrit');
        // מודלי עזרה של שאר הספקים
        this.bindModalEvents('groq');
        this.bindModalEvents('anthropic');
        this.bindModalEvents('gemini');
    }

    /**
     * קישור אירועים למודל עזרה של ספק
     */
    bindModalEvents(provider) {
        const helpIcon = document.getElementById(`${provider}-help-icon`);
        const modal = document.getElementById(`${provider}-guide-modal`);
        
        if (helpIcon && modal) {
            helpIcon.addEventListener('click', () => {
                modal.style.display = 'block';
            });

            const closeModal = modal.querySelector('.close-modal');
            if (closeModal) {
                closeModal.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }

            // סגירת המודאל בלחיצה מחוץ לתוכן
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });

            // סגירת המודאל בלחיצה על Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'block') {
                    modal.style.display = 'none';
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
            case 'ivrit':
                return this.ivritApiKey;
            case 'groq':
                return this.groqApiKey;
            case 'anthropic':
                return this.anthropicApiKey;
            case 'gemini':
                return this.geminiApiKey;
            default:
                return '';
        }
    }

    /**
     * קבלת Endpoint ID עבור Ivrit.ai
     */
    getIvritEndpointId() {
        return this.ivritEndpointId;
    }

    /**
     * בדיקה אם ספק AI זמין
     */
    isProviderAvailable(provider) {
        if (provider === 'ivrit') {
            return !!(this.getApiKey(provider) && this.getIvritEndpointId());
        }
        return !!this.getApiKey(provider);
    }

    /**
     * קבלת רשימת ספקי תמלול זמינים
     */
    getAvailableTranscriptionProviders() {
        const providers = [];
        
        if (this.isProviderAvailable('openai')) {
            providers.push({ id: 'openai', name: 'OpenAI Whisper', maxSize: '25MB' });
        }
        
        if (this.isProviderAvailable('ivrit')) {
            providers.push({ id: 'ivrit', name: 'Ivrit.ai', maxSize: '10MB' });
        }
        
        return providers;
    }

    /**
     * קבלת רשימת ספקי הגהה וסיכום זמינים
     */
    getAvailableEnhancementProviders() {
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
        
        if (this.isProviderAvailable('gemini')) {
            providers.push({ id: 'gemini', name: 'Google Gemini' });
        }
        
        return providers;
    }

    /**
     * ולידציה של הגדרות ספק
     */
    validateProviderSettings(provider) {
        switch (provider) {
            case 'openai':
                return {
                    valid: !!this.openaiApiKey,
                    message: this.openaiApiKey ? 'הגדרות OpenAI תקינות' : 'חסר מפתח API של OpenAI'
                };
            case 'ivrit':
                const hasKey = !!this.ivritApiKey;
                const hasEndpoint = !!this.ivritEndpointId;
                return {
                    valid: hasKey && hasEndpoint,
                    message: hasKey && hasEndpoint ? 'הגדרות Ivrit.ai תקינות' :
                            !hasKey ? 'חסר מפתח API של RunPod' :
                            'חסר Endpoint ID של Ivrit.ai'
                };
            case 'groq':
                return {
                    valid: !!this.groqApiKey,
                    message: this.groqApiKey ? 'הגדרות Groq תקינות' : 'חסר מפתח API של Groq'
                };
            case 'anthropic':
                return {
                    valid: !!this.anthropicApiKey,
                    message: this.anthropicApiKey ? 'הגדרות Anthropic תקינות' : 'חסר מפתח API של Anthropic'
                };
            case 'gemini':
                return {
                    valid: !!this.geminiApiKey,
                    message: this.geminiApiKey ? 'הגדרות Gemini תקינות' : 'חסר מפתח API של Gemini'
                };
            default:
                return { valid: false, message: 'ספק לא מזוהה' };
        }
    }

    /**
     * ניקוי מפתחות API (למטרות פיתוח/דיבוג)
     */
    clearAllApiKeys() {
        const keys = [
            'openai_api_key',
            'ivrit_api_key', 
            'ivrit_endpoint_id',
            'groq_api_key',
            'anthropic_api_key',
            'gemini_api_key',
            'transcription_provider'
        ];

        keys.forEach(key => {
            localStorage.removeItem(key);
        });

        // איפוס המשתנים
        this.openaiApiKey = '';
        this.ivritApiKey = '';
        this.ivritEndpointId = '';
        this.groqApiKey = '';
        this.anthropicApiKey = '';
        this.geminiApiKey = '';

        // רענון הממשק
        this.loadApiKeys();
        this.updateApiKeyStatuses();

        console.log('כל מפתחות ה-API נוקו');
    }
}

// ייצוא המחלקה
window.UIAPIManagement = UIAPIManagement;