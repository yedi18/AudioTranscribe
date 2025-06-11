/**
 * מודול לטיפול בתצוגת התקדמות בממשק - עם זמן מוערך מעודכן לפי הנתונים שלך
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
     * מעדכן את הזמן המשוער לתמלול בהתבסס על הנתונים שלך
     * @param {number} durationInSeconds - אורך האודיו בשניות (לא בשימוש כרגע)
     */
    updateEstimatedTime(durationInSeconds) {
        if (!this.timeEstimate || !this.selectedFile) return;

        // הערכת זמן מבוססת הנתונים שלך: 53.9MB לקח 8:28 דקות (508 שניות)
        // זה נותן לנו קצב של כ-0.11MB לשנייה
        const fileSizeMB = this.selectedFile.size / (1024 * 1024);
        
        // נתונים מבוססי הניסיון שלך:
        // קובץ 53.9MB = 508 שניות = 0.106MB לשנייה
        // אבל זה כולל חילוק ל-3 חלקים, אז נתחשב גם בזה
        
        const needsSplitting = fileSizeMB > 24;
        let estimatedSeconds;
        
        if (needsSplitting) {
            // קובץ גדול שיחולק
            const chunks = Math.ceil(fileSizeMB / 24);
            
            // זמן חילוק: כ-10 שניות + 2 שניות לכל MB
            const splittingTime = Math.max(10, fileSizeMB * 2);
            
            // זמן תמלול: בהתבסס על הנתונים שלך - כ-9 שניות לכל MB
            const transcriptionTime = fileSizeMB * 9;
            
            // זמן נוסף לעיבוד מקבילי של חלקים
            const parallelProcessingOverhead = chunks * 5;
            
            estimatedSeconds = splittingTime + transcriptionTime + parallelProcessingOverhead;
        } else {
            // קובץ קטן - מהיר יותר
            if (fileSizeMB <= 5) {
                // קבצים קטנים: כ-15 שניות + 3 שניות לכל MB
                estimatedSeconds = 15 + (fileSizeMB * 3);
            } else if (fileSizeMB <= 15) {
                // קבצים בינוניים: כ-30 שניות + 4 שניות לכל MB
                estimatedSeconds = 30 + (fileSizeMB * 4);
            } else {
                // קבצים גדולים אבל לא מחולקים: כ-45 שניות + 5 שניות לכל MB
                estimatedSeconds = 45 + (fileSizeMB * 5);
            }
        }

        // פורמט התצוגה
        let displayText = this.formatTimeEstimate(estimatedSeconds);

        // הוספת הערה לקבצים גדולים
        if (needsSplitting) {
            const chunks = Math.ceil(fileSizeMB / 24);
            displayText += ` (${chunks} חלקים)`;
        }

        this.timeEstimate.textContent = displayText;
        
        // הוספת מידע נוסף בכלי עזרה
        const speedEstimate = (fileSizeMB / estimatedSeconds).toFixed(2);
        this.timeEstimate.title = `הערכה: ${fileSizeMB.toFixed(1)}MB ב-~${speedEstimate}MB/s`;
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