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
                // בדיקה אם יש החלפת ספק שצריך לדווח עליה
                if (progressData.providerSwitched && progressData.newProvider) {
                    const newProviderName = progressData.newProvider === 'groq' ? 'Groq' : 'Huggingface';
                    this.progressStatus.innerHTML = `<i class="fas fa-exchange-alt"></i> מעבר לספק ${newProviderName} (בגלל מגבלת שימוש)...`;
                } else {
                    this.progressStatus.innerHTML = `<i class="fas fa-microphone"></i> מתמלל (קטע ${progressData.completedSegments || 1}/${progressData.totalSegments || 1})...`;
                }
                break;
            case 'complete':
                this.progressStatus.innerHTML = '<i class="fas fa-check-circle"></i> הושלם!';
                break;
            case 'error':
                // בדיקה אם השגיאה היא שגיאת מגבלת קצב
                if (progressData.error && (
                    progressData.error.includes('rate_limit_exceeded') ||
                    progressData.error.includes('Rate limit')
                )) {
                    this.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> הגעת למגבלת שימוש. מנסה ספק אחר...';
                } else {
                    this.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> אירעה שגיאה: ' + (progressData.error || 'שגיאה לא מוכרת');
                }
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
    updateEstimatedTime(durationInSeconds) {
        if (!this.timeEstimate) return;

        const segmentLength = 25;
        const secondsPerSegment = 5;

        const numSegments = Math.ceil(durationInSeconds / segmentLength);
        const estimatedSeconds = numSegments * secondsPerSegment;

        let displayText;
        if (estimatedSeconds < 60) {
            displayText = `${Math.round(estimatedSeconds)} שניות`;
        } else {
            const minutes = Math.floor(estimatedSeconds / 60);
            const seconds = Math.round(estimatedSeconds % 60);
            displayText = `${minutes} דקות ו-${seconds} שניות`;
        }

        this.timeEstimate.textContent = displayText;
    }


}

// ייצוא המחלקה
window.UIProgressDisplay = UIProgressDisplay;