/**
 * מודול לניהול היסטוריית תמלולים - מעודכן עם כפתורים מסודרים מחדש
 */
class TranscriptionHistory {
    constructor() {
        this.maxHistoryItems = 10;
        this.storageKey = 'transcription_history';

        // אלמנטים ישנים (עדיין נדרשים לתמיכה לאחור)
        this.historyToggleBtn = document.getElementById('history-toggle-btn');
        this.historyContainer = document.getElementById('transcription-history');
        this.historyList = document.getElementById('history-list');

        // אלמנטים חדשים של הpopup
        this.viewRecentBtn = document.getElementById('view-recent-transcriptions-btn');
        this.recentPopup = document.getElementById('recent-transcriptions-popup');
        this.closeRecentBtn = document.getElementById('close-transcriptions-popup');
        this.recentList = document.getElementById('recent-transcriptions-list');
        this.clearAllBtn = document.getElementById('clear-all-transcriptions');

        this.isExpanded = false;

        this.loadHistory();
        this.bindEvents();
        this.updateDisplay();
    }

    /**
     * קישור אירועים
     */
    bindEvents() {
        // אירועים ישנים
        if (this.historyToggleBtn) {
            this.historyToggleBtn.addEventListener('click', () => {
                this.toggleHistory();
            });
        }

        // אירועים חדשים של הpopup
        if (this.viewRecentBtn) {
            this.viewRecentBtn.addEventListener('click', () => {
                this.showRecentPopup();
            });
        }

        if (this.closeRecentBtn) {
            this.closeRecentBtn.addEventListener('click', () => {
                this.hideRecentPopup();
            });
        }

        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => {
                this.clearAllHistory();
            });
        }

        // סגירה בלחיצה מחוץ לpopup
        if (this.recentPopup) {
            this.recentPopup.addEventListener('click', (e) => {
                if (e.target === this.recentPopup) {
                    this.hideRecentPopup();
                }
            });
        }

        // סגירה בלחיצה על Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.recentPopup && this.recentPopup.style.display === 'flex') {
                this.hideRecentPopup();
            }
        });
    }

    /**
     * הצגת popup התמלולים האחרונים
     */
    showRecentPopup() {
        if (this.recentPopup) {
            this.recentPopup.style.display = 'flex';
            this.loadRecentTranscriptions();
        }
    }

    /**
     * הסתרת popup התמלולים האחרונים
     */
    hideRecentPopup() {
        if (this.recentPopup) {
            this.recentPopup.style.display = 'none';
        }
    }

    /**
     * טעינת תמלולים אחרונים לpopup
     */
    loadRecentTranscriptions() {
        if (!this.recentList) return;

        if (this.history.length === 0) {
            this.recentList.innerHTML = '<div class="no-transcriptions">אין תמלולים שמורים</div>';
            return;
        }

        this.recentList.innerHTML = this.history.map(item => this.createRecentTranscriptionItem(item)).join('');
    }

createRecentTranscriptionItem(item) {
    const date = new Date(item.timestamp);
    const timeText = this.formatTime(date);
    const preview = this.createPreview(item.transcription);
    const sourceIcon = this.getSourceIcon(item.source);
    const sizeText = this.formatFileSize(item.fileSize);

    return `
        <div class="transcription-list-item" data-id="${item.id}">
            <div class="item-header">
                <span class="item-name">
                    <i class="${sourceIcon}"></i> ${item.fileName}
                </span>
                <span class="item-time">${timeText} | ${sizeText}</span>
            </div>
            <div class="item-preview">${preview}</div>
            <div class="item-actions">
                <button class="action-btn view-btn" onclick="window.transcriptionHistory.viewTranscription('${item.id}')">
                    <i class="fas fa-eye"></i> צפה
                </button>
                <button class="action-btn delete-btn" onclick="window.transcriptionHistory.deleteTranscription('${item.id}')">
                    <i class="fas fa-trash"></i> מחק
                </button>
                <div class="more-options-dropdown">
                    <button class="action-btn more-options-btn" onclick="window.transcriptionHistory.toggleMoreOptions('${item.id}')">
                        <i class="fas fa-ellipsis-h"></i> אפשרויות נוספות
                    </button>
                    <div class="more-options-menu" id="more-options-menu-${item.id}" style="display: none;">
                        <button class="dropdown-item" onclick="window.transcriptionHistory.copyTranscription('${item.id}')">
                            <i class="fas fa-copy"></i> העתק טקסט
                        </button>
                        <button class="dropdown-item" onclick="window.transcriptionHistory.downloadTranscriptionFormat('${item.id}', 'txt')">
                            <i class="fas fa-file-alt"></i> הורד טקסט (TXT)
                        </button>
                        <button class="dropdown-item" onclick="window.transcriptionHistory.downloadTranscriptionFormat('${item.id}', 'srt')">
                            <i class="fas fa-closed-captioning"></i> הורד כתוביות (SRT)
                        </button>
                        <button class="dropdown-item" onclick="window.transcriptionHistory.downloadTranscriptionFormat('${item.id}', 'word')">
                            <i class="fas fa-file-word"></i> הורד Word (DOC)
                        </button>
                        <button class="dropdown-item" onclick="window.transcriptionHistory.downloadTranscriptionFormat('${item.id}', 'pdf')">
                            <i class="fas fa-file-pdf"></i> הורד PDF
                        </button>
                        ${item.audioBlob ? `
                            <button class="dropdown-item" onclick="window.transcriptionHistory.downloadTranscriptionFormat('${item.id}', 'mp3')">
                                <i class="fas fa-music"></i> הורד אודיו (MP3)
                            </button>
                            <button class="dropdown-item" onclick="window.transcriptionHistory.downloadTranscriptionFormat('${item.id}', 'wav')">
                                <i class="fas fa-volume-up"></i> הורד אודיו (WAV)
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}
    /**
     * הצגת/הסתרת תפריט אפשרויות נוספות
     */
    toggleMoreOptions(id) {
        const menu = document.getElementById(`more-options-menu-${id}`);
        if (menu) {
            const isVisible = menu.style.display !== 'none';

            // סגירת כל התפריטים האחרים
            document.querySelectorAll('.more-options-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });

            menu.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * צפייה בתמלול מהpopup
     */
    viewTranscription(id) {
        const item = this.getItem(id);
        if (item && window.ui) {
            this.hideRecentPopup();
            window.ui.restoreFromHistoryWithTabs(item);
        }
    }

    /**
     * העתקת תמלול מהpopup
     */
    copyTranscription(id) {
        const item = this.getItem(id);
        if (item && item.transcription) {
            navigator.clipboard.writeText(item.transcription).then(() => {
                this.showTemporaryMessage('התמלול הועתק ללוח!', 'success');
            }).catch(() => {
                this.showTemporaryMessage('שגיאה בהעתקה', 'error');
            });
        }
    }

    /**
     * הורדת תמלול בפורמט מסוים
     */
    downloadTranscriptionFormat(id, format) {
        const item = this.getItem(id);
        if (!item || !item.transcription) {
            this.showTemporaryMessage('לא נמצא תמלול להורדה', 'error');
            return;
        }

        let blob, fileName, mimeType;
        const baseName = item.fileName.replace(/\.[^/.]+$/, '');

        switch (format) {
            case 'txt':
                blob = new Blob([item.transcription], { type: 'text/plain;charset=utf-8' });
                fileName = `${baseName}_תמלול.txt`;
                break;

            case 'word':
                const wordContent = this.createWordDocument(item.transcription, item.fileName);
                blob = new Blob([wordContent], { type: 'application/msword;charset=utf-8' });
                fileName = `${baseName}_תמלול.doc`;
                break;

            case 'srt':
                const srtContent = this.createSRTContent(item.transcription);
                blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
                fileName = `${baseName}_תמלול.srt`;
                break;

            case 'pdf':
                this.createPDFContent(item.transcription, baseName);
                return;

            case 'mp3':
            case 'wav':
                // אם יש קובץ אודיו מקורי שמור
                if (item.audioBlob) {
                    blob = item.audioBlob;
                    fileName = `${baseName}.${format}`;
                } else {
                    this.showTemporaryMessage('קובץ האודיו המקורי לא זמין', 'error');
                    return;
                }
                break;

            default:
                this.showTemporaryMessage('פורמט לא נתמך', 'error');
                return;
        }

        // יצירת קישור להורדה
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showTemporaryMessage(`הקובץ ${fileName} הורד בהצלחה`, 'success');

        // סגירת התפריט
        const menu = document.getElementById(`more-options-menu-${id}`);
        if (menu) menu.style.display = 'none';
    }

    /**
     * יצירת מסמך Word
     */
    createWordDocument(text, fileName) {
        return `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:w="urn:schemas-microsoft-com:office:word" 
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <title>תמלול - ${fileName}</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        direction: rtl; 
                        line-height: 1.6;
                        margin: 40px;
                        color: #333;
                    }
                    h1 { 
                        color: #007bff; 
                        border-bottom: 2px solid #007bff; 
                        padding-bottom: 10px; 
                        margin-bottom: 30px;
                    }
                    p { 
                        line-height: 1.8; 
                        margin-bottom: 15px; 
                        text-align: justify;
                        font-size: 14px;
                    }
                    .timestamp {
                        color: #666;
                        font-size: 12px;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <h1>תמלול - ${fileName}</h1>
                <div class="timestamp">תאריך יצירה: ${new Date().toLocaleDateString('he-IL')}</div>
                <div>
                    ${text.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
                </div>
            </body>
            </html>
        `;
    }

    /**
     * יצירת תוכן SRT
     */
    createSRTContent(text) {
        const lines = text.split('\n').filter(line => line.trim());
        let srtContent = '';

        lines.forEach((line, index) => {
            if (line.trim()) {
                const startTime = index * 3; // 3 שניות לכל שורה
                const endTime = (index + 1) * 3;

                srtContent += `${index + 1}\n`;
                srtContent += `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n`;
                srtContent += `${line}\n\n`;
            }
        });

        return srtContent;
    }

    /**
     * פורמט זמן SRT
     */
    formatSRTTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);

        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');

        return `${hours}:${minutes}:${secs},000`;
    }

    /**
     * יצירת PDF (פשוט עם HTML לדפדפן)
     */
    createPDFContent(text, baseName) {
        const printWindow = window.open('', '_blank');
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>תמלול - ${baseName}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        direction: rtl; 
                        margin: 40px;
                        line-height: 1.6;
                        color: #333;
                    }
                    h1 { 
                        color: #007bff; 
                        border-bottom: 2px solid #007bff; 
                        padding-bottom: 10px; 
                    }
                    p { 
                        margin-bottom: 15px; 
                        text-align: justify;
                    }
                    @media print {
                        body { margin: 20px; }
                    }
                </style>
            </head>
            <body>
                <h1>תמלול - ${baseName}</h1>
                <p><strong>תאריך יצירה:</strong> ${new Date().toLocaleDateString('he-IL')}</p>
                ${text.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        this.showTemporaryMessage('חלון הדפסה נפתח - שמור כ-PDF', 'info');
    }

    /**
     * מחיקת תמלול מהpopup
     */
    deleteTranscription(id) {
        if (confirm('האם אתה בטוח שברצונך למחוק את התמלול הזה?')) {
            this.deleteItem(id);
            this.loadRecentTranscriptions();
            this.updateDisplay();
            this.showTemporaryMessage('התמלול נמחק', 'success');
        }
    }

    /**
     * מחיקת כל ההיסטוריה
     */
    clearAllHistory() {
        if (confirm('האם אתה בטוח שברצונך למחוק את כל התמלולים השמורים?')) {
            this.clearHistory();
            this.loadRecentTranscriptions();
            this.showTemporaryMessage('כל התמלולים נמחקו', 'success');
        }
    }

    /**
     * הצגת הודעה זמנית
     */
    showTemporaryMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `temp-message temp-message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideDown 0.3s ease-out;
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * מתג הצגת/הסתרת ההיסטוריה (פונקציה ישנה לתמיכה לאחור)
     */
    toggleHistory() {
        this.isExpanded = !this.isExpanded;

        if (this.historyContainer) {
            if (this.isExpanded) {
                this.historyContainer.classList.remove('collapsed');
                this.historyContainer.classList.add('expanded');
            } else {
                this.historyContainer.classList.remove('expanded');
                this.historyContainer.classList.add('collapsed');
            }
        }

        if (this.historyToggleBtn) {
            if (this.isExpanded) {
                this.historyToggleBtn.classList.add('expanded');
            } else {
                this.historyToggleBtn.classList.remove('expanded');
            }
        }
    }

    /**
     * טעינת היסטוריה מ-localStorage
     */
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.history = stored ? JSON.parse(stored) : [];
        } catch (error) {
            this.history = [];
        }
    }

    /**
     * שמירת היסטוריה ל-localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        } catch (error) {
            this.history = this.history.slice(0, 5);
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.history));
            } catch (e) {
                this.history = [];
            }
        }
    }

    /**
     * הוספת תמלול חדש להיסטוריה
     * @param {Object} transcriptionData - נתוני התמלול
     */
    addTranscription(transcriptionData) {
        const historyItem = {
            id: Date.now().toString(),
            fileName: transcriptionData.fileName || 'קובץ לא ידוע',
            source: transcriptionData.source || 'upload',
            transcription: transcriptionData.transcription || '',
            enhanced: transcriptionData.enhanced || '',
            summary: transcriptionData.summary || '',
            timestamp: new Date().toISOString(),
            fileSize: transcriptionData.fileSize || 0,
            audioBlob: transcriptionData.audioBlob || null
        };

        this.history.unshift(historyItem);

        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }

        this.saveHistory();
        this.updateDisplay();
    }

    /**
     * מחיקת פריט מההיסטוריה
     * @param {string} id - מזהה הפריט למחיקה
     */
    deleteItem(id) {
        this.history = this.history.filter(item => item.id !== id);
        this.saveHistory();
        this.updateDisplay();
    }

    /**
     * שחזור תמלול מההיסטוריה (פונקציה ישנה)
     * @param {string} id - מזהה הפריט לשחזור
     */
    restoreTranscription(id) {
        const item = this.history.find(h => h.id === id);
        if (!item) return;

        this.isExpanded = false;
        if (this.historyContainer) {
            this.historyContainer.classList.remove('expanded');
            this.historyContainer.classList.add('collapsed');
        }
        if (this.historyToggleBtn) {
            this.historyToggleBtn.classList.remove('expanded');
        }

        if (window.ui && typeof window.ui.restoreFromHistory === 'function') {
            window.ui.restoreFromHistory(item);
        }
    }

    /**
     * עדכון תצוגת ההיסטוריה
     */
    updateDisplay() {
        // עדכון הכפתור הישן
        if (this.historyToggleBtn && this.historyList) {
            if (this.history.length === 0) {
                this.historyToggleBtn.style.display = 'none';
                return;
            }

            this.historyToggleBtn.style.display = 'flex';

            const countText = this.history.length === 1 ? 'תמלול אחד' : `${this.history.length} תמלולים`;
            const spanElement = this.historyToggleBtn.querySelector('span');
            if (spanElement) {
                spanElement.textContent = `תמלולים אחרונים (${countText})`;
            }

            this.historyList.innerHTML = '';
            this.history.forEach(item => {
                const historyElement = this.createHistoryElement(item);
                this.historyList.appendChild(historyElement);
            });
        }

        // עדכון הכפתור החדש
        if (this.viewRecentBtn) {
            const badge = document.getElementById('recent-count');

            if (this.history.length > 0) {
                this.viewRecentBtn.style.display = 'flex';
                if (badge) {
                    badge.textContent = this.history.length;
                    badge.style.display = 'inline-block';
                }
            } else {
                this.viewRecentBtn.style.display = 'none';
                if (badge) {
                    badge.style.display = 'none';
                }
            }
        }
    }

    /**
     * יצירת אלמנט היסטוריה (פונקציה ישנה)
     * @param {Object} item - פריט היסטוריה
     * @returns {HTMLElement} - אלמנט HTML
     */
    createHistoryElement(item) {
        const div = document.createElement('div');
        div.className = 'history-item';

        const date = new Date(item.timestamp);
        const timeText = this.formatTime(date);
        const preview = this.createPreview(item.transcription);
        const sourceIcon = this.getSourceIcon(item.source);
        const sizeText = this.formatFileSize(item.fileSize);

        div.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-name">
                    <i class="${sourceIcon}"></i> ${item.fileName}
                </span>
                <span class="history-item-time">${timeText} | ${sizeText}</span>
            </div>
            <div class="history-item-preview">${preview}</div>
            <div class="history-actions">
                <button class="history-btn restore" data-id="${item.id}">
                    <i class="fas fa-undo"></i> שחזר
                </button>
                <button class="history-btn delete" data-id="${item.id}">
                    <i class="fas fa-trash"></i> מחק
                </button>
            </div>
        `;

        const restoreBtn = div.querySelector('.restore');
        const deleteBtn = div.querySelector('.delete');

        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                this.restoreTranscription(item.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('האם אתה בטוח שברצונך למחוק את התמלול הזה?')) {
                    this.deleteItem(item.id);
                }
            });
        }

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.history-actions')) {
                this.restoreTranscription(item.id);
            }
        });

        return div;
    }

    /**
     * יצירת תצוגה מקדימה של התמלול
     * @param {string} text - טקסט התמלול
     * @returns {string} - תצוגה מקדימה
     */
    createPreview(text) {
        if (!text) return 'אין תמלול זמין';

        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= 150) return cleaned;

        return cleaned.substring(0, 147) + '...';
    }

    /**
     * קבלת אייקון לפי מקור הקובץ
     * @param {string} source - מקור הקובץ
     * @returns {string} - מחלקת CSS לאייקון
     */
    getSourceIcon(source) {
        const icons = {
            upload: 'fas fa-file-audio',
            recording: 'fas fa-microphone',
            youtube: 'fab fa-youtube'
        };
        return icons[source] || 'fas fa-file-audio';
    }

    /**
     * פורמט זמן להצגה
     * @param {Date} date - תאריך
     * @returns {string} - זמן מפורמט
     */
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'עכשיו';
        if (minutes < 60) return `לפני ${minutes} דק'`;
        if (hours < 24) return `לפני ${hours} שע'`;
        if (days < 7) return `לפני ${days} ימים`;

        return date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * פורמט גודל קובץ
     * @param {number} bytes - גודל בבייטים
     * @returns {string} - גודל מפורמט
     */
    formatFileSize(bytes) {
        if (!bytes || bytes < 1024) return `${bytes || 0} B`;

        const mb = bytes / (1024 * 1024);
        if (mb < 1) {
            const kb = bytes / 1024;
            return `${kb.toFixed(1)} KB`;
        }

        return `${mb.toFixed(1)} MB`;
    }

    /**
     * ניקוי היסטוריה מלאה
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.updateDisplay();
    }

    /**
     * קבלת פריט היסטוריה לפי מזהה
     * @param {string} id - מזהה הפריט
     * @returns {Object|null} - פריט ההיסטוריה או null
     */
    getItem(id) {
        return this.history.find(item => item.id === id) || null;
    }
}

// סגירת תפריטי אפשרויות בלחיצה מחוץ
document.addEventListener('click', function (e) {
    if (!e.target.closest('.more-options-dropdown')) {
        document.querySelectorAll('.more-options-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// ייצוא המחלקה והוספה לwindow לגישה גלובלית
window.TranscriptionHistory = TranscriptionHistory;