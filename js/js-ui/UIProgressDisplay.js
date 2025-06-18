/**
 * מודול לטיפול בתצוגת התקדמות בממשק - עם הערכת זמן ועלות מעודכנת
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
            case 'processing':
                this.progressStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> ' + (progressData.message || 'מעבד...');
                break;
            case 'splitting':
                this.progressStatus.innerHTML = '<i class="fas fa-cut fa-spin"></i> ' + (progressData.message || 'מחלק קובץ לחלקים קטנים...');
                break;
            case 'transcribing':
                if (progressData.totalChunks && progressData.totalChunks > 1) {
                    this.progressStatus.innerHTML = `<i class="fas fa-microphone"></i> ${progressData.message || `מתמלל חלק ${progressData.currentChunk || 1} מתוך ${progressData.totalChunks}...`}`;
                } else {
                    this.progressStatus.innerHTML = '<i class="fas fa-microphone"></i> ' + (progressData.message || 'שולח לOpenAI Whisper לתמלול...');
                }
                break;
            case 'complete':
                this.progressStatus.innerHTML = '<i class="fas fa-check-circle"></i> הושלם!';
                break;
            case 'error':
                this.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> אירעה שגיאה: ' + (progressData.error || 'שגיאה לא מוכרת');
                break;
        }

        // אם התקדמות מלאה, הצג אפקט של סיום
        if (progressData.progress >= 100) {
            this.progressBar.style.transition = 'all 0.3s';
            this.progressBar.style.boxShadow = '0 0 15px rgba(55, 178, 77, 0.7)';
        }
    }

    /**
     * מעדכן את הזמן והעלות המשוערים לתמלול בהתבסס על הנתונים החדשים
     * @param {number} durationInSeconds - אורך האודיו בשניות (לא בשימוש כרגע)
     */
    updateEstimatedTime(durationInSeconds) {
        if (!this.timeEstimate || !this.selectedFile) return;

        const fileSizeMB = this.selectedFile.size / (1024 * 1024);
        
        // חישוב זמן תמלול בהתבסס על הנתונים שלך:
        // 30MB = 6 דקות (360 שניות)
        // 20MB = 4.5 דקות (270 שניות)
        // זה נותן לנו קצב של בערך 12 שניות לכל MB
        
        let estimatedSeconds;
        
        if (fileSizeMB <= 5) {
            // קבצים קטנים - מהירים יותר
            estimatedSeconds = Math.max(30, fileSizeMB * 8);
        } else if (fileSizeMB <= 15) {
            // קבצים בינוניים
            estimatedSeconds = fileSizeMB * 10;
        } else if (fileSizeMB <= 25) {
            // קבצים גדולים
            estimatedSeconds = fileSizeMB * 12;
        } else {
            // קבצים מאוד גדולים - הזמן גדל מעט יותר
            estimatedSeconds = fileSizeMB * 14;
        }

        // חישוב עלות משוערת
        // OpenAI Whisper: $0.006 לדקה
        const estimatedMinutes = estimatedSeconds / 60;
        const costUSD = estimatedMinutes * 0.006;
        const costILS = costUSD * 3.7; // שער דולר משוער

        // פורמט התצוגה - בדיקה שהעלות לא 0
        const timeText = this.formatTimeEstimate(estimatedSeconds);
        let costText;
        
        if (costUSD < 0.001) {
            costText = 'פחות מ-0.01 ₪';
        } else {
            costText = `${costUSD.toFixed(3)} (${costILS.toFixed(2)} ₪)`;
        }

        // עדכון התצוגה
        this.timeEstimate.innerHTML = `
            <strong>${timeText}</strong> | 
            עלות משוערת: <strong>${costText}</strong>
        `;
        
        // הוספת מידע נוסף בכלי עזרה
        this.timeEstimate.title = `הערכה: ${fileSizeMB.toFixed(1)}MB | זמן: ${timeText} | עלות: ${costText}`;
    }

    /**
     * פורמט זמן להצגה
     * @param {number} seconds - זמן בשניות
     * @returns {string} - זמן מפורמט
     */
    formatTimeEstimate(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)} שניות`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            if (remainingSeconds === 0) {
                return `${minutes} דקות`;
            } else if (remainingSeconds < 30) {
                return `${minutes}-${minutes + 1} דקות`;
            } else {
                return `${minutes + 1} דקות`;
            }
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} שעות${minutes > 0 ? ` ו-${minutes} דקות` : ''}`;
        }
    }
}

// ייצוא המחלקה
window.UIProgressDisplay = UIProgressDisplay;