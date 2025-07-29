/**
 * מודול לטיפול באירועים וקישור אירועים בממשק - מעודכן עם תמיכה ב-Ivrit.ai
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
     * קישור אירועים לניהול API - מעודכן עם כל הספקים
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

        // Ivrit.ai - מפתח API
        const saveIvritKeyBtn = document.getElementById('save-ivrit-key');
        if (saveIvritKeyBtn) {
            saveIvritKeyBtn.addEventListener('click', () => {
                this.saveIvritApiKey();
            });
        }

        // Ivrit.ai - Endpoint ID
        const saveIvritEndpointBtn = document.getElementById('save-ivrit-endpoint');
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

        const showGroqKeyCheckbox = document.getElementById('show-groq-key');
        const groqApiInput = document.getElementById('groq-api-key');
        if (showGroqKeyCheckbox && groqApiInput) {
            showGroqKeyCheckbox.addEventListener('change', () => {
                groqApiInput.type = showGroqKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // Anthropic
        const saveAnthropicBtn = document.getElementById('save-anthropic-key');
        if (saveAnthropicBtn) {
            saveAnthropicBtn.addEventListener('click', () => {
                this.saveAnthropicApiKey();
            });
        }

        const showAnthropicKeyCheckbox = document.getElementById('show-anthropic-key');
        const anthropicApiInput = document.getElementById('anthropic-api-key');
        if (showAnthropicKeyCheckbox && anthropicApiInput) {
            showAnthropicKeyCheckbox.addEventListener('change', () => {
                anthropicApiInput.type = showAnthropicKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // Gemini
        const saveGeminiBtn = document.getElementById('save-gemini-key');
        if (saveGeminiBtn) {
            saveGeminiBtn.addEventListener('click', () => {
                this.saveGeminiApiKey();
            });
        }

        const showGeminiKeyCheckbox = document.getElementById('show-gemini-key');
        const geminiApiInput = document.getElementById('gemini-api-key');
        if (showGeminiKeyCheckbox && geminiApiInput) {
            showGeminiKeyCheckbox.addEventListener('change', () => {
                geminiApiInput.type = showGeminiKeyCheckbox.checked ? 'text' : 'password';
            });
        }

        // בחירת ספק תמלול
        const transcriptionModeSelect = document.getElementById('transcription-mode');
        if (transcriptionModeSelect) {
            transcriptionModeSelect.addEventListener('change', (e) => {
                const selectedProvider = e.target.value;
                localStorage.setItem('transcription_provider', selectedProvider);
                this.updateProviderDisplay(selectedProvider);
                this.validateSelectedProvider(selectedProvider);
                this.updateProviderInfo(selectedProvider);

            });

            // טעינת הבחירה השמורה
            const savedProvider = localStorage.getItem('transcription_provider') || 'openai';
            transcriptionModeSelect.value = savedProvider;
            this.updateProviderDisplay(savedProvider);
        }

        // טיפול במודלי עזרה לכל הספקים
        this.bindHelpModals();

        // הוספת Enter key support לכל שדות ה-API
        this.bindEnterKeySupport();
    }

    /**
     * קישור מודלי עזרה לכל הספקים
     */
    bindHelpModals() {
        const providers = ['openai', 'ivrit', 'groq', 'anthropic', 'gemini'];

        providers.forEach(provider => {
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
        });
    }

    /**
     * הוספת תמיכה ב-Enter key לשדות API
     */
    bindEnterKeySupport() {
        // רשימת זוגות שדה-כפתור
        const fieldButtonPairs = [
            { field: 'openai-api-key', button: 'save-openai-key' },
            { field: 'ivrit-api-key', button: 'save-ivrit-key' },
            { field: 'ivrit-endpoint-id', button: 'save-ivrit-endpoint' },
            { field: 'groq-api-key', button: 'save-groq-key' },
            { field: 'anthropic-api-key', button: 'save-anthropic-key' },
            { field: 'gemini-api-key', button: 'save-gemini-key' }
        ];

        fieldButtonPairs.forEach(({ field, button }) => {
            const fieldElement = document.getElementById(field);
            const buttonElement = document.getElementById(button);

            if (fieldElement && buttonElement) {
                fieldElement.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        buttonElement.click();
                    }
                });
            }
        });
    }

    /**
     * עדכון תצוגה לפי ספק הנבחר
     */
    updateProviderDisplay(provider) {
        // הצגת הודעות מידע ספציפיות לספק
        this.showProviderInfo(provider);

        // עדכון מגבלות גודל קובץ
        this.updateFileSizeLimits(provider);

        // בדיקת זמינות הספק
        this.checkProviderAvailability(provider);
    }

    /**
     * הצגת מידע על הספק הנבחר
     */
    showProviderInfo(provider) {
        // הסרת הודעות קודמות
        const existingInfo = document.querySelectorAll('.provider-info-message');
        existingInfo.forEach(info => info.remove());

        // יצירת הודעת מידע חדשה
        const infoMessage = document.createElement('div');
        infoMessage.className = 'provider-info-message';
        infoMessage.style.cssText = `
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 12px;
            margin: 10px 0;
            font-size: 14px;
            color: #1565c0;
        `;

        let infoText = '';
        let infoIcon = '';

        switch (provider) {
            case 'openai':
                infoIcon = '🤖';
                infoText = 'OpenAI Whisper - תמלול מדויק באיכות גבוהה. תומך בקבצים עד 25MB עם חילוק אוטומטי.';
                break;
            case 'ivrit':
                infoIcon = '🇮🇱';
                infoText = 'Ivrit.ai - מותאם במיוחד לעברית. תומך בקבצים גדולים עם חילוק חכם אוטומטי.';
                break;
            default:
                return;
        }


        infoMessage.innerHTML = `${infoIcon} ${infoText}`;

        // הוספת ההודעה אחרי בחירת הספק
        const transcriptionModeSelect = document.getElementById('transcription-mode');
        if (transcriptionModeSelect && transcriptionModeSelect.parentNode) {
            transcriptionModeSelect.parentNode.insertBefore(infoMessage, transcriptionModeSelect.nextSibling);
        }
    }

    /**
     * עדכון מגבלות גודל קובץ
     */
    updateFileSizeLimits(provider) {
        const limits = {
            openai: '25MB (עם חילוק אוטומטי)',
            ivrit: '10MB'
        };

        // עדכון בכלי העזרה או בממשק אם צריך
        console.log(`מגבלת גודל קובץ ל-${provider}: ${limits[provider] || 'לא מוגדר'}`);
    }

    /**
     * בדיקת זמינות הספק
     */
    checkProviderAvailability(provider) {
        if (!this.isProviderAvailable || typeof this.isProviderAvailable !== 'function') {
            return; // אם הפונקציה לא זמינה, לא עושים כלום
        }

        const isAvailable = this.isProviderAvailable(provider);
        const transcribeBtn = document.getElementById('transcribe-btn');

        if (!isAvailable && transcribeBtn) {
            // הצגת אזהרה אם הספק לא זמין
            this.showProviderWarning(provider);
        }
    }

    /**
     * הצגת אזהרה על ספק לא זמין
     */
    showProviderWarning(provider) {
        const warningMessage = document.createElement('div');
        warningMessage.className = 'provider-warning-message';
        warningMessage.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 12px;
            margin: 10px 0;
            font-size: 14px;
            color: #856404;
        `;

        let warningText = '';
        switch (provider) {
            case 'openai':
                warningText = '⚠️ נדרש מפתח API של OpenAI. עבור להגדרות API להוספת המפתח.';
                break;
            case 'ivrit':
                warningText = '⚠️ נדרשים מפתח RunPod API ו-Endpoint ID של Ivrit.ai. עבור להגדרות API.';
                break;
            default:
                warningText = `⚠️ ספק ${provider} לא הוגדר. עבור להגדרות API.`;
        }

        warningMessage.innerHTML = warningText;

        // הוספת כפתור לפתיחת הגדרות
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = 'פתח הגדרות API';
        settingsBtn.className = 'btn btn-sm';
        settingsBtn.style.cssText = 'margin-top: 8px; font-size: 12px;';
        settingsBtn.addEventListener('click', () => {
            const apiSettingsBtn = document.getElementById('api-settings-btn');
            if (apiSettingsBtn) {
                apiSettingsBtn.click();
            }
        });

        warningMessage.appendChild(settingsBtn);

        // הוספת האזהרה
        const transcriptionModeSelect = document.getElementById('transcription-mode');
        if (transcriptionModeSelect && transcriptionModeSelect.parentNode) {
            // הסרת אזהרות קודמות
            const existingWarnings = document.querySelectorAll('.provider-warning-message');
            existingWarnings.forEach(warning => warning.remove());

            transcriptionModeSelect.parentNode.insertBefore(warningMessage, transcriptionModeSelect.nextSibling);
        }
    }

    /**
     * ולידציה של הספק הנבחר
     */
    validateSelectedProvider(provider) {
        if (this.validateProviderSettings && typeof this.validateProviderSettings === 'function') {
            const validation = this.validateProviderSettings(provider);

            if (!validation.valid) {
                console.warn(`ספק ${provider} לא הוגדר כראוי: ${validation.message}`);
                this.showProviderWarning(provider);
            } else {
                // הסרת אזהרות אם הספק תקין
                const existingWarnings = document.querySelectorAll('.provider-warning-message');
                existingWarnings.forEach(warning => warning.remove());
            }
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
                    this.handleTabSpecificActions(tabId);
                });
            });
        }

        // טיפול בתפריט נפתח להורדה
        this.bindDownloadDropdown();
    }

    /**
     * טיפול בפעולות ספציפיות לכל לשונית
     */
    handleTabSpecificActions(tabId) {
        switch (tabId) {
            case 'record-audio':
                // איפוס ממשק ההקלטה
                if (this.recordingHandler && typeof this.recordingHandler.resetRecordingUI === 'function') {
                    this.recordingHandler.resetRecordingUI();
                }
                break;

            case 'youtube-link':
                // איפוס שדה הקלט של YouTube
                this.resetYouTubeInput();
                break;

            case 'upload-file':
                // וידוא שאזור ההעלאה מוצג
                if (this.uploadArea) {
                    this.uploadArea.style.display = 'flex';
                }
                break;
        }

        // איפוס תצוגת YouTube אם עוזבים את הטאב
        if (tabId !== 'youtube-link') {
            this.cleanupYouTubeDisplay();
        }
    }

    /**
     * איפוס שדה קלט YouTube
     */
    resetYouTubeInput() {
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

    /**
     * ניקוי תצוגת YouTube
     */
    cleanupYouTubeDisplay() {
        const youtubeInput = document.getElementById('youtube-url');
        const youtubeInfoBox = document.querySelector('.youtube-info');

        if (youtubeInput && youtubeInfoBox) {
            const url = youtubeInput.value?.trim();
            const youtubeFieldEmpty = !url;

            if (youtubeFieldEmpty) {
                youtubeInfoBox.innerHTML = '';
                youtubeInfoBox.style.display = 'none';
            }
        }
    }

    /**
     * קישור תפריט הורדה
     */
    bindDownloadDropdown() {
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
        // קביעת איזה טאב פעיל (אם יש טאבים של תוצאות)
        const activeTab = document.querySelector('.result-tab-btn.active');
        let textToCopy = '';

        if (activeTab) {
            const tabType = activeTab.getAttribute('data-result-tab');

            switch (tabType) {
                case 'original':
                    const transcriptionResult = document.getElementById('transcription-result');
                    textToCopy = transcriptionResult ? transcriptionResult.value : '';
                    break;
                case 'enhanced':
                    const enhancedResult = document.getElementById('enhanced-result');
                    textToCopy = enhancedResult ? this.extractTextFromHTML(enhancedResult.innerHTML) : '';
                    break;
                case 'summary':
                    const summaryResult = document.getElementById('summary-result');
                    textToCopy = summaryResult ? this.extractTextFromHTML(summaryResult.innerHTML) : '';
                    break;
            }
        } else {
            // אם אין טאבים, העתק מהתמלול הראשי
            const textArea = document.getElementById('transcription-result');
            textToCopy = textArea ? textArea.value : '';
        }

        if (textToCopy) {
            // בחירת הטקסט והעתקה
            navigator.clipboard.writeText(textToCopy).then(() => {
                // אנימציה להודעת העתקה
                const originalText = this.copyBtn.innerHTML;
                this.copyBtn.innerHTML = '<i class="fas fa-check"></i> הועתק!';
                this.copyBtn.style.background = '#28a745';

                setTimeout(() => {
                    this.copyBtn.innerHTML = originalText;
                    this.copyBtn.style.background = '';
                }, 2000);
            }).catch(err => {
                console.error('שגיאה בהעתקת הטקסט:', err);
                // fallback לדפדפנים ישנים
                this.fallbackCopyToClipboard(textToCopy);
            });
        } else {
            alert('אין תוכן להעתקה');
        }
    }

    /**
     * פונקציית fallback להעתקה
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<i class="fas fa-check"></i> הועתק!';
            this.copyBtn.style.background = '#28a745';

            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Fallback: Could not copy text: ', err);
            alert('לא ניתן להעתיק את הטקסט');
        }

        document.body.removeChild(textArea);
    }

    /**
     * חילוץ טקסט מ-HTML
     */
    extractTextFromHTML(html) {
        if (!html) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    /**
     * מעבר ללשונית ספציפית
     */
    switchTab(tabId) {
        const targetTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (targetTab) {
            // איפוס UI לפני מעבר ללשונית החדשה
            this.resetUI();
            targetTab.click(); // מפעיל את האירוע של המעבר
        }
    }

    /**
     * הוספת validation עבור תמלול
     */
    validateBeforeTranscription() {
        const selectedProvider = localStorage.getItem('transcription_provider') || 'openai';

        // בדיקה שיש קובץ נבחר
        if (!this.selectedFile) {
            this.showError('נא לבחור קובץ אודיו תקין');
            return false;
        }

        // בדיקת זמינות הספק
        if (this.validateProviderSettings && typeof this.validateProviderSettings === 'function') {
            const validation = this.validateProviderSettings(selectedProvider);
            if (!validation.valid) {
                this.showError(validation.message);
                return false;
            }
        }

        // בדיקת גודל קובץ לפי ספק
       

        return true;
    }

    /**
     * הוספת פונקציה להסרת הודעות זמניות
     */
    clearTemporaryMessages() {
        const messages = document.querySelectorAll('.provider-info-message, .provider-warning-message');
        messages.forEach(message => message.remove());
    }

    /**
     * איפוס ממשק עם ניקוי הודעות
     */
    resetUI() {
        // קריאה לפונקציה המקורית
        if (super.resetUI) {
            super.resetUI();
        }

        // ניקוי הודעות זמניות
        this.clearTemporaryMessages();
    }
}

// ייצוא המחלקה
window.UIHandlers = UIHandlers;