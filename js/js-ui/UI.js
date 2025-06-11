/**
 * מודול לטיפול בממשק המשתמש - קובץ ראשי מעודכן לOpenAI בלבד
 */
class UI extends UIResultsDisplay {
    constructor() {
        super();
        console.log('מחלקת UI הוטענה בהצלחה - מעודכן לOpenAI Whisper');
    }
}

// הוספת פונקציית דיבוג לבדיקת localStorage
function debugLocalStorage() {
    console.group('Local Storage Debug');

    // בדיקת מפתח OpenAI
    const openaiKey = localStorage.getItem('openai_api_key');
    console.log('OpenAI API Key:', openaiKey ? 'Exists' : 'Not Found');

    // הדפסת כל המפתחות ב-localStorage
    console.log('All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`${key}: ${localStorage.getItem(key)}`);
    }

    console.groupEnd();
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

// הוספת פונקציית דיבוג לאירועים
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const helpPopup = document.getElementById('help-popup');
    const closeBtn = document.getElementById('close-help-popup');
    const scrollToApiBtn = document.getElementById('scroll-to-api');

    function toggleHelpPopup() {
        helpPopup.classList.toggle('show');
    }

    function scrollToApiSettings() {
        const apiSettingsElement = document.getElementById('api-settings');
        if (apiSettingsElement) {
            apiSettingsElement.scrollIntoView({ behavior: 'smooth' });
            // פתיחת ההגדרות אם הן סגורות
            const apiSettingsDetails = apiSettingsElement.querySelector('details');
            if (apiSettingsDetails) {
                apiSettingsDetails.open = true;
            }
            // סגירת תיבת העזרה
            toggleHelpPopup();
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

    // הדפסת מפתחות localStorage בעת טעינת הדף
    debugLocalStorage();

    // שיפור הטיפול בשמירת המפתח
    const openaiInput = document.getElementById('openai-api-key');
    const saveOpenaiKeyBtn = document.getElementById('save-openai-key');

    if (saveOpenaiKeyBtn) {
        saveOpenaiKeyBtn.addEventListener('click', () => {
            if (openaiInput) {
                const apiKey = openaiInput.value.trim();
                console.log('Saving OpenAI API Key', apiKey);
                localStorage.setItem('openai_api_key', apiKey);
                debugLocalStorage(); // הדפסת המצב לאחר השמירה
            }
        });
    }
});

// ייצוא המחלקה
window.UI = UI;