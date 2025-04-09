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

// הוספת פונקציית דיבוג לאירועים
document.addEventListener('DOMContentLoaded', () => {
    // הדפסת מפתחות localStorage בעת טעינת הדף
    debugLocalStorage();
    
    // הוספת לחצן דיבוג
    const debugButton = document.createElement('button');
    debugButton.textContent = 'Debug API Keys';
    debugButton.style.position = 'fixed';
    debugButton.style.bottom = '10px';
    debugButton.style.left = '10px';
    debugButton.style.zIndex = '1000';
    debugButton.addEventListener('click', debugLocalStorage);
    document.body.appendChild(debugButton);
    
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