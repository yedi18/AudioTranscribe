/**
 * מודול לטיפול בפעולות על קבצים בממשק - מעודכן עם בדיקת גודל 24MB
 */
class UIFileOperations extends UIHandlers {
    constructor(ui) {
        super();
        this.ui = ui;
    }

    /**
     * טיפול בבחירת קובץ
     * @param {FileList} files - רשימת הקבצים שנבחרו
     */
    handleFileSelect(files) {
        if (files.length > 0) {
            this.handleNewFile(files[0], 'upload');

            const fileName = this.selectedFile.name.toLowerCase();
            const fileSizeMB = this.selectedFile.size / (1024 * 1024);

            // הסר שגיאה/אזהרה קודמת אם קיימת
            if (this.errorMessage) {
                this.errorMessage.style.display = 'none';
            }

            // מחיקת אזהרות קודמות אם קיימות
            const existingWarnings = document.querySelectorAll('.warning-message, .size-warning-message');
            existingWarnings.forEach(warning => warning.remove());

            // בדיקת גודל הקובץ והצגת אזהרה אם גדול מ-24MB
            if (fileSizeMB > 24) {
                const expectedChunks = AudioSplitter.getExpectedChunks(this.selectedFile);
                const costInfo = AudioSplitter.estimateCost(this.selectedFile);
                const timeInfo = AudioSplitter.estimateTranscriptionTime(this.selectedFile);
                
                const sizeWarningBox = document.createElement('div');
                sizeWarningBox.className = 'size-warning-message';
                sizeWarningBox.style.cssText = `
                    background: #fff3cd;
                    border: 1px solid #ffeb3b;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 15px 0;
                    color: #856404;
                    font-size: 14px;
                `;
                
                sizeWarningBox.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <i class="fas fa-info-circle" style="color: #ff9800; font-size: 18px; margin-top: 2px;"></i>
                        <div>
                            <strong>קובץ גדול מזוהה (${fileSizeMB.toFixed(1)}MB)</strong><br>
                            הקובץ יחולק ל-<strong>${expectedChunks} חלקים</strong> לצורך התמלול<br>
                            <div style="margin-top: 8px; font-size: 13px;">
                                ⏱️ זמן משוער לתמלול: <strong>${timeInfo.displayText}</strong><br>
                                💰 עלות משוערת: <strong>$${costInfo.estimatedCostUSD}</strong> (כ-<strong>${costInfo.estimatedCostILS} ₪</strong>)
                            </div>
                        </div>
                    </div>
                `;

                if (this.fileInfo && this.fileInfo.parentNode) {
                    this.fileInfo.parentNode.appendChild(sizeWarningBox);
                }
            }

            // הצג טיפים רלוונטיים
            if (this.tipsCard) {
                this.tipsCard.style.display = 'block';
            }

            // גלילה עדינה למטה כדי להראות את האפשרויות
            setTimeout(() => {
                this.fileInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.transcribeBtn.focus();
            }, 300);
        }
    }

    /**
     * טיפול בקובץ מכל מקור
     * @param {File} file - קובץ האודיו
     * @param {string} source - מקור הקובץ ('upload', 'recording', 'youtube')
     */
    handleNewFile(file, source) {
        console.log("מתחיל טיפול בקובץ חדש ממקור:", source,
            "שם:", file.name,
            "גודל:", file.size, "bytes",
            "סוג:", file.type);

        try {
            // שמירת הקובץ והמקור
            this.selectedFile = file;
            this.selectedFile.source = source;

            // עדכון פרטי הקובץ בתצוגה
            if (this.fileName) {
                this.fileName.textContent = file.name || (source === 'recording' ? 'הקלטה חדשה' :
                    (source === 'youtube' ? 'אודיו מיוטיוב' : 'קובץ לא מזוהה'));
            } else {
                console.error("אלמנט fileName לא נמצא");
            }

            if (this.fileSize) {
                const sizeText = `גודל: ${this.formatFileSize(file.size)}`;
                const fileSizeMB = file.size / (1024 * 1024);
                
                // הוספת התרעה אם הקובץ גדול
                if (fileSizeMB > 24) {
                    this.fileSize.innerHTML = `${sizeText} <span style="color: #ff9800; font-weight: bold;">(יחולק לחלקים)</span>`;
                } else {
                    this.fileSize.textContent = sizeText;
                }
            } else {
                console.error("אלמנט fileSize לא נמצא");
            }

            // הצגת אזור מידע הקובץ עם אנימציה
            if (this.fileInfo) {
                console.log("מציג fileInfo");
                this.fileInfo.style.display = 'block';
            } else {
                console.error("אלמנט fileInfo לא נמצא");
            }

            if (this.uploadArea) {
                console.log("מסתיר uploadArea");
                this.uploadArea.style.display = 'none';
            } else {
                console.error("אלמנט uploadArea לא נמצא");
            }

            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
            if (this.estimatedTimeContainer) {
                this.estimatedTimeContainer.style.display = 'block';
            }

            // הצגת כפתור הורדה אם מקור הקובץ הוא הקלטה או יוטיוב
            const downloadBtn = document.getElementById('download-source-btn');
            if (downloadBtn) {
                if (source === 'recording' || source === 'youtube') {
                    console.log("מציג כפתור הורדה עבור קובץ ממקור:", source);
                    downloadBtn.href = URL.createObjectURL(file);
                    downloadBtn.download = file.name || 'audio.mp3';
                    downloadBtn.style.display = 'inline-block';
                } else {
                    downloadBtn.style.display = 'none';
                }
            } else {
                console.error("אלמנט download-source-btn לא נמצא");
            }

            this.checkFileDurationAndUpdateEstimate();

            // הסתרת שגיאות קודמות
            if (this.errorMessage) {
                this.errorMessage.style.display = 'none';
            }

            console.log("✅ טיפול בקובץ חדש הושלם בהצלחה");

        } catch (error) {
            console.error("❌ שגיאה בטיפול בקובץ חדש:", error);
            if (this.showError) {
                this.showError('שגיאה בטיפול בקובץ: ' + error.message);
            }
        }
    }

    /**
     * בדיקת משך הקובץ ועדכון הזמן המשוער
     */
    checkFileDurationAndUpdateEstimate() {
        if (typeof getAudioDuration === 'function') {
            getAudioDuration(this.selectedFile).then(duration => {
                this.updateEstimatedTime(duration);
            }).catch(error => {
                console.error('שגיאה בקריאת אורך הקובץ:', error);
                this.updateEstimatedTime(60); // הערכה ברירת מחדל של דקה
            });
        } else {
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
        const textArea = document.getElementById('transcription-result');
        if (!textArea) return;

        const text = textArea.value.trim();
        if (!text) return;

        let blob, fileName;

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
                <title>תמלול</title>
                <style>
                    body { font-family: 'Arial', sans-serif; direction: rtl; }
                    p { line-height: 1.6; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <h1>תמלול</h1>
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
            this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_תמלול.${format}` :
            `תמלול.${format}`;

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
        const lines = text.split('\n');
        let srtContent = '';

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

    /**
     * הצגת הודעת שגיאה עם קישור חיצוני
     * @param {string} message - טקסט ההודעה
     * @param {string} url - קישור להמרה
     */
    showErrorWithLink(message, url) {
        this.errorMessage.innerHTML = `
    ${message}<br>
    <a href="${url}" target="_blank" style="color: #007bff; text-decoration: underline;">
      לחץ כאן להמרת הקובץ ל־MP3
    </a>
  `;
        this.errorMessage.style.display = 'block';
        this.errorMessage.style.animation = 'shake 0.5s';

        setTimeout(() => {
            this.errorMessage.style.animation = '';
        }, 500);

        this.loadingSpinner.style.display = 'none';
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ייצוא המחלקה
window.UIFileOperations = UIFileOperations;