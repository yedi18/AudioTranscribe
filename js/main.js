/**
 * הקובץ הראשי של התמלול האודיו - עם שעון בזמן אמת
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
            console.error(`מודול ${module} חסר!`);
            return false;
        }
    }

    console.log('כל המודולים נטענו בהצלחה');
    return true;
}

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
    console.log('הדף נטען. בודק מודולים...');

    // בדיקת נוכחות של כל המודולים
    if (!checkRequiredModules()) {
        alert('חלק מהמודולים הדרושים לא נטענו. אנא רענן את הדף או פנה לתמיכה.');
        return;
    }
    console.log('כל המודולים זמינים');

    // אתחול ממשק המשתמש
    const ui = new UI();
    const fileOps = new UIFileOperations(ui);

    console.log('ממשק משתמש אותחל בהצלחה');
    ui.init();

    /**
     * הפעלת תמלול כאשר לוחצים על כפתור "התחל תמלול"
     */
    ui.onTranscribeClick = async function () {
        // קבלת מפתח API של OpenAI
        const apiKey = localStorage.getItem('openai_api_key');

        // בדיקה שיש מפתח API
        if (!apiKey) {
            this.showError('מפתח API של OpenAI חסר – נא להזין בהגדרות');
            return;
        }

        // משתנים למדידת זמן
        let transcriptionStartTime = null;
        let transcriptionEndTime = null;
        let realTimeTimer = null;

        try {
            console.log('התחלת תהליך תמלול עם OpenAI Whisper');

            if (!this.selectedFile) {
                this.showError('נא לבחור קובץ אודיו תקין');
                return;
            }

            // בדיקת גודל הקובץ והצגת מידע למשתמש
            const fileSizeMB = this.selectedFile.size / (1024 * 1024);
            const maxSingleSize = 24; // 24MB במקום 25MB
            const willNeedSplitting = fileSizeMB > maxSingleSize;

            console.log(`גודל קובץ: ${fileSizeMB.toFixed(2)}MB, יצטרך חילוק: ${willNeedSplitting}`);

            // הצגת אזהרה אם הקובץ גדול מ-24MB
            if (willNeedSplitting) {
                const expectedChunks = AudioSplitter.getExpectedChunks(this.selectedFile, maxSingleSize * 1024 * 1024);
                const costInfo = AudioSplitter.estimateCost(this.selectedFile);
                
                const warningMessage = `
                    הקובץ גדול מ-24MB ויחולק ל-${expectedChunks} חלקים קטנים.
                    זמן משוער: ${costInfo.estimatedMinutes} דקות
                    עלות משוערת: $${costInfo.estimatedCostUSD} (כ-${costInfo.estimatedCostILS} ₪)
                `;
                
                console.log(warningMessage);
                
                // הצגת אישור למשתמש
                if (!confirm(`${warningMessage}\n\nהאם להמשיך בתמלול?`)) {
                    return;
                }
            }

            // הצגת מצב תמלול
            this.progressContainer.style.display = 'block';
            this.loadingSpinner.style.display = 'block';
            this.transcribeBtn.disabled = true;
            this.errorMessage.style.display = 'none';

            // התחלת שעון בזמן אמת
            this.startRealTimeTimer();

            // שליחה ישירה לOpenAI ללא המרה
            this.updateProgress({
                status: 'transcribing',
                progress: 20,
                message: willNeedSplitting ? 'מתחיל חילוק ותמלול...' : 'שולח לOpenAI Whisper לתמלול...'
            });

            console.log('🎧 תמלול עם OpenAI Whisper');

            // התחלת מדידת זמן התמלול
            transcriptionStartTime = Date.now();

            // שימוש בפונקציה החכמה שבוחרת אוטומטית בין תמלול רגיל לתמלול עם חילוק
            const transcription = await Transcription.transcribe(this.selectedFile, apiKey, (progressData) => {
                // התאמת האחוזים לתקדמות הכוללת
                const adjustedProgress = 20 + (progressData.progress * 80 / 100);
                
                this.updateProgress({
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
            this.stopRealTimeTimer();

            this.updateProgress({ status: 'complete', progress: 100 });

            // הצגת התוצאות
            if (transcription) {
                this.showResults(transcription);
                
                // הצגת זמן התמלול בממשק (ללא הוספה לטקסט)
                this.displayTranscriptionTime(actualTranscriptionTime, fileSizeMB, willNeedSplitting);
                
            } else {
                this.showError('לא התקבל תמלול. נא לנסות שנית.');
            }

        } catch (error) {
            console.error('שגיאה בתהליך התמלול:', error);
            this.showError('אירעה שגיאה בתהליך התמלול: ' + (error.message || 'שגיאה לא ידועה'));
            this.loadingSpinner.style.display = 'none';
            this.transcribeBtn.disabled = false;
            this.stopRealTimeTimer();
        }
    }

    // הוספת פונקציות חדשות למחלקת UI
    ui.startRealTimeTimer = function() {
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

    ui.stopRealTimeTimer = function() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }
    };

    ui.displayTranscriptionTime = function(actualSeconds, fileSizeMB, wasSplit) {
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

        // סגנון סופי
        timeDisplay.style.cssText = `
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 10px rgba(40, 167, 69, 0.3);
            text-align: center;
            animation: fadeIn 0.5s ease-in;
        `;
    };

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
});