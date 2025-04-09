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
    if (typeof AudioSplitter === 'undefined') {
        console.error('מודול AudioSplitter חסר!');
        return false;
    }
    if (typeof Transcription === 'undefined') {
        console.error('מודול Transcription חסר!');
        return false;
    }
    if (typeof UI === 'undefined') {
        console.error('מודול UI חסר!');
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('הדף נטען. בודק מודולים...');
    
    // בדיקת נוכחות של כל המודולים
    if (!checkRequiredModules()) {
        alert('חלק מהמודולים הדרושים לא נטענו. אנא רענן את הדף או פנה לתמיכה.');
        return;
    }
    console.log('select-file-btn:', document.getElementById('select-file-btn'));

    // אתחול ממשק המשתמש
    const ui = new UI();
    console.log('ממשק משתמש אותחל בהצלחה');
    ui.init();
    
    /**
     * הפעלת תמלול כאשר לוחצים על כפתור "התחל תמלול"
     */
    ui.onTranscribeClick = async function() {
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
            
            // בדיקה האם יש לפצל את האודיו או לא
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
                
                // החלטה על פיצול באופן אוטומטי ללא התראות
                // אם הקובץ מעל 30 שניות, מפצלים אוטומטית
                shouldSplit = audioDuration > 30;
                
                // רק לוג פנימי, ללא התראות למשתמש
                if (audioDuration > 30) {
                    console.log(`הקובץ ארוך (${audioDuration.toFixed(2)} שניות), מפצל אוטומטית לקטעים של ${segmentLength} שניות`);
                } else {
                    console.log(`הקובץ קצר (${audioDuration.toFixed(2)} שניות), אין צורך בפיצול`);
                }
                
                // מעדכן את הצ'קבוקס (אם קיים) לפי ההחלטה
                if (this.splitAudioCheckbox) {
                    this.splitAudioCheckbox.checked = shouldSplit;
                }
            } catch (durationError) {
                console.error("שגיאה בבדיקת אורך הקובץ:", durationError);
                // אם לא הצלחנו לבדוק את אורך הקובץ, ננסה לפצל על הבטוח
                shouldSplit = true;
                if (this.splitAudioCheckbox) {
                    this.splitAudioCheckbox.checked = true;
                }
            }
            
            let transcription = '';
            
            if (shouldSplit) {
                try {
                    // פיצול האודיו לחלקים קטנים - וידוא שמעבירים ערך מספרי תקין
                    const segmentLengthValue = Number(segmentLength) || 25; // וידוא שיש ערך מספרי
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
                            console.warn(`קטע אודיו ${i+1} לא תקין. מנסה להמשיך בכל זאת.`);
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
                this.showResults(transcription);
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
});