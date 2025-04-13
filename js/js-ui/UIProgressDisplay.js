/**
 * מודול לטיפול בתצוגת התקדמות בממשק
 * מרחיב את מחלקת UIAPIManagement
 */
class UIProgressDisplay extends UIAPIManagement {
    /**
     * עדכון פס ההתקדמות
     * @param {Object} progressData - נתוני ההתקדמות
     */
    updateProgress(progressData) {
        this.progressBar.style.width = progressData.progress + '%';
        this.progressText.textContent = Math.round(progressData.progress) + '%';

        // עדכון הודעת הסטטוס
        switch (progressData.status) {
            case 'decoding':
                this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> מפענח את קובץ האודיו...';
                break;
            case 'splitting':
                if (progressData.totalSegments > 1) {
                    this.progressStatus.innerHTML = `<i class="fas fa-cut"></i> מפצל את האודיו לקטעים (${progressData.currentSegment || 0}/${progressData.totalSegments})...`;
                } else {
                    this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> מכין את האודיו לתמלול...';
                }
                break;
            case 'transcribing':
                this.progressStatus.innerHTML = `<i class="fas fa-microphone"></i> מתמלל (קטע ${progressData.completedSegments || 1}/${progressData.totalSegments || 1})...`;
                break;
            case 'complete':
                this.progressStatus.innerHTML = '<i class="fas fa-check-circle"></i> הושלם!';
                break;
            case 'error':
                this.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> אירעה שגיאה: ' + (progressData.error || 'שגיאה לא מוכרת');
                break;
            case 'processing':
                this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> ' + (progressData.message || 'מעבד...');
                break;
        }

        // אם התקדמות מלאה, הצג אפקט של סיום
        if (progressData.progress >= 100) {
            this.progressBar.style.transition = 'all 0.3s';
            this.progressBar.style.boxShadow = '0 0 15px rgba(55, 178, 77, 0.7)';
        }
    }

    /**
 * מעדכן את הזמן המשוער לתמלול
 * @param {number} numSegments - מספר חלקי האודיו
 */
    updateEstimatedTime(numSegments) {
        if (!this.timeEstimate) return;

        const secondsPerSegment = 5;
        const estimatedSeconds = numSegments * secondsPerSegment;

        let estimatedTime;
        if (estimatedSeconds < 60) {
            estimatedTime = `${estimatedSeconds} שניות`;
        } else {
            const minutes = Math.floor(estimatedSeconds / 60);
            const seconds = estimatedSeconds % 60;
            estimatedTime = `${minutes} דקות${seconds ? ` ו-${seconds} שניות` : ''}`;
        }

        this.timeEstimate.textContent = estimatedTime;

        if (this.estimatedTimeContainer) {
            this.estimatedTimeContainer.style.display = 'block';
        }
    }

}

// ייצוא המחלקה
window.UIProgressDisplay = UIProgressDisplay;