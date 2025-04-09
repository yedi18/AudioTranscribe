/**
 * מודול לטיפול בפעולות על קבצים בממשק
 * מרחיב את מחלקת UIHandlers
 */
class UIFileOperations extends UIHandlers {
    /**
     * טיפול בבחירת קובץ
     * @param {FileList} files - רשימת הקבצים שנבחרו
     */
    handleFileSelect(files) {
        if (files.length > 0) {
            this.selectedFile = files[0];

            // בדיקה אם הקובץ הוא mp3
            if (!this.selectedFile.type.includes('mp3') &&
                !this.selectedFile.name.toLowerCase().endsWith('.mp3')) {
                this.showError('נא להעלות קובץ MP3 בלבד. פורמטים אחרים אינם נתמכים כרגע.');
                return;
            }

            this.fileName.textContent = this.selectedFile.name;
            this.fileSize.textContent = `גודל: ${this.formatFileSize(this.selectedFile.size)}`;

            // הצגת אזור מידע הקובץ עם אנימציה
            this.fileInfo.style.display = 'block';

            // גלילה עדינה למטה כדי להראות את האפשרויות
            setTimeout(() => {
                this.fileInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.transcribeBtn.focus();
            }, 300);

            this.errorMessage.style.display = 'none';

            // הצג טיפים רלוונטיים
            if (this.tipsCard) {
                this.tipsCard.style.display = 'block';
            }

            // בדיקת אורך הקובץ ועדכון הזמן המשוער
            this.checkFileDurationAndUpdateEstimate();
        }
    }

    /**
     * בדיקת משך הקובץ ועדכון הזמן המשוער
     */
    checkFileDurationAndUpdateEstimate() {
        if (typeof getAudioDuration === 'function') {
            // השתמש בפונקציה הגלובלית
            getAudioDuration(this.selectedFile).then(duration => {
                this.updateEstimatedTime(duration);
            }).catch(error => {
                console.error('שגיאה בקריאת אורך הקובץ:', error);
                this.updateEstimatedTime(60); // הערכה ברירת מחדל של דקה
            });
        } else if (typeof AudioSplitter !== 'undefined' && typeof AudioSplitter.getAudioDuration === 'function') {
            // השתמש בפונקציה מתוך מחלקת AudioSplitter
            AudioSplitter.getAudioDuration(this.selectedFile).then(duration => {
                this.updateEstimatedTime(duration);
            }).catch(error => {
                console.error('שגיאה בקריאת אורך הקובץ:', error);
                this.updateEstimatedTime(60);
            });
        } else {
            // אם הפונקציה לא קיימת, השתמש בהערכה ברירת מחדל
            console.error('פונקציית getAudioDuration לא נמצאה');
            this.updateEstimatedTime(60);
        }
    }

    /**
     * פורמט של גודל קובץ
     * @param {number} bytes - גודל בבייטים
     * @returns {string} - גודל מפורמט (B/KB/MB)
     */
    formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
    }

    /**
     * הורדת התמלול בפורמט הנבחר
     * @param {string} format - פורמט הקובץ (txt, srt, word)
     */
    downloadTranscription(format = 'txt') {
        // מציאת הטאב הפעיל
        const activeResultTab = document.querySelector('.result-tab-btn.active');
        if (!activeResultTab) return;

        const tabType = activeResultTab.getAttribute('data-result-tab');

        // בחירת תיבת הטקסט המתאימה
        let textArea;
        switch (tabType) {
            case 'original':
                textArea = document.getElementById('transcription-result');
                break;
            case 'enhanced':
                textArea = document.getElementById('enhanced-result');
                break;
            case 'summary':
                textArea = document.getElementById('summary-result');
                break;
            default:
                return;
        }

        if (!textArea) return;

        const text = textArea.value.trim();
        if (!text) return;

        let blob, fileName;

        // שמות התאמה לסוגי הטאבים
        const tabNames = {
            'original': 'תמלול_מקורי',
            'enhanced': 'הגהה_חכמה',
            'summary': 'סיכום_AI'
        };

        const tabSuffix = tabNames[tabType] || 'תמלול';

        switch (format) {
            case 'srt':
                const srtContent = this.convertToSRT(text);
                blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
                break;

            case 'word':
                const htmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:w="urn:schemas-microsoft-com:office:word" 
                xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <title>${tabSuffix}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; direction: rtl; }
                    p { line-height: 1.6; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <h1>${tabSuffix}</h1>
                ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
            </body>
            </html>
            `;
                blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
                break;

            case 'txt':
            default:
                blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                break;
        }

        // יצירת שם קובץ
        fileName = this.selectedFile ?
            this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_${tabSuffix}.${format}` :
            `${tabSuffix}.${format}`;

        // יצירת קישור להורדה
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;

        // הפעלת ההורדה
        document.body.appendChild(link);
        link.click();

        // הצגת אישור הורדה
        const originalText = this.downloadDropdownBtn.innerHTML;
        this.downloadDropdownBtn.innerHTML = '<i class="fas fa-check"></i> הקובץ הורד!';

        setTimeout(() => {
            this.downloadDropdownBtn.innerHTML = originalText;
            document.body.removeChild(link);
        }, 2000);
    }

    /**
     * המרת טקסט לפורמט SRT
     * @param {string} text - הטקסט להמרה
     * @returns {string} - טקסט בפורמט SRT
     */
    convertToSRT(text) {
        // פיצול הטקסט לשורות
        const lines = text.split('\n');
        let srtContent = '';

        // כל שורה תהיה תת-כתובת נפרדת
        lines.forEach((line, index) => {
            if (line.trim()) {
                const startTime = index * 5; // 5 שניות לכל שורה
                const endTime = (index + 1) * 5;

                srtContent += `${index + 1}\n`;
                srtContent += `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n`;
                srtContent += `${line}\n\n`;
            }
        });

        return srtContent;
    }

    /**
     * פורמט זמן לפורמט SRT
     * @param {number} seconds - זמן בשניות
     * @returns {string} - זמן בפורמט SRT
     */
    formatSRTTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);

        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');
        const ms = date.getUTCMilliseconds().toString().padStart(3, '0');

        return `${hours}:${minutes}:${secs},${ms}`;
    }
}

// ייצוא המחלקה
window.UIFileOperations = UIFileOperations;