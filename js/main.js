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
        if (!audioFile.type.startsWith('audio/')) {
            reject(new Error('הקובץ אינו קובץ אודיו תקין'));
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

// הוסף את זה לפונקציה הראשית ב-main.js או בסוף הקובץ
document.addEventListener('DOMContentLoaded', function () {
    // קוד קיים...

    // הוספת מאזין לשינויי נראות הדף
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            console.log('הדף חזר להיות נראה - ממשיך תהליכים שהיו באמצע');

            // בדיקה אם יש תהליך תמלול פעיל
            const transcriptionState = sessionStorage.getItem('transcribeSegmentsState');
            if (transcriptionState) {
                try {
                    const state = JSON.parse(transcriptionState);
                    const now = Date.now();
                    const timePassed = now - state.timestamp;

                    // אם עברו פחות מ-30 דקות, נעדכן את סרגל ההתקדמות
                    if (timePassed < 30 * 60 * 1000) {
                        console.log('נמצא תהליך תמלול פעיל, מעדכן התקדמות');

                        if (ui && ui.updateProgress) {
                            ui.updateProgress({
                                status: 'transcribing',
                                progress: (state.completedSegments / state.totalSegments) * 100,
                                completedSegments: state.completedSegments,
                                totalSegments: state.totalSegments,
                                message: 'ממשיך בתמלול...'
                            });
                        }
                    }
                } catch (e) {
                    console.warn('שגיאה בניתוח מצב התמלול:', e);
                }
            }
        } else {
            console.log('הדף נהיה לא נראה - שומר מצב עבודה');
            // כל הלוגיקה של שמירת המצב כבר מוטמעת בפונקציות עצמן
        }
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


    // עדכון this.apiKey כשמשנים את הספק שנבחר
    const modeSelect = document.getElementById('transcription-mode');
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const selectedMode = modeSelect.value;
            const selectedProvider = selectedMode === 'hf-plus-groq' ? 'huggingface' : 'groq';

            ui.apiKey = selectedProvider === 'groq'
                ? localStorage.getItem('groq_api_key')
                : localStorage.getItem('huggingface_api_key');

            console.log('✅ עודכן apiKey לפי הספק החדש:', selectedProvider);
        });
    }
    // ... ui.init() קיים פה

    const huggingfaceSection = document.querySelector('.api-section.required');
    const groqSection = document.querySelector('.api-section.optional');
    const recommendedBadge = groqSection?.querySelector('.recommended-badge');

    function updateAPISectionsDisplay() {
        const selectedMode = modeSelect?.value;
        const selectedProvider = selectedMode === 'hf-plus-groq' ? 'huggingface' : 'groq';

        // טען מפתח API
        ui.apiKey = selectedProvider === 'groq'
            ? localStorage.getItem('groq_api_key')
            : localStorage.getItem('huggingface_api_key');

        // הסתר/הצג הגדרות API בהתאם
        if (selectedProvider === 'groq') {
            if (huggingfaceSection) huggingfaceSection.style.display = 'none';
            if (groqSection) groqSection.classList.add('groq-highlight');
            if (recommendedBadge) recommendedBadge.style.display = 'inline-block';
        } else {
            if (huggingfaceSection) huggingfaceSection.style.display = '';
            if (groqSection) groqSection.classList.remove('groq-highlight');
            if (recommendedBadge) recommendedBadge.style.display = 'none';
        }
    }

    // בעת שינוי בבחירה
    modeSelect?.addEventListener('change', updateAPISectionsDisplay);

    // בעת טעינת הדף
    setTimeout(() => {
        updateAPISectionsDisplay();
    }, 100);

    /**
     * הפעלת תמלול כאשר לוחצים על כפתור "התחל תמלול"
     */
    /**
 * הפעלת תמלול כאשר לוחצים על כפתור "התחל תמלול"
 */
    ui.onTranscribeClick = async function () {
        const segmentLengthValue = Number(this.segmentLengthInput.value) || 25;

        const warning = document.querySelector('.warning-message');
        if (warning) warning.remove();

        // בדיקה אם יש תהליך תמלול שהופסק באמצע
        const savedState = sessionStorage.getItem('transcribeSegmentsState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                const now = Date.now();
                const timePassed = now - state.timestamp;

                // אם עברו פחות מ-30 דקות, נציע להמשיך את התמלול
                if (timePassed < 30 * 60 * 1000) {
                    if (confirm('נמצא תהליך תמלול שהופסק. האם תרצה להמשיך מאיפה שהפסקת?')) {
                        // הפעל את תהליך התמלול שוב - מערכת ההתאוששות תטפל בשאר
                        this.progressContainer.style.display = 'block';
                        this.loadingSpinner.style.display = 'block';
                        this.transcribeBtn.disabled = true;
                        this.errorMessage.style.display = 'none';

                        this.updateProgress({
                            status: 'transcribing',
                            progress: (state.completedSegments / state.totalSegments) * 100,
                            completedSegments: state.completedSegments,
                            totalSegments: state.totalSegments,
                            message: 'משחזר פעולת תמלול קודמת...'
                        });
                    }
                } else {
                    // המידע ישן מדי, נקה אותו
                    sessionStorage.removeItem('transcribeSegmentsState');
                }
            } catch (e) {
                console.warn('שגיאה בניתוח מצב התמלול:', e);
                sessionStorage.removeItem('transcribeSegmentsState');
            }
        }

        // בחירת ספק התמלול (Groq או Huggingface)
        const selectedProvider = this.getSelectedProvider();

        // טעינת מפתח ה-API המתאים
        this.apiKey = selectedProvider === 'groq'
            ? localStorage.getItem('groq_api_key')
            : localStorage.getItem('huggingface_api_key');

        const apiKey = this.apiKey;

        // בדיקה שיש מפתח API
        if (!apiKey) {
            const providerName = selectedProvider === 'groq' ? 'Groq' : 'Huggingface';
            this.showError(`מפתח API של ${providerName} חסר – נא להזין בהגדרות`);
            return;
        }

        // בדיקה אם יש מפתח אלטרנטיבי במקרה שנצטרך לעבור ספק
        const alternativeProvider = selectedProvider === 'groq' ? 'huggingface' : 'groq';
        const hasAlternativeKey = localStorage.getItem(
            alternativeProvider === 'groq' ? 'groq_api_key' : 'huggingface_api_key'
        ) ? true : false;

        try {
            console.log(`התחלת תהליך תמלול עם ספק: ${selectedProvider}`);

            if (!this.selectedFile) {
                this.showError('נא לבחור קובץ אודיו תקין (MP3, WAV, OGG, M4A, WEBM)');
                return;
            }

            // בדיקה אם הקובץ הוא MP3 אמיתי לפי שם + סוג MIME
            const fileName = this.selectedFile.name?.toLowerCase()?.trim() || '';
            const fileType = this.selectedFile.type || '';

            const isMp3 = fileName.endsWith('.mp3') || fileType === 'audio/mpeg';

            // הצגת מצב תמלול
            this.progressContainer.style.display = 'block';
            this.loadingSpinner.style.display = 'block';
            this.transcribeBtn.disabled = true;
            this.errorMessage.style.display = 'none';

            // אם הקובץ אינו MP3, הצג הודעת המרה
            if (!isMp3) {
                console.log('📤 קובץ אינו MP3 – נשלח לשרת להמרה');

                // עדכון התקדמות להמרה
                this.updateProgress({
                    status: 'processing',
                    progress: 5,
                    message: 'ממיר את הקובץ לפורמט MP3... (עשוי לקחת מספר שניות)'
                });

                const convertForm = new FormData();
                convertForm.append('audio', this.selectedFile);

                try {
                    this.updateProgress({
                        status: 'processing',
                        progress: 15,
                        message: 'שולח קובץ לשרת ההמרה...'
                    });

                    const response = await fetch('https://audiotranscribe-27kc.onrender.com/convert-audio', {
                        method: 'POST',
                        body: convertForm
                    });

                    if (!response.ok) throw new Error('השרת לא הצליח להמיר את הקובץ');

                    this.updateProgress({
                        status: 'processing',
                        progress: 35,
                        message: 'מוריד את הקובץ המומר...'
                    });

                    const mp3Blob = await response.blob();

                    this.updateProgress({
                        status: 'processing',
                        progress: 40,
                        message: 'ההמרה הושלמה, מתחיל תמלול...'
                    });

                    const newFile = new File([mp3Blob], 'converted.mp3', {
                        type: 'audio/mpeg',
                        lastModified: Date.now()
                    });

                    console.log('✅ המרה הושלמה – קובץ חדש הוזן');
                    this.selectedFile = newFile;
                } catch (err) {
                    console.error('❌ שגיאה בהמרת הקובץ:', err);
                    this.showError('שגיאה בהמרת הקובץ ל־MP3: ' + err.message);
                    return;
                }
            } else {
                console.log('📢 קובץ הוא MP3 – לא נשלח לשרת!');
            }

            // עדכון המצב הראשוני
            this.updateProgress({ status: 'decoding', progress: isMp3 ? 5 : 45 });

            // בדיקת אורך הקובץ
            let audioDuration = 0;
            let shouldSplit = false;
            try {
                audioDuration = await getAudioDuration(this.selectedFile);
                console.log(`אורך קובץ האודיו: ${audioDuration.toFixed(2)} שניות`);

                // החלטה על פיצול באופן אוטומטי
                shouldSplit = audioDuration > 30;

                // רק לוג פנימי, ללא התראות למשתמש
                if (audioDuration > 30) {
                    console.log(`הקובץ ארוך (${audioDuration.toFixed(2)} שניות), מפצל אוטומטית לקטעים של ${segmentLengthValue} שניות`);
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
            let providerSwitched = false;

            if (shouldSplit) {
                try {
                    // קבלת האורך מכלי הקלט
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
                    console.log('🔀 תמלול קטעים עם ספק:', selectedProvider);

                    // מעדכן את הפונקציה שמטפלת בהתקדמות כדי לזהות החלפת ספק
                    const onProgressWithProviderDetection = (progressData) => {
                        // בדיקה אם הספק הוחלף במהלך התמלול
                        if (progressData.providerSwitched && progressData.newProvider) {
                            providerSwitched = true;
                            const newProviderName = progressData.newProvider === 'groq' ? 'Groq' : 'Huggingface';
                            const oldProviderName = selectedProvider === 'groq' ? 'Groq' : 'Huggingface';

                            // עדכון הודעת ההתקדמות כדי ליידע את המשתמש על החלפת הספק
                            progressData.message = `עובר מ-${oldProviderName} ל-${newProviderName} (בגלל מגבלת שימוש)`;
                        }

                        // העברת נתוני ההתקדמות לפונקציית העדכון המקורית
                        this.updateProgress(progressData);
                    };

                    // תמלול כל החלקים
                    transcription = await Transcription.transcribeSegments(
                        audioSegments,
                        apiKey,
                        onProgressWithProviderDetection,
                        1,
                        selectedProvider
                    );

                } catch (splitError) {
                    console.error("שגיאה בפיצול האודיו:", splitError);

                    // בדיקה אם זו שגיאת Rate Limit
                    if (splitError.message && (
                        splitError.message.includes('rate_limit_exceeded') ||
                        splitError.message.includes('Rate limit')
                    )) {
                        // בדיקה אם יש מפתח אלטרנטיבי זמין
                        if (hasAlternativeKey) {
                            console.warn(`מגבלת שימוש בספק ${selectedProvider}. מנסה לעבור ל-${alternativeProvider}...`);

                            // עדכון המשתמש
                            this.updateProgress({
                                status: 'processing',
                                progress: 40,
                                message: `הגעת למגבלת שימוש של ${selectedProvider}, עובר ל-${alternativeProvider}...`
                            });

                            // החלפת המפתח לספק האלטרנטיבי
                            const alternativeKey = localStorage.getItem(
                                alternativeProvider === 'groq' ? 'groq_api_key' : 'huggingface_api_key'
                            );

                            // ניסיון חוזר עם הספק האלטרנטיבי
                            transcription = await Transcription.transcribeSingle(
                                this.selectedFile,
                                alternativeKey,
                                alternativeProvider
                            );

                            providerSwitched = true;
                        } else {
                            // אם אין מפתח אלטרנטיבי, מציג הודעה ברורה
                            this.showError(`הגעת למגבלת השימוש של ${selectedProvider}. נא להמתין או להגדיר מפתח API של ${alternativeProvider}.`);
                            throw splitError;
                        }
                    } else if (splitError.message && splitError.message.includes('API')) {
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
            if (!shouldSplit && !transcription) {
                // תמלול קובץ בודד ללא פיצול
                this.updateProgress({ status: 'transcribing', progress: 40, completedSegments: 0, totalSegments: 1 });
                try {
                    // נסיון לוודא שהקובץ המקורי תקין
                    const isValid = await Transcription.isAudioFileValid(this.selectedFile);
                    if (!isValid) {
                        console.warn('הקובץ המקורי עשוי להיות לא תקין, מנסה לתמלל בכל זאת');
                    }
                    console.log('🎧 תמלול קובץ אחד עם ספק:', selectedProvider);

                    try {
                        transcription = await Transcription.transcribeSingle(this.selectedFile, apiKey, selectedProvider);
                    } catch (singleError) {
                        // בדיקה אם זו שגיאת Rate Limit והאם יש מפתח אלטרנטיבי
                        if (singleError.message && (
                            singleError.message.includes('rate_limit_exceeded') ||
                            singleError.message.includes('Rate limit')
                        ) && hasAlternativeKey) {
                            console.warn(`מגבלת שימוש בספק ${selectedProvider}. מנסה לעבור ל-${alternativeProvider}...`);

                            // עדכון המשתמש
                            this.updateProgress({
                                status: 'processing',
                                progress: 50,
                                message: `הגעת למגבלת שימוש של ${selectedProvider}, עובר ל-${alternativeProvider}...`
                            });

                            // החלפת המפתח לספק האלטרנטיבי
                            const alternativeKey = localStorage.getItem(
                                alternativeProvider === 'groq' ? 'groq_api_key' : 'huggingface_api_key'
                            );

                            // ניסיון חוזר עם הספק האלטרנטיבי
                            transcription = await Transcription.transcribeSingle(
                                this.selectedFile,
                                alternativeKey,
                                alternativeProvider
                            );

                            providerSwitched = true;
                        } else {
                            // אם זו לא שגיאת Rate Limit או שאין מפתח אלטרנטיבי, זורק את השגיאה
                            throw singleError;
                        }
                    }

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

                // הוספת הודעה אם הספק הוחלף במהלך התמלול
                if (providerSwitched) {
                    const oldProviderName = selectedProvider === 'groq' ? 'Groq' : 'Huggingface';
                    const newProviderName = alternativeProvider === 'groq' ? 'Groq' : 'Huggingface';

                    // הוספת הודעה בתחילת הטקסט
                    const message = `[הערה: במהלך התמלול המערכת עברה מ-${oldProviderName} ל-${newProviderName} בגלל מגבלת שימוש]\n\n`;
                    this.transcriptionResult.value = message + this.transcriptionResult.value;
                }

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

                // נקה נתוני מצב כשסיימנו בהצלחה
                sessionStorage.removeItem('transcribeSegmentsState');
            } else {
                this.showError('לא התקבל תמלול. נא לנסות שנית.');
            }

        } catch (error) {
            console.error('שגיאה בתהליך התמלול:', error);
            this.showError('אירעה שגיאה בתהליך התמלול: ' + (error.message || 'שגיאה לא ידועה'));
            this.loadingSpinner.style.display = 'none';
            this.transcribeBtn.disabled = false;
        }
    }
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