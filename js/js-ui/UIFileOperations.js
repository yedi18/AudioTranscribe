/**
 * מודול לטיפול בפעולות על קבצים בממשק - מעודכן עם בדיקת גודל 24MB והודעת אישור עלות
 */
class UIFileOperations extends UIHandlers {
    constructor(ui) {
        super();
        this.ui = ui;
        this.initCostConfirmationHandlers();
    }

    /**
     * אתחול מטפלים לאישור עלות
     */
    initCostConfirmationHandlers() {
        const confirmBtn = document.getElementById('confirm-transcription');
        const cancelBtn = document.getElementById('cancel-transcription');
        const dontShowAgain = document.getElementById('dont-show-cost-again');
        const costPopup = document.getElementById('cost-confirmation-popup');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                // שמירת העדפת "אל תציג שוב" אם נבחרה
                if (dontShowAgain && dontShowAgain.checked) {
                    localStorage.setItem('dont_show_cost_confirmation', 'true');
                }

                // סגירת הpopup והמשך בתמלול
                if (costPopup) {
                    costPopup.style.display = 'none';
                }

                // קריאה לפונקציית התמלול בפועל
                if (this.pendingTranscriptionCallback) {
                    this.pendingTranscriptionCallback();
                    this.pendingTranscriptionCallback = null;
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // סגירת הpopup וביטול התמלול
                if (costPopup) {
                    costPopup.style.display = 'none';
                }
                this.pendingTranscriptionCallback = null;
            });
        }

        // סגירה בלחיצה מחוץ לpopup
        if (costPopup) {
            costPopup.addEventListener('click', (e) => {
                if (e.target === costPopup) {
                    costPopup.style.display = 'none';
                    this.pendingTranscriptionCallback = null;
                }
            });
        }
    }

    /**
     * בדיקה האם להציג אישור עלות
     * @param {File} file - הקובץ לבדיקה
     * @param {Function} transcriptionCallback - פונקציה לביצוע התמלול
     * @returns {boolean} - האם הוצג אישור עלות
     */
    checkAndShowCostConfirmation(file, transcriptionCallback) {
        // בדיקה אם המשתמש ביקש לא להציג שוב
        const dontShow = localStorage.getItem('dont_show_cost_confirmation') === 'true';
        if (dontShow) {
            return false;
        }

        const fileSizeMB = file.size / (1024 * 1024);
        const shouldShowConfirmation = fileSizeMB > 5; // הצגת אישור לקבצים מעל 5MB

        if (shouldShowConfirmation) {
            this.showCostConfirmation(file, transcriptionCallback);
            return true;
        }

        return false;
    }

    /**
     * הצגת חלון אישור עלות
     * @param {File} file - הקובץ לתמלול
     * @param {Function} transcriptionCallback - פונקציה לביצוע התמלול
     */
    showCostConfirmation(file, transcriptionCallback) {
        this.pendingTranscriptionCallback = transcriptionCallback;

        const costPopup = document.getElementById('cost-confirmation-popup');
        const fileNameSpan = document.getElementById('cost-file-name');
        const fileSizeSpan = document.getElementById('cost-file-size');
        const estimatedTimeSpan = document.getElementById('cost-estimated-time');
        const costUsdSpan = document.getElementById('cost-usd');
        const costIlsSpan = document.getElementById('cost-ils');

        if (!costPopup) return;

        // חישוב נתוני עלות
        const fileSizeMB = file.size / (1024 * 1024);
        const costInfo = AudioSplitter.estimateCost(file);
        const timeInfo = AudioSplitter.estimateTranscriptionTime(file);

        // עדכון נתונים בpopup
        if (fileNameSpan) fileNameSpan.textContent = file.name;
        if (fileSizeSpan) fileSizeSpan.textContent = this.formatFileSize(file.size);
        if (estimatedTimeSpan) estimatedTimeSpan.textContent = timeInfo.displayText;
        if (costUsdSpan) costUsdSpan.textContent = costInfo.estimatedCostUSD.toFixed(3);
        if (costIlsSpan) costIlsSpan.textContent = costInfo.estimatedCostILS.toFixed(2);

        // הצגת הpopup
        costPopup.style.display = 'flex';
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
                    background: #e8f4fd;
                    border: 1px solid #007bff;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 15px 0;
                    color: #004085;
                    font-size: 14px;
                `;

                sizeWarningBox.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <i class="fas fa-info-circle" style="color: #007bff; font-size: 18px; margin-top: 2px;"></i>
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
        try {
            // שמירת הקובץ והמקור
            this.selectedFile = file;
            this.selectedFile.source = source;

            // עדכון פרטי הקובץ בתצוגה
            if (this.fileName) {
                this.fileName.textContent = file.name || (source === 'recording' ? 'הקלטה חדשה' :
                    (source === 'youtube' ? 'אודיו מיוטיוב' : 'קובץ לא מזוהה'));
            }

            if (this.fileSize) {
                const sizeText = `גודל: ${this.formatFileSize(file.size)}`;
                const fileSizeMB = file.size / (1024 * 1024);

                // הוספת התרעה אם הקובץ גדול
                if (fileSizeMB > 24) {
                    this.fileSize.innerHTML = `${sizeText} <span style="color: #007bff; font-weight: bold;">(יחולק לחלקים)</span>`;
                } else {
                    this.fileSize.textContent = sizeText;
                }
            }

            // הצגת אזור מידע הקובץ עם אנימציה
            if (this.fileInfo) {
                this.fileInfo.style.display = 'block';
            }

            if (this.uploadArea) {
                this.uploadArea.style.display = 'none';
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
                    downloadBtn.href = URL.createObjectURL(file);
                    downloadBtn.download = file.name || 'audio.mp3';
                    downloadBtn.style.display = 'inline-block';
                } else {
                    downloadBtn.style.display = 'none';
                }
            }

            this.checkFileDurationAndUpdateEstimate();

            // הסתרת שגיאות קודמות
            if (this.errorMessage) {
                this.errorMessage.style.display = 'none';
            }

        } catch (error) {
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
                this.updateEstimatedTime(60); // הערכה ברירת מחדל של דקה
            });
        } else {
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
     * הורדת התמלול בפורמט הנבחר - גרסה מתוקנת
     * @param {string} format - פורמט הקובץ (txt, srt, word, pdf)
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
                // UTF-8 עם BOM כפול + MIME נכון
                blob = new Blob(['\ufeff\ufeff' + srtContent], { type: 'text/plain;charset=utf-8' });
                fileName = this.selectedFile ?
                    this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_תמלול.srt` :
                    `תמלול.srt`;
                break;

            case 'word':
                // RTF פשוט במקום HTML
                const rtfContent = this.createSimpleRTF(text);
                blob = new Blob([rtfContent], { type: 'application/rtf;charset=utf-8' });
                fileName = this.selectedFile ?
                    this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_תמלול.rtf` :
                    `תמלול.rtf`;
                break;

            case 'pdf':
                // PDF להדפסה - הפתרון היחיד שעובד
                this.showPrintInstructions(text);
                return;

            case 'txt':
            default:
                // UTF-8 עם BOM כפול
                blob = new Blob(['\ufeff\ufeff' + text], { type: 'text/plain;charset=utf-8' });
                fileName = this.selectedFile ?
                    this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_תמלול.txt` :
                    `תמלול.txt`;
                break;
        }

        // יצירת הורדה
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.setAttribute('download', fileName);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // ניקוי מיידי
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }, 100);

        // הודעת הצלחה
        this.showSuccessMessage(fileName);
    }

    /**
 * יצירת RTF פשוט שעובד בכל מקום
 */
    createSimpleRTF(text) {
        const fileName = this.selectedFile ? this.selectedFile.name : 'תמלול';

        // RTF פשוט ביותר עם תמיכה בעברית
        const rtfHeader = '{\\rtf1\\ansi\\deff0\\uc1';
        const fontTable = '{\\fonttbl{\\f0\\fnil\\fcharset177 Arial;}}';
        const colorTable = '{\\colortbl;\\red0\\green0\\blue0;}';
        const docInfo = '{\\info{\\title תמלול - ' + fileName + '}}';

        // המרת טקסט לRTF עם קידוד נכון
        const rtfText = text
            .replace(/\\/g, '\\\\')  // בריחה מ-backslash
            .replace(/\{/g, '\\{')   // בריחה מסוגריים
            .replace(/\}/g, '\\}')
            .replace(/\n/g, '\\par ') // שבירות שורה
            .replace(/[\u0590-\u05FF]/g, (char) => {
                // המרת תווים עבריים ל-Unicode RTF
                return '\\u' + char.charCodeAt(0) + '?';
            });

        const rtfFooter = '}';

        return rtfHeader + fontTable + colorTable + docInfo +
            '\\f0\\fs24\\rtlpar\\qr ' + rtfText + rtfFooter;
    }

    /**
     * הצגת הוראות PDF
     */
    showPrintInstructions(text) {
        const fileName = this.selectedFile ? this.selectedFile.name : 'תמלול';

        // יצירת modal עם הוראות
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        direction: rtl;
    `;

        const content = document.createElement('div');
        content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 90%;
        max-height: 80%;
        overflow-y: auto;
        text-align: center;
        font-family: Arial, sans-serif;
    `;

        content.innerHTML = `
        <h2 style="color: #2c3e50; margin-bottom: 20px;">📄 יצירת PDF</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">
            כדי לשמור כ-PDF, בצע את השלבים הבאים:
        </p>
        <div style="text-align: right; margin: 20px 0;">
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <strong>1.</strong> לחץ על הכפתור "פתח לתצוגה" למטה
            </div>
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <strong>2.</strong> בחלון החדש שנפתח - לחץ Ctrl+P (או Cmd+P במק)
            </div>
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <strong>3.</strong> בחר "שמור כ-PDF" בתפריט הדפסה
            </div>
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <strong>4.</strong> לחץ שמור
            </div>
        </div>
        <div style="margin: 20px 0;">
            <button id="openPrintView" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                margin-left: 10px;
            ">📖 פתח לתצוגה</button>
            <button id="closePdfModal" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
            ">❌ סגור</button>
        </div>
    `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // טיפול בלחיצות
        document.getElementById('openPrintView').onclick = () => {
            this.openPrintView(text, fileName);
            document.body.removeChild(modal);
        };

        document.getElementById('closePdfModal').onclick = () => {
            document.body.removeChild(modal);
        };

        // סגירה בלחיצה מחוץ
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    /**
     * פתיחת תצוגת הדפסה
     */
    openPrintView(text, fileName) {
        const printHTML = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תמלול - ${fileName}</title>
    <style>
        @page { 
            size: A4; 
            margin: 2cm;
        }
        @media print {
            body { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print { display: none !important; }
        }
        body {
            font-family: 'Arial', 'David', serif;
            font-size: 14pt;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .header h1 {
            color: #2c3e50;
            font-size: 22pt;
            margin: 0;
            font-weight: bold;
        }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
            text-align: justify;
            line-height: 1.8;
        }
        .instructions {
            background: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
        }
        .print-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16pt;
            cursor: pointer;
            margin: 10px;
        }
        .print-btn:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="instructions no-print">
        <div style="margin-bottom: 15px;">
            ⬇️ <strong>לחץ כאן ליצירת PDF</strong> ⬇️
        </div>
        <button onclick="window.print()" class="print-btn">
            🖨️ הדפס/שמור כ-PDF
        </button>
        <button onclick="window.close()" class="print-btn" style="background: #dc3545;">
            ❌ סגור
        </button>
        <div style="margin-top: 15px; font-size: 12pt; font-weight: normal;">
            בתפריט הדפסה - בחר "שמור כ-PDF" במקום מדפסת
        </div>
    </div>
    
    <div class="header">
        <h1>📄 תמלול - ${fileName}</h1>
        <div style="font-size: 12pt; color: #666; margin-top: 10px;">
            ${new Date().toLocaleDateString('he-IL')}
        </div>
    </div>
    
    <div class="content">${this.escapeHtml(text)}</div>
</body>
</html>`;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(printHTML);
            printWindow.document.close();
            printWindow.focus();
        } else {
            alert('אנא אפשר חלונות קופצים כדי לפתוח את תצוגת ההדפסה');
        }
    }

    /**
     * בריחה מHTML
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * הודעת הצלחה
     */
    showSuccessMessage(fileName) {
        if (this.downloadDropdownBtn) {
            const originalText = this.downloadDropdownBtn.innerHTML;
            this.downloadDropdownBtn.innerHTML = '<i class="fas fa-check"></i> הורד בהצלחה!';
            setTimeout(() => {
                this.downloadDropdownBtn.innerHTML = originalText;
            }, 2000);
        }

        // הודעה זמנית
        const toast = document.createElement('div');
        toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        direction: rtl;
    `;
        toast.textContent = `✅ ${fileName} הורד בהצלחה`;

        document.body.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }

    /**
     * יצירת HTML עבור Word עם קידוד נכון
     * @param {string} text - הטקסט להמרה
     * @returns {string} - HTML עם קידוד נכון
     */
    createPrintablePDF(text) {
        const fileName = this.selectedFile ? this.selectedFile.name : 'תמלול';

        const printHTML = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תמלול - ${fileName}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        @media print {
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
        }
        body {
            font-family: 'Arial', 'David', 'Times New Roman', serif;
            font-size: 14pt;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
            margin: 0;
            background: white;
            color: black;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #2c3e50;
            font-size: 20pt;
            margin: 0;
        }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
            text-align: justify;
            padding: 0 20px;
        }
        .instructions {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 5px;
            padding: 15px;
            margin: 20px;
            text-align: center;
            font-size: 16pt;
        }
    </style>
</head>
<body>
    <div class="instructions no-print">
        <strong>הוראות:</strong><br>
        1. לחץ Ctrl+P (או Cmd+P במק)<br>
        2. בחר "שמור כ-PDF" בתפריט הדפסה<br>
        3. לחץ שמור<br><br>
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 14pt;">הדפס/שמור כ-PDF</button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 14pt; margin-right: 10px;">סגור</button>
    </div>
    
    <div class="header">
        <h1>תמלול - ${fileName}</h1>
    </div>
    <div class="content">${this.escapeHtml(text)}</div>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHTML);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
        }, 500);
    }
    /**
     * יצירת והורדת PDF עם תמיכה בעברית
     * @param {string} text - הטקסט להמרה
     */
    createAndDownloadPDF(text) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const fileName = this.selectedFile ? this.selectedFile.name : 'תמלול';

            // הגדרות עמוד
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);

            let yPosition = margin + 10;

            // כותרת
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const title = `תמלול - ${fileName}`;

            // מרכוז הכותרת
            const titleWidth = doc.getTextWidth(title);
            const titleX = (pageWidth - titleWidth) / 2;
            doc.text(title, titleX, yPosition);

            // קו מתחת לכותרת
            yPosition += 5;
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 15;

            // תוכן
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');

            // פיצול הטקסט לשורות
            const lines = text.split('\n');

            lines.forEach((line) => {
                if (line.trim()) {
                    // פיצול שורות ארוכות
                    const wrappedLines = doc.splitTextToSize(line, maxWidth);

                    wrappedLines.forEach((wrappedLine) => {
                        // בדיקה אם צריך עמוד חדש
                        if (yPosition > pageHeight - margin) {
                            doc.addPage();
                            yPosition = margin;
                        }

                        // הדפסת הטקסט מימין לשמאל
                        const textWidth = doc.getTextWidth(wrappedLine);
                        const textX = pageWidth - margin - textWidth;
                        doc.text(wrappedLine, textX, yPosition);
                        yPosition += 7;
                    });

                    yPosition += 3; // רווח בין פסקאות
                } else {
                    yPosition += 7; // רווח עבור שורה ריקה
                }
            });

            // הורדת הקובץ
            const pdfFileName = this.selectedFile ?
                this.selectedFile.name.replace(/\.[^/.]+$/, '') + `_תמלול.pdf` :
                `תמלול.pdf`;

            doc.save(pdfFileName);

            // הצגת הודעת הצלחה
            if (this.downloadDropdownBtn) {
                const originalText = this.downloadDropdownBtn.innerHTML;
                this.downloadDropdownBtn.innerHTML = '<i class="fas fa-check"></i> PDF הורד בהצלחה!';
                setTimeout(() => {
                    this.downloadDropdownBtn.innerHTML = originalText;
                }, 2000);
            }

        } catch (error) {
            console.error('שגיאה ביצירת PDF:', error);
            alert('אירעה שגיאה ביצירת קובץ ה-PDF. אנא נסה שוב או בחר פורמט אחר.');
        }
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