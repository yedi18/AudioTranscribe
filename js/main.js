/**
 * הקובץ הראשי של התמלול האודיו
 * מחבר את כל המודולים יחד
 */

/**
 * פונקציה לבדיקת אורך קובץ אודיו
 * @param {File} audioFile - קובץ האודיו
 * @returns {Promise<number>} - אורך הקובץ בשניות
 */
async function getAudioDuration(audioFile) {
    return new Promise((resolve, reject) => {
        // בדיקה אם הקובץ הוא קובץ אודיו
        if (!audioFile.type.startsWith('audio/') && !audioFile.name.toLowerCase().endsWith('.mp3')) {
            reject(new Error('הקובץ אינו קובץ אודיו תקין'));
            return;
        }

        // יצירת אלמנט אודיו
        const audio = document.createElement('audio');

        // יצירת URL לקובץ
        const objectUrl = URL.createObjectURL(audioFile);

        // האזנה לאירוע loadedmetadata
        audio.addEventListener('loadedmetadata', () => {
            // שחרור ה-URL
            URL.revokeObjectURL(objectUrl);

            // החזרת אורך הקובץ
            resolve(audio.duration);
        });

        // האזנה לאירוע שגיאה
        audio.addEventListener('error', (err) => {
            // שחרור ה-URL
            URL.revokeObjectURL(objectUrl);

            // החזרת שגיאה
            reject(err);
        });

        // הגדרת מקור הקובץ
        audio.src = objectUrl;
    });
}

// בדיקה אם כל המודולים הדרושים נטענו
function checkRequiredModules() {
    const modules = ['AudioSplitter', 'Transcription', 'UI'];

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
/**
 * טיפול בתוצאות התמלול והצגתן
 * פונקציה זו מוסיפה טיפול מיוחד בכפתורים
 * @param {string} transcription - טקסט התמלול
 */
function handleTranscriptionResults(transcription) {
    // הצגת התוצאות
    this.showResults(transcription);
    this.updateRestartButton();

    // אם הגענו מהקלטה, מוסיפים כפתור הקלטה חדשה

}
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
        try {
            console.log('התחלת תהליך תמלול');

            if (!this.selectedFile) {
                this.showError('נא לבחור קובץ MP3 תחילה');
                return;
            }

            // בדיקת מפתח API
            if (!this.apiKey) {
                this.showError('נא להזין מפתח API של Huggingface בהגדרות');
                return;
            }

            // הצגת מצב תמלול
            this.progressContainer.style.display = 'block';
            this.loadingSpinner.style.display = 'block';
            this.transcribeBtn.disabled = true;
            this.errorMessage.style.display = 'none';

            // פיצול אוטומטי ללא התראות
            let shouldSplit = false;
            const segmentLength = parseInt(this.segmentLengthInput.value) || 25;

            // עדכון המצב הראשוני
            this.updateProgress({ status: 'decoding', progress: 5 });

            // בדיקת אורך הקובץ
            let audioDuration = 0;
            try {
                audioDuration = await getAudioDuration(this.selectedFile);
                console.log(`אורך קובץ האודיו: ${audioDuration.toFixed(2)} שניות`);

                // החלטה על פיצול באופן אוטומטי
                shouldSplit = audioDuration > 30;

                // רק לוג פנימי, ללא התראות למשתמש
                if (audioDuration > 30) {
                    console.log(`הקובץ ארוך (${audioDuration.toFixed(2)} שניות), מפצל אוטומטית לקטעים של ${segmentLength} שניות`);
                } else {
                    console.log(`הקובץ קצר (${audioDuration.toFixed(2)} שניות), אין צורך בפיצול`);
                }

                // עדכון צ'קבוקס פיצול אם קיים
                if (this.splitAudioCheckbox) {
                    this.splitAudioCheckbox.checked = shouldSplit;
                }
            } catch (durationError) {
                console.error("שגיאה בבדיקת אורך הקובץ:", durationError);
                // אם לא הצלחנו לבדוק את אורך הקובץ, ננסה לפצל על הבטוח
                shouldSplit = true;
            }

            let transcription = '';

            if (shouldSplit) {
                try {
                    // פיצול האודיו לחלקים קטנים
                    const segmentLengthValue = Number(segmentLength) || 25;
                    console.log(`מפצל אודיו לקטעים של ${segmentLengthValue} שניות`);

                    const audioSegments = await AudioSplitter.splitAudio(
                        this.selectedFile,
                        segmentLengthValue,
                        (progressData) => this.updateProgress(progressData)
                    );
                    

                    console.log(`נוצרו ${audioSegments.length} קטעי אודיו לתמלול`);

                    if (audioSegments.length === 0) {
                        throw new Error('לא נוצרו קטעי אודיו לתמלול');
                    }

                    // בדיקה שהקטעים נוצרו כראוי
                    for (let i = 0; i < Math.min(audioSegments.length, 2); i++) {
                        const segmentValid = await Transcription.isAudioFileValid(audioSegments[i]);
                        if (!segmentValid) {
                            console.warn(`קטע אודיו ${i + 1} לא תקין. מנסה להמשיך בכל זאת.`);
                        }
                    }

                    // תמלול כל החלקים
                    transcription = await Transcription.transcribeSegments(
                        audioSegments,
                        this.apiKey,
                        (progressData) => this.updateProgress(progressData),
                        1 // מספר בקשות מקסימלי במקביל - עדיף לשלוח אחד אחד
                    );
                } catch (splitError) {
                    console.error("שגיאה בפיצול האודיו:", splitError);

                    // בודק אם זו שגיאת תמלול מה-API
                    if (splitError.message && splitError.message.includes('API')) {
                        // ננסה לתמלל שוב ללא פיצול אוטומטית במקום לשאול את המשתמש
                        console.warn("אירעה שגיאה בתמלול הקטעים. מנסה שוב ללא פיצול.");
                        shouldSplit = false;
                    } else {
                        this.showError('אירעה שגיאה בפיצול האודיו: ' + splitError.message);
                        throw splitError;
                    }
                }
            }

            // אם לא מפצלים או אם הפיצול נכשל וניסינו שוב
            if (!shouldSplit) {
                // תמלול קובץ בודד ללא פיצול
                this.updateProgress({ status: 'transcribing', progress: 40, completedSegments: 0, totalSegments: 1 });
                try {
                    // נסיון לוודא שהקובץ המקורי תקין
                    const isValid = await Transcription.isAudioFileValid(this.selectedFile);
                    if (!isValid) {
                        console.warn('הקובץ המקורי עשוי להיות לא תקין, מנסה לתמלל בכל זאת');
                    }

                    transcription = await Transcription.transcribeSingle(this.selectedFile, this.apiKey);
                    this.updateProgress({ status: 'complete', progress: 100 });
                } catch (singleError) {
                    console.error('שגיאה בתמלול קובץ בודד:', singleError);
                    this.showError('אירעה שגיאה בתמלול: ' + singleError.message);
                    throw singleError;
                }
            }

            // הצגת התוצאות
            if (transcription) {
                // שמירת מקור התמלול (הקלטה או קובץ רגיל)
                const isFromRecording = this.recordingHandler && this.recordingHandler.isFromRecording;

                // הצגת התוצאות
                this.showResults(transcription);
                //this.updateRestartButton();


                // הוספת כפתורים מיוחדים למצב הקלטה אם צריך
                if (isFromRecording) {
                    // וידוא שהכפתור "תמלול חדש" מחזיר להקלטה
                    const newBtn = document.getElementById('new-btn');
                    if (newBtn) {
                        newBtn.innerHTML = '<i class="fas fa-microphone"></i> הקלטה חדשה';

                        const originalOnClick = newBtn.onclick;
                        newBtn.onclick = () => {
                            if (typeof originalOnClick === 'function') {
                                originalOnClick.call(this);
                            } else {
                                this.resetUI();
                            }

                            // מעבר ללשונית הקלטה
                            const recordTab = document.querySelector('[data-tab="record-audio"]');
                            if (recordTab) recordTab.click();
                        };
                    }
                }
            } else {
                this.showError('לא התקבל תמלול. נא לנסות שנית.');
            }

        } catch (error) {
            console.error('שגיאה בתהליך התמלול:', error);
            this.showError('אירעה שגיאה בתהליך התמלול: ' + (error.message || 'שגיאה לא ידועה'));
            this.loadingSpinner.style.display = 'none';
            this.transcribeBtn.disabled = false;
        }
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
                // וידוא שכפתור "תמלול חדש" מעוצב נכון
                const newBtn = group.querySelector('.new-btn');
                if (newBtn) {
                    newBtn.className = 'btn new-btn';
                }

                // וידוא שכפתור "הקלטה חדשה" מעוצב נכון אם קיים
                const recordingBtn = group.querySelector('.new-recording-btn');
                if (recordingBtn) {
                    recordingBtn.className = 'btn new-recording-btn';
                }
            });
        }

        // וידוא שכפתורי #post-recording-actions מעוצבים נכון
        const postRecordingActions = document.getElementById('post-recording-actions');
        if (postRecordingActions) {
            const downloadBtn = postRecordingActions.querySelector('.download-recording-btn');
            if (downloadBtn) {
                downloadBtn.className = 'btn download-recording-btn';
            }
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