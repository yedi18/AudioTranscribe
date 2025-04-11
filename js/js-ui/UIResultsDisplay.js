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
        this.updateRestartButton();

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

    updateRestartButton() {
        const restartBtn = document.getElementById('new-btn');
        if (!restartBtn || !this.selectedFile?.source) return;

        console.log('מקור הקובץ:', this.selectedFile?.source);

        // איפוס כל הקלאסים הקיימים ושמירה רק על btn
        restartBtn.className = 'btn new-btn';

        switch (this.selectedFile.source) {
            case 'upload':
                restartBtn.innerHTML = '<i class="fas fa-file-audio"></i> העלה קובץ חדש';
                restartBtn.onclick = () => {
                    this.resetUI();
                    const uploadTab = document.querySelector('[data-tab="upload-file"]');
                    if (uploadTab) uploadTab.click();
                };
                break;
            case 'recording':
                restartBtn.innerHTML = '<i class="fas fa-microphone"></i>הקלט הקלטה חדשה';
                restartBtn.className = 'btn new-btn btn-record';
                restartBtn.onclick = () => {
                    this.resetUI();
                    const recordTab = document.querySelector('[data-tab="record-audio"]');
                    if (recordTab) recordTab.click();
                };
                break;
            case 'youtube':
                restartBtn.innerHTML = '<i class="fab fa-youtube"></i> קישור חדש';
                restartBtn.onclick = () => {
                    this.resetUI();
                    const youtubeTab = document.querySelector('[data-tab="youtube-link"]');
                    if (youtubeTab) youtubeTab.click();
                };
                break;
            default:
                // ברירת מחדל - איפוס רגיל
                restartBtn.innerHTML = '<i class="fas fa-plus"></i> תמלול חדש';
                restartBtn.onclick = () => {
                    this.resetUI();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
        }
    }
}

// ייצוא המחלקה
window.UIResultsDisplay = UIResultsDisplay;