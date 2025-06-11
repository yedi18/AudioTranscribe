/**
 * מודול לטיפול בהצגת תוצאות בממשק - עם תמיכה בהגהה וסיכום AI
 */
class UIResultsDisplay extends UIProgressDisplay {
    constructor() {
        super();
        this.enhancementHandler = null;
    }

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

        // אתחול מנהל הגהה וסיכום אם עדיין לא קיים
        if (!this.enhancementHandler && window.EnhancementHandler) {
            this.enhancementHandler = new EnhancementHandler(this);
        }

        this.updateRestartButton();

        // גלילה אל התוצאות
        this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // הסתרת כרטיס הטיפים
        if (this.tipsCard) {
            this.tipsCard.style.display = 'none';
        }

        // הצגת התוצאות עם אפקט כניסה
        this.resultContainer.style.animation = 'fadeIn 0.5s';

        // הוספת פונקציונליות העתקה לטאבים שונים
        this.bindCopyFunctionality();
    }

    /**
     * קישור פונקציונליות העתקה לטאבים השונים
     */
    bindCopyFunctionality() {
        const copyBtn = document.getElementById('copy-btn');
        if (!copyBtn) return;

        // הסרת מאזינים קיימים
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

        newCopyBtn.addEventListener('click', () => {
            // קביעת איזה טאב פעיל
            const activeTab = document.querySelector('.result-tab-btn.active');
            if (!activeTab) return;

            const tabType = activeTab.getAttribute('data-result-tab');
            let textToCopy = '';

            switch (tabType) {
                case 'original':
                    const transcriptionResult = document.getElementById('transcription-result');
                    textToCopy = transcriptionResult ? transcriptionResult.value : '';
                    break;

                case 'enhanced':
                    const enhancedResult = document.getElementById('enhanced-result');
                    textToCopy = enhancedResult ? this.extractTextFromHTML(enhancedResult.innerHTML) : '';
                    break;

                case 'summary':
                    const summaryResult = document.getElementById('summary-result');
                    textToCopy = summaryResult ? this.extractTextFromHTML(summaryResult.innerHTML) : '';
                    break;
            }

            if (textToCopy) {
                // העתקה ללוח
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // אנימציה להודעת העתקה
                    const originalText = newCopyBtn.innerHTML;
                    newCopyBtn.innerHTML = '<i class="fas fa-check"></i> הועתק!';
                    newCopyBtn.style.background = '#28a745';

                    setTimeout(() => {
                        newCopyBtn.innerHTML = originalText;
                        newCopyBtn.style.background = '';
                    }, 2000);
                }).catch(err => {
                    console.error('שגיאה בהעתקה:', err);
                    alert('שגיאה בהעתקת הטקסט');
                });
            } else {
                alert('אין תוכן להעתקה');
            }
        });
    }

    /**
     * חילוץ טקסט מ-HTML
     */
    extractTextFromHTML(html) {
        if (!html) return '';
        
        // יצירת אלמנט זמני לחילוץ הטקסט
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // חילוץ טקסט עם שמירה על מבנה
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    /**
     * איפוס הממשק כולל הסרת כל הטיימרים והאלמנטים של AI
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

        // איפוס מנהל הגהה וסיכום
        if (this.enhancementHandler) {
            this.enhancementHandler.resetState();
        }

        // איפוס טאבי התוצאות למקורי
        const originalTab = document.querySelector('[data-result-tab="original"]');
        const originalContent = document.getElementById('original-content');
        
        if (originalTab && originalContent) {
            // הסרת active מכל הטאבים
            document.querySelectorAll('.result-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.result-tab-content').forEach(content => content.classList.remove('active'));
            
            // הפעלת הטאב המקורי
            originalTab.classList.add('active');
            originalContent.classList.add('active');
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