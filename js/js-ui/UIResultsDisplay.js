/**
 * מודול לטיפול בהצגת תוצאות בממשק - עם ניקוי מלא של טיימרים
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

        // מציג את התמלול (ללא דוח בטקסט)
        this.transcriptionResult.value = transcription || "לא התקבל תמלול. נא לנסות שוב.";

        this.updateRestartButton();

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
     * איפוס הממשק כולל הסרת כל הטיימרים
     */
    resetUI() {
        // קריאה לפונקציה המקורית
        super.resetUI();
        
        // הסרת תצוגת זמן התמלול הסופי
        const timeDisplay = document.getElementById('transcription-time-display');
        if (timeDisplay) {
            timeDisplay.remove();
        }

        // הסרת שעון בזמן אמת
        const realTimeTimer = document.getElementById('real-time-timer');
        if (realTimeTimer) {
            realTimeTimer.remove();
        }

        // עצירת טיימר בזמן אמת אם פועל
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }

        // ניקוי פונקציות טיימר
        if (this.stopRealTimeTimer) {
            this.stopRealTimeTimer();
        }
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
                restartBtn.innerHTML = '<i class="fas fa-microphone"></i> הקלט הקלטה חדשה';
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