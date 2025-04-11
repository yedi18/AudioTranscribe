/**
 * מודול לטיפול בממשק המשתמש - קובץ ראשי
 * מייבא את כל המודולים האחרים
 */
class UI extends UIResultsDisplay {
    constructor() {
        super();
        console.log('מחלקת UI הוטענה בהצלחה');
    }
}


// הוספת פונקציית דיבוג לבדיקת localStorage
function debugLocalStorage() {
    console.group('Local Storage Debug');

    // בדיקת מפתחות Huggingface
    const huggingfaceKey = localStorage.getItem('huggingface_api_key');
    console.log('Huggingface API Key:', huggingfaceKey ? 'Exists' : 'Not Found');

    // בדיקת מפתחות Groq
    const groqKey = localStorage.getItem('groq_api_key');
    console.log('Groq API Key:', groqKey ? 'Exists' : 'Not Found');

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
    if (fileInput) fileInput.value = ''; // איפוס קלט

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

    helpBtn.addEventListener('click', toggleHelpPopup);
    closeBtn.addEventListener('click', toggleHelpPopup);
    scrollToApiBtn.addEventListener('click', scrollToApiSettings);

    // סגירת הפופאפ בלחיצה מחוץ אליו
    document.addEventListener('click', function (event) {
        if (helpPopup.classList.contains('show') &&
            !helpPopup.contains(event.target) &&
            event.target !== helpBtn) {
            toggleHelpPopup();
        }
    });


    // הדפסת מפתחות localStorage בעת טעינת הדף
    debugLocalStorage();


    // שיפור הטיפול בשמירת המפתחות
    const huggingfaceInput = document.getElementById('huggingface-api-key');
    const groqInput = document.getElementById('groq-api-key');
    const saveHuggingfaceKeyBtn = document.getElementById('save-huggingface-key');
    const saveGroqKeyBtn = document.getElementById('save-groq-key');

    if (saveHuggingfaceKeyBtn) {
        saveHuggingfaceKeyBtn.addEventListener('click', () => {
            if (huggingfaceInput) {
                const apiKey = huggingfaceInput.value.trim();
                console.log('Saving Huggingface API Key', apiKey);
                localStorage.setItem('huggingface_api_key', apiKey);
                debugLocalStorage(); // הדפסת המצב לאחר השמירה
            }
        });
    }

    if (saveGroqKeyBtn) {
        saveGroqKeyBtn.addEventListener('click', () => {
            if (groqInput) {
                const apiKey = groqInput.value.trim();
                console.log('Saving Groq API Key', apiKey);
                localStorage.setItem('groq_api_key', apiKey);
                debugLocalStorage(); // הדפסת המצב לאחר השמירה
            }
        });
    }

});

// ייצוא המחלקה
window.UI = UI;