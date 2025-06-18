/**
 * מודול לטיפול בהצגת תוצאות בממשק - עם תמיכה בהגהה וסיכום AI - תוקן
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

        // מציג את התמלול
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
            document.querySelectorAll('.result-tab-content').forEach(tab => tab.classList.remove('active'));
            
            // הפעלת הטאב המקורי
            originalTab.classList.add('active');
            originalContent.classList.add('active');
        }

        // איפוס תוכן טאבי הגהה וסיכום
        const enhancedResult = document.getElementById('enhanced-result');
        const summaryResult = document.getElementById('summary-result');
        
        if (enhancedResult) {
            enhancedResult.innerHTML = '<div class="processing-message"><i class="fas fa-magic"></i>לחץ על "בצע הגהה" כדי לשפר את הטקסט באמצעות AI</div>';
        }
        
        if (summaryResult) {
            summaryResult.innerHTML = '<div class="processing-message"><i class="fas fa-brain"></i>לחץ על "צור סיכום" כדי לקבל סיכום חכם של הטקסט</div>';
        }
    }

    /**
     * מתחיל תמלול כאשר לוחצים על כפתור "התחל תמלול"
     * פונקציה זו תמולא בקובץ main.js
     */
    onTranscribeClick() {
        // פונקציה זו תמולא בקובץ main.js
    }

    /**
     * עדכון כפתור התחלה מחדש לפי מקור הקובץ
     */
    updateRestartButton() {
        const restartBtn = document.getElementById('new-btn');
        if (!restartBtn || !this.selectedFile?.source) return;

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

    /**
     * שחזור תמלול מההיסטוריה עם גישה מלאה לטאבים
     */
    restoreFromHistoryWithTabs(historyItem) {
        // הסתרת ההיסטוריה
        if (this.transcriptionHistory?.historyContainer) {
            this.transcriptionHistory.historyContainer.style.display = 'none';
        }

        // מעבר לתצוגת התוצאות
        this.uploadContainer.style.display = 'none';
        this.resultContainer.style.display = 'block';
        this.progressContainer.style.display = 'none';

        // עדכון התמלול המקורי
        if (this.transcriptionResult) {
            this.transcriptionResult.value = historyItem.transcription || '';
        }

        // שחזור selectedFile מנתוני ההיסטוריה
        this.selectedFile = {
            name: historyItem.fileName,
            source: historyItem.source,
            size: historyItem.fileSize
        };

        // אתחול מנהל הגהה וסיכום אם עדיין לא קיים
        if (!this.enhancementHandler && window.EnhancementHandler) {
            this.enhancementHandler = new EnhancementHandler(this);
        }

        // שחזור תוכן הגהה אם קיים
        if (historyItem.enhanced) {
            const enhancedResult = document.getElementById('enhanced-result');
            if (enhancedResult) {
                enhancedResult.innerHTML = this.formatTextWithMarkdown(historyItem.enhanced);
            }
            
            // הפעלת טאב הגהה
            const enhancedTab = document.querySelector('[data-result-tab="enhanced"]');
            if (enhancedTab) {
                enhancedTab.style.display = 'flex';
                enhancedTab.classList.remove('disabled');
            }
        }

        // שחזור תוכן סיכום אם קיים
        if (historyItem.summary) {
            const summaryResult = document.getElementById('summary-result');
            if (summaryResult) {
                summaryResult.innerHTML = this.formatTextWithMarkdown(historyItem.summary);
            }
            
            // הפעלת טאב סיכום
            const summaryTab = document.querySelector('[data-result-tab="summary"]');
            if (summaryTab) {
                summaryTab.style.display = 'flex';
                summaryTab.classList.remove('disabled');
            }
        }

        // איפוס לטאב המקורי
        const originalTab = document.querySelector('[data-result-tab="original"]');
        const originalContent = document.getElementById('original-content');
        
        if (originalTab && originalContent) {
            // הסרת active מכל הטאבים
            document.querySelectorAll('.result-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.result-tab-content').forEach(tab => tab.classList.remove('active'));
            
            // הפעלת הטאב המקורי
            originalTab.classList.add('active');
            originalContent.classList.add('active');
        }

        // עדכון כפתור הפעולה
        this.updateRestartButton();

        // הוספת פונקציונליות העתקה
        this.bindCopyFunctionality();

        // הצגת הודעה על זמינות טאבים
        this.showTabsAvailability(historyItem);

        // גלילה לתוצאות
        this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * פורמט טקסט עם Markdown (העתקה מ-EnhancementHandler)
     */
    formatTextWithMarkdown(text) {
        if (!text) return '';

        return text
            // כותרות משנה
            .replace(/^## (.+)$/gm, '<h3 class="section-title">$1</h3>')
            .replace(/^# (.+)$/gm, '<h2 class="main-title">$1</h2>')
            
            // טקסט מודגש
            .replace(/\*\*(.+?)\*\*/g, '<strong class="highlight">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            
            // רשימות
            .replace(/^• (.+)$/gm, '<li class="bullet-item">$1</li>')
            .replace(/^- (.+)$/gm, '<li class="bullet-item">$1</li>')
            
            // שורות ריקות לפסקאות
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            
            // קווים מפרידים
            .replace(/^---$/gm, '<hr class="section-divider">')
            
            // ניקוי HTML שבור
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[23])/g, '$1')
            .replace(/(<\/h[23]>)<\/p>/g, '$1');
    }

    /**
     * הצגת זמינות טאבים
     */
    showTabsAvailability(historyItem) {
        const hasEnhanced = !!(historyItem.enhanced);
        const hasSummary = !!(historyItem.summary);
        
        if (!hasEnhanced || !hasSummary) {
            let message = 'תמלול זה נטען מההיסטוריה. ';
            const missing = [];
            
            if (!hasEnhanced) missing.push('הגהה חכמה');
            if (!hasSummary) missing.push('סיכום AI');
            
            if (missing.length > 0) {
                message += `ניתן ליצור: ${missing.join(' ו')} לתמלול זה.`;
                this.showTemporaryNotification(message, 'info', 5000);
            }
        }
    }

    /**
     * הצגת הודעה זמנית
     */
    showTemporaryNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `temp-notification temp-notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'info' ? '#17a2b8' : '#28a745'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1500;
            max-width: 300px;
            font-size: 14px;
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * שחזור מההיסטוריה (תמיכה לאחור)
     */
    restoreFromHistory(historyItem) {
        this.restoreFromHistoryWithTabs(historyItem);
    }
}

// ייצוא המחלקה
window.UIResultsDisplay = UIResultsDisplay;