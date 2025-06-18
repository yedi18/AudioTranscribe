/**
 * מודול לטיפול בממשק המשתמש - קובץ ראשי מעודכן לכל הספקים
 */
class UI extends UIResultsDisplay {
    constructor() {
        super();
        // הסרת הלוג מהקונסטרקטור
    }
}

// הוספת פונקציית דיבוג לבדיקת localStorage (מוסתרת)
function debugLocalStorage() {
    // הסרת כל הלוגים מהפונקציה
    // הפונקציה עדיין קיימת אבל לא מדפיסה כלום
}

function resetUploadUI() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';

    this.selectedFile = null;
    this.fileInfo.style.display = 'none';
    this.uploadArea.style.display = 'block';
    this.resultContainer.style.display = 'none';
    this.errorMessage.style.display = 'none';
}

// הוספת פונקציית דיבוג לאירועים (מוסתרת)
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const helpPopup = document.getElementById('help-popup');
    const closeBtn = document.getElementById('close-help-popup');
    const scrollToApiBtn = document.getElementById('scroll-to-api');

    function toggleHelpPopup() {
        helpPopup.classList.toggle('show');
    }

    function scrollToApiSettings() {
        const apiSettingsBtn = document.getElementById('api-settings-btn');
        if (apiSettingsBtn) {
            apiSettingsBtn.click(); // פתיחת popup ההגדרות
            toggleHelpPopup(); // סגירת העזרה
        }
    }

    if (helpBtn) helpBtn.addEventListener('click', toggleHelpPopup);
    if (closeBtn) closeBtn.addEventListener('click', toggleHelpPopup);
    if (scrollToApiBtn) scrollToApiBtn.addEventListener('click', scrollToApiSettings);

    // סגירת הפופאפ בלחיצה מחוץ אליו
    document.addEventListener('click', function (event) {
        if (helpPopup && helpPopup.classList.contains('show') &&
            !helpPopup.contains(event.target) &&
            event.target !== helpBtn) {
            toggleHelpPopup();
        }
    });

    // הסרת הדפסת מפתחות localStorage בעת טעינת הדף
    debugLocalStorage();

    // שיפור הטיפול בשמירת המפתח (עדיין עובד אבל ללא לוגים)
    const openaiInput = document.getElementById('openai-api-key');
    const saveOpenaiKeyBtn = document.getElementById('save-openai-key');

    if (saveOpenaiKeyBtn) {
        saveOpenaiKeyBtn.addEventListener('click', () => {
            if (openaiInput) {
                const apiKey = openaiInput.value.trim();
                localStorage.setItem('openai_api_key', apiKey);
                debugLocalStorage(); // עדיין קורא לפונקציה אבל היא לא מדפיסה
            }
        });
    }

    // הוספת טיפול בשמירת שאר המפתחות
    const apiKeys = [
        { input: 'huggingface-api-key', key: 'huggingface_api_key', btn: 'save-huggingface-key' },
        { input: 'groq-api-key', key: 'groq_api_key', btn: 'save-groq-key' },
        { input: 'gemini-api-key', key: 'gemini_api_key', btn: 'save-gemini-key' },
        { input: 'anthropic-api-key', key: 'anthropic_api_key', btn: 'save-anthropic-key' }
    ];

    apiKeys.forEach(({ input, key, btn }) => {
        const inputElement = document.getElementById(input);
        const btnElement = document.getElementById(btn);
        
        if (inputElement && btnElement) {
            btnElement.addEventListener('click', () => {
                const apiKey = inputElement.value.trim();
                if (apiKey) {
                    localStorage.setItem(key, apiKey);
                } else {
                    localStorage.removeItem(key);
                }
            });
        }
    });
});

// ייצוא המחלקה
window.UI = UI;