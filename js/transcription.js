/**
 * מודול לתמלול קבצי אודיו באמצעות Huggingface וGroq
 * עם טיפול בשגיאות מגבלת קצב (Rate Limit)
 */
class Transcription {
    /**
 * תמלול קובץ אודיו בודד עם תמיכה בשינוי מצב החלונית
 * @param {Blob} audioFile - קובץ האודיו לתמלול
 * @param {string} apiKey - מפתח ה-API של Huggingface או Groq
 * @param {string} provider - ספק התמלול ('huggingface' או 'groq')
 * @returns {Promise<string>} - טקסט התמלול
 */
    static async transcribeSingle(audioFile, apiKey, provider = 'huggingface') {
        // שמירת עותק של הקובץ במקום להתבסס על ה-URL
        let audioFileClone = new File(
            [await audioFile.arrayBuffer()],
            audioFile.name || 'audio.mp3',
            { type: audioFile.type || 'audio/mpeg' }
        );

        // מקרה מיוחד - תיקון MIME לסגמנט הראשון אם מדובר ב-Groq
        if (provider === 'groq' && audioFileClone.name?.includes('segment_1')) {
            // נסה לשנות את סוג ה-MIME (מסייע לפעמים)
            audioFileClone = new File([audioFileClone], audioFileClone.name, {
                type: 'audio/mpeg',
                lastModified: Date.now()
            });
        }
        // שמירת המפתח והספק המקוריים למקרה של שגיאה ומעבר לספק אחר
        const originalProvider = provider;
        const originalApiKey = apiKey;

        try {
            // אם הספק הוא Groq, נשתמש בפונקציה הייעודית לתמלול עם Groq
            if (provider === 'groq') {
                try {
                    return await Transcription.transcribeWithGroq(audioFileClone, apiKey);
                } catch (groqError) {
                    // בדיקה אם מדובר בשגיאת Rate Limit
                    if (groqError.message &&
                        (groqError.message.includes('rate_limit_exceeded') ||
                            groqError.message.includes('Rate limit reached'))) {

                        console.warn('⚠️ התקבלה שגיאת Rate Limit מ-Groq, מנסה לעבור ל-Huggingface:', groqError.message);

                        // בדיקה אם יש מפתח API של Huggingface זמין
                        const huggingfaceApiKey = localStorage.getItem('huggingface_api_key');

                        if (huggingfaceApiKey) {
                            console.log('🔄 עובר לספק Huggingface');
                            // מעבר ל-Huggingface באופן רקורסיבי עם אותו קובץ
                            return await Transcription.transcribeSingle(audioFileClone, huggingfaceApiKey, 'huggingface');
                        } else {
                            // אם אין מפתח של Huggingface, זורק את השגיאה המקורית עם הודעה ברורה יותר
                            throw new Error('הגעת למגבלת הקצב של Groq. נא להמתין או להשתמש במפתח API של Huggingface.');
                        }
                    } else {
                        // אם זו לא שגיאת Rate Limit, זורק את השגיאה המקורית
                        throw groqError;
                    }
                }
            }

            // בדיקת מפתח API
            if (!apiKey) {
                throw new Error('מפתח API חסר');
            }

            // יצירת FormData לשליחת הקובץ
            const formData = new FormData();

            // בדיקה אם הקובץ הוא מסוג File או Blob
            if (audioFileClone instanceof File) {
                console.log(`שולח קובץ: ${audioFileClone.name}, גודל: ${audioFileClone.size} בתים, סוג: ${audioFileClone.type}`);
                formData.append('file', audioFileClone);
            } else if (audioFileClone instanceof Blob) {
                // יצירת אובייקט File מה-Blob
                const fileName = `audio_segment_${new Date().getTime()}.mp3`;
                const file = new File([audioFileClone], fileName, { type: 'audio/mpeg' });
                console.log(`שולח blob כקובץ: ${fileName}, גודל: ${file.size} בתים`);
                formData.append('file', file);
            } else {
                throw new Error('סוג קובץ לא נתמך');
            }

            // שליחת הקובץ ל-API של Huggingface
            const response = await fetch(
                "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`שגיאת API (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            return result.text || '';

        } catch (error) {
            console.error('Error in transcription:', error);

            // ניסיון להחלפת ספק במקרה של שגיאה
            if (originalProvider === 'huggingface' && error.message.includes('503')) {
                // אם השגיאה היא מ-Huggingface והיא 503 (שירות לא זמין), ננסה לעבור ל-Groq
                const groqApiKey = localStorage.getItem('groq_api_key');

                if (groqApiKey) {
                    console.warn('⚠️ Huggingface מחזיר שגיאה, מנסה לעבור ל-Groq');
                    return await Transcription.transcribeSingle(audioFileClone, groqApiKey, 'groq');
                }
            }

            // אם לא הצלחנו להחליף ספק או שהיתה שגיאה אחרת, נזרוק את השגיאה המקורית
            throw error;
        }
    }
    /**
     * תמלול מספר קטעים של אודיו באופן מקבילי - עם תמיכה בטאב לא פעיל
     * @param {Blob[]} audioSegments - מערך של קטעי אודיו
     * @param {string} apiKey - מפתח ה-API של Huggingface/Groq
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @param {number} maxConcurrent - מספר מקסימלי של בקשות במקביל
     * @param {string} provider - ספק התמלול ('huggingface' או 'groq')
     * @returns {Promise<string>} - טקסט התמלול המלא
     */
    static async transcribeSegments(audioSegments, apiKey, onProgress = null, maxConcurrent = 2, provider = 'groq') {
        if (!apiKey) {
            throw new Error('מפתח API חסר');
        }

        if (!audioSegments || audioSegments.length === 0) {
            return '';
        }

        console.log(`מתחיל תמלול ${audioSegments.length} קטעים עם ספק: ${provider}`);

        // שמירת עותק מקומי של הסגמנטים (למניעת בעיות בלוב)
        const localSegments = [];
        for (let i = 0; i < audioSegments.length; i++) {
            try {
                const buffer = await audioSegments[i].arrayBuffer();
                localSegments.push(new File(
                    [buffer],
                    audioSegments[i].name || `segment_${i + 1}.mp3`,
                    { type: 'audio/mpeg' }
                ));
            } catch (e) {
                console.error(`בעיה בהכנת סגמנט ${i}:`, e);
                localSegments.push(audioSegments[i]); // נשתמש במקורי אם נכשל
            }
        }

        // מערך שיכיל את כל התוצאות
        const results = new Array(localSegments.length);
        let completedSegments = 0;

        // שמירת הספק והמפתח המקוריים (במקרה שנצטרך להחליף באמצע)
        const originalProvider = provider;
        const originalApiKey = apiKey;

        // מפתח API אלטרנטיבי במקרה שנגיע למגבלת קצב
        let alternativeProvider = provider === 'groq' ? 'huggingface' : 'groq';
        let alternativeApiKey = localStorage.getItem(
            alternativeProvider === 'groq' ? 'groq_api_key' : 'huggingface_api_key'
        );

        // משתנה שעוקב אחרי אם עברנו לספק אחר במהלך התמלול
        let switchedProvider = false;

        // שמירת מידע על ההתקדמות - יעזור כשחוזרים לטאב
        let processState = {
            totalSegments: localSegments.length,
            completedSegments: 0,
            inProgressSegments: new Set(),
            results: results
        };

        // שמירת המצב לסשן סטורג'
        const saveProcessState = () => {
            try {
                const stateToSave = {
                    ...processState,
                    inProgressSegments: Array.from(processState.inProgressSegments),
                    timestamp: Date.now()
                };
                sessionStorage.setItem('transcribeSegmentsState', JSON.stringify(stateToSave));
            } catch (e) {
                console.warn('לא ניתן לשמור מצב לסשן סטורג׳', e);
            }
        };

        // טעינת המצב מסשן סטורג'
        const loadProcessState = () => {
            try {
                const savedState = sessionStorage.getItem('transcribeSegmentsState');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    if (parsedState.totalSegments === localSegments.length) {
                        processState = {
                            ...parsedState,
                            inProgressSegments: new Set(parsedState.inProgressSegments)
                        };
                        results.splice(0, results.length, ...processState.results);
                        completedSegments = processState.completedSegments;
                        return true;
                    }
                }
            } catch (e) {
                console.warn('בעיה בטעינת מצב מסשן סטורג׳', e);
            }
            return false;
        };

        // ניסיון לטעון מצב קיים
        loadProcessState();

        // פונקציה לעיבוד קטע בודד
        async function processSegment(index) {
            if (results[index] !== undefined && results[index] !== null) {
                // הקטע כבר עובד או הושלם
                return results[index];
            }

            // סימון שהקטע בתהליך עיבוד
            processState.inProgressSegments.add(index);
            saveProcessState();

            try {
                const segment = localSegments[index];

                // בדיקה אם הקטע תקף
                const isValid = await Transcription.isAudioFileValid(segment);
                if (!isValid) {
                    console.warn(`⚠️ קטע ${index + 1} לא תקין – ייתכן שהוא קצר מדי או שקט`);
                    results[index] = `[קטע ${index + 1} זוהה כלא תקין]`;
                    completedSegments++;
                    processState.completedSegments = completedSegments;
                    processState.inProgressSegments.delete(index);
                    saveProcessState();
                    return results[index];
                }

                console.log(`מתמלל קטע ${index + 1}/${localSegments.length} עם ספק: ${switchedProvider ? alternativeProvider : originalProvider}`);

                // בחירת הספק והמפתח הנכונים (המקוריים או האלטרנטיביים)
                const currentProvider = switchedProvider ? alternativeProvider : originalProvider;
                const currentApiKey = switchedProvider ? alternativeApiKey : originalApiKey;

                try {
                    // ניסיון תמלול רגיל
                    const transcription = await Transcription.transcribeSingle(segment, currentApiKey, currentProvider);
                    console.log(`✅ קטע ${index + 1} תומלל בהצלחה`);

                    // שמירת התוצאה
                    results[index] = transcription;
                    completedSegments++;
                    processState.completedSegments = completedSegments;
                    processState.inProgressSegments.delete(index);
                    saveProcessState();

                    if (onProgress) {
                        onProgress({
                            status: 'transcribing',
                            progress: (completedSegments / localSegments.length) * 100,
                            completedSegments,
                            totalSegments: localSegments.length,
                            currentSegmentIndex: index
                        });
                    }

                    return transcription;
                } catch (error) {
                    // בדיקה אם מדובר בשגיאת Rate Limit ויש אפשרות לעבור לספק אחר
                    if (!switchedProvider &&
                        alternativeApiKey &&
                        (error.message.includes('rate_limit_exceeded') ||
                            error.message.includes('Rate limit reached'))) {

                        console.warn(`⚠️ התקבלה שגיאת Rate Limit מ-${currentProvider}, עובר ל-${alternativeProvider}`);
                        switchedProvider = true;

                        // ניסיון חוזר עם הספק האלטרנטיבי
                        const transcription = await Transcription.transcribeSingle(segment, alternativeApiKey, alternativeProvider);
                        console.log(`✅ קטע ${index + 1} תומלל בהצלחה עם ${alternativeProvider}`);

                        // שמירת התוצאה
                        results[index] = transcription;
                        completedSegments++;
                        processState.completedSegments = completedSegments;
                        processState.inProgressSegments.delete(index);
                        saveProcessState();

                        if (onProgress) {
                            onProgress({
                                status: 'transcribing',
                                progress: (completedSegments / localSegments.length) * 100,
                                completedSegments,
                                totalSegments: localSegments.length,
                                currentSegmentIndex: index,
                                providerSwitched: true,
                                newProvider: alternativeProvider
                            });
                        }

                        return transcription;
                    }

                    // טיפול בשגיאות אחרות ובקטע ראשון בצורה מיוחדת
                    if (index === 0 && currentProvider === 'groq') {
                        console.log(`⚠️ ניסיון תמלול קטע ראשון נכשל. מפעיל טיפול מיוחד...`);

                        // ניסיון שני - שינוי סוג MIME
                        try {
                            console.log(`🔄 ניסיון 2: שינוי סוג MIME לקטע ראשון...`);

                            const mimeFixedSegment = new File([segment], segment.name, {
                                type: 'audio/mpeg',
                                lastModified: Date.now()
                            });

                            const transcription = await Transcription.transcribeSingle(mimeFixedSegment, currentApiKey, currentProvider);
                            console.log(`✅ קטע ראשון תומלל בהצלחה לאחר תיקון MIME`);

                            // שמירת התוצאה
                            results[index] = transcription;
                            completedSegments++;
                            processState.completedSegments = completedSegments;
                            processState.inProgressSegments.delete(index);
                            saveProcessState();

                            if (onProgress) {
                                onProgress({
                                    status: 'transcribing',
                                    progress: (completedSegments / localSegments.length) * 100,
                                    completedSegments,
                                    totalSegments: localSegments.length,
                                    currentSegmentIndex: index
                                });
                            }

                            return transcription;
                        } catch (secondError) {
                            // ניסיון שלישי - חיתוך מחדש
                            try {
                                console.log(`⚠️ גם ניסיון 2 נכשל. מנסה ניסיון 3: חיתוך מחדש...`);

                                const fixedSegment = await AudioSplitter.handleFirstSegment(segment, 25);
                                const finalSegment = new File([fixedSegment], fixedSegment.name, {
                                    type: 'audio/mpeg',
                                    lastModified: Date.now()
                                });

                                const transcription = await Transcription.transcribeSingle(finalSegment, currentApiKey, currentProvider);
                                console.log(`✅ קטע ראשון תומלל בהצלחה לאחר חיתוך מחדש!`);

                                // שמירת התוצאה
                                results[index] = transcription;
                                completedSegments++;
                                processState.completedSegments = completedSegments;
                                processState.inProgressSegments.delete(index);
                                saveProcessState();

                                if (onProgress) {
                                    onProgress({
                                        status: 'transcribing',
                                        progress: (completedSegments / localSegments.length) * 100,
                                        completedSegments,
                                        totalSegments: localSegments.length,
                                        currentSegmentIndex: index
                                    });
                                }

                                return transcription;
                            } catch (thirdError) {
                                console.error(`❌ כל הניסיונות נכשלו לקטע ${index + 1}:`, thirdError.message);
                                processState.inProgressSegments.delete(index);
                                throw thirdError;
                            }
                        }
                    } else {
                        // אם זה לא הקטע הראשון או שמדובר ב-Huggingface, פשוט זורק את השגיאה
                        processState.inProgressSegments.delete(index);
                        throw error;
                    }
                }
            } catch (error) {
                console.error(`Error transcribing segment ${index + 1}:`, error);

                // אם לא הצלחנו לתמלל, נשמור הודעת שגיאה כתוצאה
                results[index] = `[שגיאה בתמלול קטע ${index + 1}: ${error.message}]`;

                // עדכון ההתקדמות גם במקרה של שגיאה
                completedSegments++;
                processState.completedSegments = completedSegments;
                processState.inProgressSegments.delete(index);
                saveProcessState();

                if (onProgress) {
                    onProgress({
                        status: 'error',
                        progress: (completedSegments / localSegments.length) * 100,
                        completedSegments,
                        totalSegments: localSegments.length,
                        currentSegmentIndex: index,
                        error: error.message
                    });
                }

                return results[index];
            }
        }

        // עיבוד קטעים בקבוצות מקבילות
        async function processInBatches() {
            const totalSegments = localSegments.length;

            // בדיקה אם יש קטעים שלא הושלמו מסבב קודם
            const incompleteSegments = [];
            for (let i = 0; i < totalSegments; i++) {
                if (results[i] === undefined || results[i] === null) {
                    incompleteSegments.push(i);
                }
            }

            console.log(`נותרו ${incompleteSegments.length} קטעים לא גמורים מתוך ${totalSegments}`);

            if (incompleteSegments.length === 0) {
                // כל הקטעים כבר מוכנים
                return;
            }

            // עיבוד בקבוצות של maxConcurrent קטעים
            for (let i = 0; i < incompleteSegments.length; i += maxConcurrent) {
                const batchPromises = [];

                // יצירת Promise לכל קטע בקבוצה הנוכחית
                for (let j = 0; j < maxConcurrent && i + j < incompleteSegments.length; j++) {
                    const segmentIndex = incompleteSegments[i + j];
                    batchPromises.push(processSegment(segmentIndex).catch(error => {
                        // לכידת שגיאות כדי שהקבוצה תמשיך גם אם קטע אחד נכשל
                        console.error(`Batch processing error for segment ${segmentIndex}:`, error);
                        return `[שגיאה בתמלול]`;
                    }));
                }

                // המתנה לסיום הקבוצה הנוכחית לפני המעבר לקבוצה הבאה
                await Promise.allSettled(batchPromises);

                // עיכוב קטן בין קבוצות כדי לא להעמיס על ה-API
                if (i + maxConcurrent < incompleteSegments.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        // עיבוד כל הקטעים בקבוצות
        await processInBatches();

        // בדיקת שלמות התוצאות
        for (let i = 0; i < localSegments.length; i++) {
            if (!results[i]) {
                results[i] = `[לא התקבל תמלול לקטע ${i + 1}]`;
            }
        }

        // נקה נתוני מצב כשסיימנו
        sessionStorage.removeItem('transcribeSegmentsState');

        // חיבור כל התוצאות לטקסט אחד
        return results.join(' ');
    }

    /**
  * תמלול באמצעות Groq API עם תמיכה בשינוי מצב החלונית
  * @param {File|Blob} audioFile - קובץ האודיו לתמלול
  * @param {string} apiKey - מפתח ה-API של Groq
  * @returns {Promise<string>} - טקסט התמלול
  */
    static async transcribeWithGroq(audioFile, apiKey) {
        if (!apiKey) throw new Error('מפתח API של Groq חסר');

        try {
            // יצירת אובייקט File מהנתונים עצמם (ולא מה-URL)
            const fileBuffer = await audioFile.arrayBuffer();
            const fileToSend = new File(
                [fileBuffer],
                audioFile.name || `audio_${Date.now()}.mp3`,
                { type: 'audio/mpeg' }
            );

            // הכנת נתוני הבקשה
            const formData = new FormData();
            formData.append("file", fileToSend);
            formData.append("model", "whisper-large-v3");
            formData.append("language", "he"); // עברית
            formData.append("response_format", "text"); // רק הטקסט, בלי JSON מיותר

            // בקשה לתמלול - שימוש באותו הקוד המקורי
            const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`
                },
                body: formData
            });

            // טיפול בשגיאות HTTP
            if (!response.ok) {
                const contentType = response.headers.get('content-type');

                // טיפול בתשובות JSON (עם פירוט השגיאה)
                if (contentType && contentType.includes('application/json')) {
                    const errorJson = await response.json();

                    // בדיקה לשגיאות Rate Limit ספציפיות
                    if (errorJson.error && (
                        errorJson.error.code === 'rate_limit_exceeded' ||
                        errorJson.error.message?.includes('Rate limit') ||
                        errorJson.error.type === 'rate_limit_exceeded'
                    )) {
                        throw new Error(`rate_limit_exceeded: ${errorJson.error.message || 'הגעת למגבלת קצב של Groq'}`);
                    }

                    throw new Error(`שגיאת API (${response.status}): ${JSON.stringify(errorJson.error)}`);
                }

                // טיפול בשגיאות טקסט רגיל
                const errorText = await response.text();
                throw new Error(`שגיאת API (${response.status}): ${errorText}`);
            }

            // קבלת התוצאה
            const text = await response.text(); // כי ביקשנו `response_format: text`
            return text.trim();

        } catch (error) {
            // בדיקה לשגיאות Rate Limit ספציפיות שלא נתפסו קודם
            if (error.message && (
                error.message.includes('rate_limit_exceeded') ||
                error.message.includes('Rate limit')
            )) {
                console.error('Rate limit error from Groq:', error.message);
                throw new Error(`rate_limit_exceeded: ${error.message}`);
            }

            throw error;
        }
    }

    /**
   * בדיקת תקינות של קובץ אודיו - עם תמיכה בחלוניות לא פעילות
   * @param {File|Blob} audioFile - קובץ האודיו לבדיקה
   * @returns {Promise<boolean>} - האם הקובץ תקין
   */
    static async isAudioFileValid(audioFile) {
        // בדיקה בטוחה לטאבים לא פעילים
        try {
            // במקום לבדוק עם אלמנט אודיו, נבדוק אם הקובץ קיים ובגודל סביר
            if (!audioFile || audioFile.size < 100) {
                return false;
            }

            // אם אפשר לקרוא את ה-arrayBuffer, הקובץ כנראה תקין
            const smallChunk = await audioFile.slice(0, Math.min(1024, audioFile.size)).arrayBuffer();
            if (smallChunk && smallChunk.byteLength > 0) {
                return true;
            }

            // נסה גם בדיקה רגילה אם האפשרות הקודמת לא הצליחה
            return new Promise((resolve) => {
                try {
                    const audio = new Audio();

                    // טיימאאוט למקרה שאין תגובה
                    const timeout = setTimeout(() => {
                        URL.revokeObjectURL(audio.src);
                        resolve(true); // במקרה של טאב לא פעיל, נניח שהקובץ תקין
                    }, 1000);

                    audio.oncanplay = () => {
                        clearTimeout(timeout);
                        URL.revokeObjectURL(audio.src);
                        resolve(true);
                    };

                    audio.onerror = () => {
                        clearTimeout(timeout);
                        URL.revokeObjectURL(audio.src);
                        resolve(false);
                    };

                    // ציפייה קצרה בלבד, כי אנחנו כבר יודעים שאפשר לקרוא את הקובץ
                    audio.src = URL.createObjectURL(audioFile);
                    audio.load();
                } catch (error) {
                    console.warn('לא ניתן לבדוק עם אלמנט אודיו, מניח שהקובץ תקין:', error);
                    resolve(true); // במקרה של ספק, נניח שהקובץ תקין
                }
            });
        } catch (error) {
            console.warn('שגיאה בבדיקת תקינות קובץ האודיו:', error);
            return true; // במקרה של ספק, נניח שהקובץ תקין
        }
    }
}

// ייצוא המודול
window.Transcription = Transcription;