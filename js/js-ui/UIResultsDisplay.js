/**
 * מודול לטיפול בהצגת תוצאות בממשק
 * מרחיב את מחלקת UIProgressDisplay
 */
class UIResultsDisplay extends UIProgressDisplay {
    /**
     * מציג את תוצאות התמלול
     * @param {string} transcription - טקסט התמלול
     */
    showResults(transcription) {
        // מסתיר את אזור ההעלאה ומציג את התוצאות
        this.uploadContainer.style.display = 'none';
        this.resultContainer.style.display = 'block';
        this.loadingSpinner.style.display = 'none';
        this.progressContainer.style.display = 'none';

        // מציג את התמלול
        this.transcriptionResult.value = transcription || "לא התקבל תמלול. נא לנסות שוב.";

        // איפוס מצב לשוניות השיפור אם המודול קיים
        if (this.enhancementHandler) {
            this.enhancementHandler.resetState();
        }

        // החזרת הלשונית הראשונה למצב פעיל
        const resultTabButtons = document.querySelectorAll('.result-tab-btn');
        const resultTabContents = document.querySelectorAll('.result-tab-content');

        resultTabButtons.forEach(btn => btn.classList.remove('active'));
        resultTabContents.forEach(content => content.classList.remove('active'));

        const originalTabBtn = document.querySelector('[data-result-tab="original"]');
        if (originalTabBtn) originalTabBtn.classList.add('active');

        const originalContent = document.getElementById('original-content');
        if (originalContent) originalContent.classList.add('active');

        // גלילה אל התוצאות
        this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // הסתרת כרטיס הטיפים
        if (this.tipsCard) {
            this.tipsCard.style.display = 'none';
        }

        // הצגת התוצאות עם אפקט כניסה
        this.resultContainer.style.animation = 'fadeIn 0.5s';
    }

    /**
     * מתחיל תמלול כאשר לוחצים על כפתור "התחל תמלול"
     * פונקציה זו תמולא בקובץ main.js
     */
    onTranscribeClick() {
        // פונקציה זו תמולא בקובץ main.js
        console.log("פונקציית onTranscribeClick צריכה להיות מוגדרת בקובץ main.js");
    }
}

// ייצוא המחלקה
window.UIResultsDisplay = UIResultsDisplay;