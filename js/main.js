// טיפול במעבר בין לשוניות
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');

            // טיפול בלשונית העלאת קובץ לאחר הקלטה
            if (tab === 'upload-file') {
                if (window.recordingHandler?.isFromRecording && window.recordingHandler?.lastRecordedFile) {
                    setTimeout(() => {
                        window.recordingHandler.showPostRecordingOptions(window.recordingHandler.lastRecordedFile);
                    }, 200);
                }
            }

            // טיפול בלשונית הקלטה
            if (tab === 'record-audio') {
                if (window.recordingHandler?.resetRecordingUI) {
                    window.recordingHandler.resetRecordingUI();
                }
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    // בדיקת נוכחות של כל המודולים
    if (!checkRequiredModules()) {
        alert('חלק מהמודולים הדרושים לא נטענו. אנא רענן את הדף או פנה לתמיכה.');
        return;
    }

    // אתחול ממשק המשתמש
    const ui = new UI();
    const fileOps = new UIFileOperations(ui);

    // אתחול מנהל היסטוריית תמלולים
    const transcriptionHistory = new TranscriptionHistory();

    // אתחול מנהל סטטיסטיקות
    const statsManager = new TranscriptionStatsManager();

    // הוספת ההיסטוריה והסטטיסטיקות לממשק המשתמש
    ui.transcriptionHistory = transcriptionHistory;
    ui.statsManager = statsManager;

    ui.init();

    /**
     * פונקציה לביצוע התמלול בפועל (ללא בדיקת אישור עלות)
     */
    async function performActualTranscription() {
        // קבלת מפתח API של OpenAI
        const apiKey = localStorage.getItem('openai_api_key');

        // בדיקה שיש מפתח API
        if (!apiKey) {
            ui.showError('מפתח API של OpenAI חסר – נא להזין בהגדרות');
            return;
        }

        // משתנים למדידת זמן
        let transcriptionStartTime = null;
        let transcriptionEndTime = null;

        try {
            if (!ui.selectedFile) {
                ui.showError('נא לבחור קובץ אודיו תקין');
                return;
            }

            // הצגת מצב תמלול
            ui.progressContainer.style.display = 'block';
            ui.loadingSpinner.style.display = 'block';
            ui.transcribeBtn.disabled = true;
            ui.errorMessage.style.display = 'none';

            // התחלת שעון בזמן אמת
            ui.startRealTimeTimer();

            // בדיקת גודל הקובץ והצגת מידע למשתמש
            const fileSizeMB = ui.selectedFile.size / (1024 * 1024);
            const maxSingleSize = 24; // 24MB במקום 25MB
            const willNeedSplitting = fileSizeMB > maxSingleSize;

            // שליחה ישירה לOpenAI ללא המרה
            ui.updateProgress({
                status: 'transcribing',
                progress: 20,
                message: willNeedSplitting ? 'מתחיל חילוק ותמלול...' : 'שולח לOpenAI Whisper לתמלול...'
            });

            // התחלת מדידת זמן התמלול
            transcriptionStartTime = Date.now();

            // שימוש בפונקציה החכמה שבוחרת אוטומטית בין תמלול רגיל לתמלול עם חילוק
            const transcription = await Transcription.transcribe(ui.selectedFile, apiKey, (progressData) => {
                // התאמת האחוזים לתקדמות הכוללת
                const adjustedProgress = 20 + (progressData.progress * 80 / 100);

                ui.updateProgress({
                    status: progressData.status,
                    progress: adjustedProgress,
                    message: progressData.message,
                    currentChunk: progressData.currentChunk,
                    totalChunks: progressData.totalChunks
                });
            });

            // סיום מדידת זמן התמלול
            transcriptionEndTime = Date.now();
            const actualTranscriptionTime = Math.round((transcriptionEndTime - transcriptionStartTime) / 1000);

            // עצירת השעון בזמן אמת
            ui.stopRealTimeTimer();

            ui.updateProgress({ status: 'complete', progress: 100 });

            // הצגת התוצאות
            if (transcription) {
                ui.showResults(transcription);

                // קבלת משך האודיו למטרות סטטיסטיקה
                let audioDuration = 0;
                try {
                    audioDuration = await getAudioDuration(ui.selectedFile);
                } catch (error) {
                    // הערכה גסה בהתבסס על גודל הקובץ
                    audioDuration = fileSizeMB * 60; // הערכה של דקה ל-MB
                }

                // הוספת סטטיסטיקה
                if (ui.statsManager) {
                    ui.statsManager.addTranscriptionStat(
                        ui.selectedFile.size,
                        audioDuration,
                        actualTranscriptionTime
                    );
                }

                // שמירה בהיסטוריה
                if (ui.transcriptionHistory) {
                    ui.transcriptionHistory.addTranscription({
                        fileName: ui.selectedFile.name,
                        source: ui.selectedFile.source || 'upload',
                        transcription: transcription,
                        fileSize: ui.selectedFile.size,
                        audioBlob: ui.selectedFile.source === 'recording' ? ui.selectedFile : null
                    });

                    // עדכון תצוגת הכפתור עם ספירה
                    updateRecentCountBadge();
                }

                // הצגת זמן התמלול בממשק
                ui.displayTranscriptionTime(actualTranscriptionTime, fileSizeMB, willNeedSplitting);

            } else {
                ui.showError('לא התקבל תמלול. נא לנסות שנית.');
            }

        } catch (error) {
            ui.showError('אירעה שגיאה בתהליך התמלול: ' + (error.message || 'שגיאה לא ידועה'));
            ui.loadingSpinner.style.display = 'none';
            ui.transcribeBtn.disabled = false;
            ui.stopRealTimeTimer();
        }
    }

    /**
     * הפעלת תמלול כאשר לוחצים על כפתור "התחל תמלול"
     */
    ui.onTranscribeClick = async function () {
        if (!this.selectedFile) {
            this.showError('נא לבחור קובץ אודיו תקין');
            return;
        }

        // בדיקה והצגת אישור עלות אם נדרש
        const shouldShowConfirmation = fileOps.checkAndShowCostConfirmation(
            this.selectedFile,
            performActualTranscription
        );

        // אם לא הוצג אישור עלות, בצע את התמלול ישירות
        if (!shouldShowConfirmation) {
            await performActualTranscription();
        }
    }

    // הוספת פונקציות למחלקת UI להערכת זמן מדויקת יותר
    ui.updateEstimatedTime = function (durationInSeconds) {
        if (!this.timeEstimate || !this.selectedFile) return;

        // שימוש במנהל הסטטיסטיקות להערכה מדויקת יותר
        let estimatedSeconds;
        if (this.statsManager) {
            estimatedSeconds = this.statsManager.estimateTranscriptionTime(this.selectedFile.size);
        } else {
            // הערכה ברירת מחדל
            const fileSizeMB = this.selectedFile.size / (1024 * 1024);
            estimatedSeconds = Math.max(30, fileSizeMB * 12);
        }

        // חישוב עלות משוערת
        const estimatedMinutes = estimatedSeconds / 60;
        const costUSD = estimatedMinutes * 0.006; // OpenAI Whisper: $0.006 לדקה
        const costILS = costUSD * 3.7; // שער דולר משוער

        // פורמט התצוגה
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
        const fileSizeMB = this.selectedFile.size / (1024 * 1024);
        this.timeEstimate.title = `הערכה: ${fileSizeMB.toFixed(1)}MB | זמן: ${timeText} | עלות: ${costText}`;
    };

    // הוספת פונקציות חדשות למחלקת UI
    ui.startRealTimeTimer = function () {
        // יצירת אלמנט שעון אם לא קיים
        let timerDisplay = document.getElementById('real-time-timer');
        if (!timerDisplay) {
            timerDisplay = document.createElement('div');
            timerDisplay.id = 'real-time-timer';
            timerDisplay.className = 'real-time-timer';

            // הוספה לאזור ההתקדמות
            const progressContainer = document.getElementById('progress-container');
            if (progressContainer) {
                progressContainer.appendChild(timerDisplay);
            }
        }

        // איפוס ושינוי סגנון לזמן אמת
        timerDisplay.style.cssText = `
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
            animation: pulse 2s infinite;
        `;

        const startTime = Date.now();

        // עדכון השעון כל שנייה
        this.realTimeInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = minutes > 0 ?
                `${minutes}:${seconds.toString().padStart(2, '0')}` :
                `${seconds}s`;

            timerDisplay.innerHTML = `
                <i class="fas fa-clock"></i> 
                זמן תמלול: <span style="font-size: 18px;">${timeString}</span>
            `;
        }, 1000);
    };

    ui.stopRealTimeTimer = function () {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }
    };

    ui.displayTranscriptionTime = function (actualSeconds, fileSizeMB, wasSplit) {
        // הסרת שעון בזמן אמת
        const realTimeTimer = document.getElementById('real-time-timer');
        if (realTimeTimer) {
            realTimeTimer.remove();
        }

        // יצירת אלמנט הצגת זמן סופי
        let timeDisplay = document.getElementById('transcription-time-display');
        if (!timeDisplay) {
            timeDisplay = document.createElement('div');
            timeDisplay.id = 'transcription-time-display';
            timeDisplay.className = 'transcription-time-badge';

            // הוספה לאחר כותרת התוצאות
            const resultTitle = this.resultContainer.querySelector('h3');
            if (resultTitle && resultTitle.parentNode) {
                resultTitle.parentNode.insertBefore(timeDisplay, resultTitle.nextSibling);
            }
        }

        // עדכון תוכן התצוגה
        const minutes = Math.floor(actualSeconds / 60);
        const seconds = actualSeconds % 60;
        const timeString = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
        const speedMBPerSecond = (fileSizeMB / actualSeconds).toFixed(1);

        // הוספת פרטים נוספים
        let additionalInfo = '';
        if (wasSplit) {
            const chunks = Math.ceil(fileSizeMB / 24);
            additionalInfo = ` | חולק ל-${chunks} חלקים`;
        }

        timeDisplay.innerHTML = `
            <i class="fas fa-stopwatch"></i> 
            זמן תמלול: <strong>${timeString}</strong> | 
            מהירות: <strong>${speedMBPerSecond}MB/s</strong>${additionalInfo}
        `;

        // סגנון סופי עם צבע מותאם לאתר
        timeDisplay.style.cssText = `
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 10px rgba(0, 123, 255, 0.3);
            text-align: center;
            animation: fadeIn 0.5s ease-in;
        `;
    };

    // הוספת פונקציה לשחזור מההיסטוריה עם גישה לטאבים
    ui.restoreFromHistoryWithTabs = function (historyItem) {
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
    };

    // פורמט טקסט עם Markdown
    ui.formatTextWithMarkdown = function (text) {
        if (!text) return '';

        return text
            .replace(/^## (.+)$/gm, '<h3 class="section-title">$1</h3>')
            .replace(/^# (.+)$/gm, '<h2 class="main-title">$1</h2>')
            .replace(/\*\*(.+?)\*\*/g, '<strong class="highlight">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^• (.+)$/gm, '<li class="bullet-item">$1</li>')
            .replace(/^- (.+)$/gm, '<li class="bullet-item">$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/^---$/gm, '<hr class="section-divider">')
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[23])/g, '$1')
            .replace(/(<\/h[23]>)<\/p>/g, '$1');
    };

    // הצגת זמינות טאבים
    ui.showTabsAvailability = function (historyItem) {
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
    };

    // הצגת הודעה זמנית
    ui.showTemporaryNotification = function (message, type = 'info', duration = 3000) {
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
    };

    // הצגת פונקציונליות העתקה
    ui.bindCopyFunctionality = function () {
        const copyBtn = document.getElementById('copy-btn');
        if (!copyBtn) return;

        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

        newCopyBtn.addEventListener('click', () => {
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
                navigator.clipboard.writeText(textToCopy).then(() => {
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
    };

    // חילוץ טקסט מ-HTML
    ui.extractTextFromHTML = function (html) {
        if (!html) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        return tempDiv.textContent || tempDiv.innerText || '';
    };

    // הוספת פונקציה לשחזור מההיסטוריה (הפונקציה הישנה)
    ui.restoreFromHistory = function (historyItem) {
        // קריאה לפונקציה החדשה עם גישה לטאבים
        this.restoreFromHistoryWithTabs(historyItem);
    };

    // פונקציה לעדכון תג הספירה של תמלולים אחרונים
    function updateRecentCountBadge() {
        if (ui.transcriptionHistory) {
            const count = ui.transcriptionHistory.history.length;
            const badge = document.getElementById('recent-count');
            const btn = document.getElementById('view-recent-transcriptions-btn');

            if (count > 0) {
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                }
                if (btn) {
                    btn.style.display = 'flex';
                }
            } else {
                if (badge) {
                    badge.style.display = 'none';
                }
                if (btn) {
                    btn.style.display = 'none';
                }
            }
        }
    }

    // עדכון ראשוני של תג הספירה
    setTimeout(() => {
        updateRecentCountBadge();
    }, 500);

    // הוספת סגנון כפתורים לפי הגדרות קבועות
    function applyButtonStyles() {
        // כפתור תמלול
        const transcribeBtn = document.getElementById('transcribe-btn');
        if (transcribeBtn) {
            transcribeBtn.classList.add('btn');
        }

        // כפתורי הקלטה
        const recordBtns = document.querySelectorAll('.btn-record, .btn-stop');
        recordBtns.forEach(btn => {
            btn.classList.add('btn');
        });

        // וידוא שכפתורי תוצאות מעוצבים נכון
        const resultContainer = document.getElementById('result-container');
        if (resultContainer && resultContainer.style.display !== 'none') {
            const actionGroups = document.querySelectorAll('.action-group');
            actionGroups.forEach(group => {
                const newBtn = group.querySelector('.new-btn');
                if (newBtn) {
                    newBtn.className = 'btn new-btn';
                }
            });
        }
    }

    // הפעלת סגנונות בטעינה ואחרי כל שינוי בממשק
    applyButtonStyles();

    // הפעלת סגנונות אחרי שינויים בממשק
    const observer = new MutationObserver(mutations => {
        applyButtonStyles();
    });

    // מעקב אחר שינויים בעץ ה-DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // הוספת window.ui לגישה גלובלית
    window.ui = ui;

    // הוספת window.transcriptionHistory לגישה גלובלית
    window.transcriptionHistory = transcriptionHistory;

    // הוספת window.statsManager לגישה גלובלית
    window.statsManager = statsManager;

    // תיקון כפתור העזרה והפופ-אפ
    const helpBtn = document.getElementById('help-btn');
    const helpPopup = document.getElementById('help-popup');
    const closeBtn = document.getElementById('close-help-popup');
    const scrollToApiBtn = document.getElementById('scroll-to-api');

    function toggleHelpPopup() {
        if (helpPopup) {
            helpPopup.classList.toggle('show');
        }
    }

    function scrollToApiSettings() {
        const apiSettingsBtn = document.getElementById('api-settings-btn');
        if (apiSettingsBtn) {
            apiSettingsBtn.click();
            toggleHelpPopup();
        }
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleHelpPopup();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleHelpPopup();
        });
    }

    if (scrollToApiBtn) {
        scrollToApiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToApiSettings();
        });
    }

    // סגירת הפופאפ בלחיצה מחוץ אליו
    document.addEventListener('click', function (event) {
        if (helpPopup && helpPopup.classList.contains('show') &&
            !helpPopup.contains(event.target) &&
            event.target !== helpBtn) {
            toggleHelpPopup();
        }
    });

    // סגירה בלחיצה על Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && helpPopup && helpPopup.classList.contains('show')) {
            toggleHelpPopup();
        }
    });

    // הוספת טיפול בפופ-אפ סטטיסטיקות מפורט
    const showDetailedStatsBtn = document.getElementById('show-detailed-stats');
    const detailedStatsPopup = document.getElementById('detailed-stats-popup');
    const closeDetailedStatsBtn = document.getElementById('close-detailed-stats');

    if (showDetailedStatsBtn) {
        showDetailedStatsBtn.addEventListener('click', () => {
            if (detailedStatsPopup && statsManager) {
                const content = document.getElementById('detailed-stats-content');
                if (content) {
                    content.innerHTML = statsManager.generateDetailedStatsHTML();
                }
                detailedStatsPopup.style.display = 'flex';
            }
        });
    }

    if (closeDetailedStatsBtn && detailedStatsPopup) {
        closeDetailedStatsBtn.addEventListener('click', () => {
            detailedStatsPopup.style.display = 'none';
        });

        detailedStatsPopup.addEventListener('click', (e) => {
            if (e.target === detailedStatsPopup) {
                detailedStatsPopup.style.display = 'none';
            }
        });
    }

    // הצגת טיפים
    const showTipsBtn = document.getElementById('show-tips');
    const tipsCard = document.getElementById('tips-card');

    if (showTipsBtn && tipsCard) {
        showTipsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const isVisible = tipsCard.style.display !== 'none';
            tipsCard.style.display = isVisible ? 'none' : 'block';

            // עדכון סטטיסטיקות אם מציגים את הטיפים
            if (!isVisible && statsManager) {
                statsManager.updateStatsDisplay();
            }
        });
    }

    // אתחול סטטיסטיקות בטעינה
    if (statsManager) {
        statsManager.updateStatsDisplay();
    }
});

// עדכון הודעת אישור עלות לסנכרון עם הערכות זמן
function updateCostConfirmationSync() {
    const fileOps = window.ui?.fileOperations;
    if (!fileOps) return;

    // החלפת הפונקציה המקורית בגרסה מסונכרנת
    const originalShowCostConfirmation = fileOps.showCostConfirmation;

    fileOps.showCostConfirmation = function (file, transcriptionCallback) {
        this.pendingTranscriptionCallback = transcriptionCallback;

        const costPopup = document.getElementById('cost-confirmation-popup');
        const fileNameSpan = document.getElementById('cost-file-name');
        const fileSizeSpan = document.getElementById('cost-file-size');
        const estimatedTimeSpan = document.getElementById('cost-estimated-time');
        const costUsdSpan = document.getElementById('cost-usd');
        const costIlsSpan = document.getElementById('cost-ils');

        if (!costPopup) return;

        // חישוב נתוני עלות מסונכרן
        const fileSizeMB = file.size / (1024 * 1024);

        // השימוש במנהל הסטטיסטיקות להערכה מדויקת יותר
        let estimatedSeconds;
        if (window.statsManager) {
            estimatedSeconds = window.statsManager.estimateTranscriptionTime(file.size);
        } else {
            estimatedSeconds = Math.max(30, fileSizeMB * 12);
        }

        const estimatedMinutes = estimatedSeconds / 60;
        const costUSD = estimatedMinutes * 0.006; // OpenAI Whisper: $0.006 לדקה
        const costILS = costUSD * 3.7; // שער דולר משוער

        // עדכון נתונים בpopup
        if (fileNameSpan) fileNameSpan.textContent = file.name;
        if (fileSizeSpan) fileSizeSpan.textContent = this.formatFileSize(file.size);
        if (estimatedTimeSpan) {
            const timeText = this.formatTimeEstimate ? this.formatTimeEstimate(estimatedSeconds) :
                (estimatedSeconds < 60 ? `${Math.round(estimatedSeconds)} שניות` :
                    `${Math.round(estimatedMinutes)} דקות`);
            estimatedTimeSpan.textContent = timeText;
        }
        if (costUsdSpan) costUsdSpan.textContent = costUSD.toFixed(3);
        if (costIlsSpan) costIlsSpan.textContent = costILS.toFixed(2);

        // הצגת הpopup
        costPopup.style.display = 'flex';
    };

    // הוספת פונקציה לפורמט זמן אם לא קיימת
    if (!fileOps.formatTimeEstimate) {
        fileOps.formatTimeEstimate = function (seconds) {
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
        };
    }
}

// הפעלת סנכרון העלות לאחר טעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateCostConfirmationSync, 1000);
});/**
 * הקובץ הראשי של התמלול האודיו - עם שעון בזמן אמת ואישור עלות מסונכרן - תוקן
 */

/**
 * פונקציה לבדיקת אורך קובץ אודיו
 * @param {File} audioFile - קובץ האודיו
 * @returns {Promise<number>} - אורך הקובץ בשניות
 */
async function getAudioDuration(audioFile) {
    return new Promise((resolve, reject) => {
        if (!audioFile.type.startsWith('audio/')) {
            reject(new Error('הקובץ אינו קובץ אודיו תקין'));
        }

        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(audioFile);

        audio.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(objectUrl);
            resolve(audio.duration);
        });

        audio.addEventListener('error', (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        });

        audio.src = objectUrl;
    });
}

// בדיקה אם כל המודולים הדרושים נטענו
function checkRequiredModules() {
    const modules = ['Transcription', 'UI', 'AudioSplitter'];

    for (const module of modules) {
        if (typeof window[module] === 'undefined') {
            return false;
        }
    }

    return true;
}

// מחלקה לניהול סטטיסטיקות תמלול
class TranscriptionStatsManager {
    constructor() {
        this.storageKey = 'transcription_statistics';
        this.stats = this.loadStats();
    }

    loadStats() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    saveStats() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
        } catch (error) {
            console.warn('Failed to save transcription stats:', error);
        }
    }

    addTranscriptionStat(fileSize, duration, transcriptionTime, actualCost = null) {
        const stat = {
            timestamp: Date.now(),
            fileSize, // בבייטים
            duration, // בשניות
            transcriptionTime, // זמן תמלול בפועל בשניות
            actualCost, // עלות בפועל ב-USD
            date: new Date().toISOString()
        };

        this.stats.unshift(stat);

        // שמירה של מקסימום 50 סטטיסטיקות
        if (this.stats.length > 50) {
            this.stats = this.stats.slice(0, 50);
        }

        this.saveStats();
        this.updateStatsDisplay();
    }

    getAverageStats() {
        if (this.stats.length === 0) return null;

        const recent = this.stats.slice(0, 10); // 10 האחרונים
        const totalTime = recent.reduce((sum, stat) => sum + stat.transcriptionTime, 0);
        const totalSize = recent.reduce((sum, stat) => sum + stat.fileSize, 0);
        const avgTimePerMB = totalTime / (totalSize / (1024 * 1024));

        return {
            count: recent.length,
            avgTimePerMB,
            avgTranscriptionTime: totalTime / recent.length,
            avgFileSize: totalSize / recent.length
        };
    }

    estimateTranscriptionTime(fileSizeBytes) {
        const averageStats = this.getAverageStats();
        if (!averageStats) {
            // ברירת מחדל בהתבסס על הנתונים שלך: 7-8 דקות לשעה אודיו
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            return Math.max(30, fileSizeMB * 12); // 12 שניות לכל MB
        }

        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        return Math.max(15, fileSizeMB * averageStats.avgTimePerMB);
    }

    updateStatsDisplay() {
        const statsCard = document.getElementById('transcription-stats');
        const tipsCard = document.getElementById('tips-card');

        if (!statsCard || !tipsCard) return;

        const averageStats = this.getAverageStats();

        if (averageStats && averageStats.count >= 3) {
            const statsCount = document.getElementById('stats-count');
            const statsList = document.getElementById('stats-list');

            if (statsCount) statsCount.textContent = averageStats.count;

            if (statsList) {
                const avgTimeMins = Math.round(averageStats.avgTranscriptionTime / 60 * 10) / 10;
                const avgSizeMB = Math.round(averageStats.avgFileSize / (1024 * 1024) * 10) / 10;
                const timePerMB = Math.round(averageStats.avgTimePerMB * 10) / 10;

                statsList.innerHTML = `
                    <li>זמן תמלול ממוצע: ${avgTimeMins} דקות</li>
                    <li>גודל קובץ ממוצע: ${avgSizeMB} MB</li>
                    <li>מהירות ממוצעת: ${timePerMB} שניות ל-MB</li>
                `;
            }

            statsCard.style.display = 'block';
        } else {
            statsCard.style.display = 'none';
        }
    }

    generateDetailedStatsHTML() {
        if (this.stats.length === 0) {
            return '<p>אין נתוני תמלול זמינים עדיין.</p>';
        }

        const recent = this.stats.slice(0, 20);
        let html = `
            <div class="stats-summary">
                <h4>סיכום סטטיסטיקות (${recent.length} תמלולים אחרונים)</h4>
                <div class="stats-grid">
        `;

        const averageStats = this.getAverageStats();
        if (averageStats) {
            const avgTimeMins = Math.round(averageStats.avgTranscriptionTime / 60 * 10) / 10;
            const avgSizeMB = Math.round(averageStats.avgFileSize / (1024 * 1024) * 10) / 10;

            html += `
                <div class="stat-item">
                    <div class="stat-value">${avgTimeMins} דק'</div>
                    <div class="stat-label">זמן ממוצע</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${avgSizeMB} MB</div>
                    <div class="stat-label">גודל ממוצע</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(averageStats.avgTimePerMB)} שנ'/MB</div>
                    <div class="stat-label">מהירות</div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
            <div class="stats-table">
                <h4>היסטוריית תמלולים מפורטת</h4>
                <table>
                    <thead>
                        <tr>
                            <th>תאריך</th>
                            <th>גודל קובץ</th>
                            <th>זמן תמלול</th>
                            <th>מהירות</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        recent.forEach(stat => {
            const date = new Date(stat.timestamp).toLocaleDateString('he-IL');
            const sizeMB = (stat.fileSize / (1024 * 1024)).toFixed(1);
            const timeMin = (stat.transcriptionTime / 60).toFixed(1);
            const speedPerMB = (stat.transcriptionTime / (stat.fileSize / (1024 * 1024))).toFixed(1);

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${sizeMB} MB</td>
                    <td>${timeMin} דק'</td>
                    <td>${speedPerMB} שנ'/MB</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }
}