/**
 * מודול לפיצול קבצי אודיו לחלקים קטנים
 */
class AudioSplitter {
    /**
     * פיצול קובץ אודיו לחלקים קטנים באמצעות שיטה פשוטה יותר (חיתוך הקובץ המקורי)
     * @param {File} audioFile - קובץ האודיו לפיצול
     * @param {number} segmentDurationParam - משך כל קטע בשניות
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<Blob[]>} מערך של קטעי אודיו
     */
    static async splitAudio(audioFile, segmentDurationParam, onProgress = null) {
        // וידוא שמשך הקטע תקין
        const segmentDuration = Number(segmentDurationParam) || 25;

        try {
            // תחילה, בדוק את אורך הקובץ
            const audioDuration = await AudioSplitter.getAudioDuration(audioFile);
            if (!audioDuration || !isFinite(audioDuration) || isNaN(audioDuration)) {
                throw new Error('⛔ זמן אודיו לא תקני: ' + audioDuration);
            }

            console.log(`אורך האודיו המקורי: ${audioDuration} שניות`);

            // אם הקובץ קצר מהזמן המבוקש, פשוט נחזיר אותו כמו שהוא
            if (audioDuration <= segmentDuration) {
                console.log("הקובץ קצר מספיק - מחזיר אותו כמו שהוא, לא נחתך");

                // אם MP3 → מחזיר כמו שהוא
                if (audioFile.type === 'audio/mp3' || audioFile.name.endsWith('.mp3')) {
                    if (onProgress) onProgress({ status: 'complete', progress: 100 });
                    return [audioFile];
                }

                // אחרת, ממיר ל־MP3 תקני
                const convertedFile = await AudioSplitter.convertToValidMp3(audioFile);
                if (onProgress) onProgress({ status: 'complete', progress: 100 });
                return [convertedFile];
            }

            // אחרת, נפצל את הקובץ לחלקים
            if (onProgress) onProgress({
                status: 'splitting',
                progress: 10,
                totalSegments: Math.ceil(audioDuration / segmentDuration),
                duration: audioDuration
            });

            // מערך שיכיל את כל הקטעים
            // פיצול הקובץ לחלקים
            // ננסה לפצל את הקובץ לפי הזמן
            // קוד מקורי שמשנים אותו:
            // return await AudioSplitter.sliceAudioFile(audioFile, segmentDuration, audioDuration, onProgress);

            // גישה חדשה:
            const segments = [];

            // טיפול מיוחד בקטע הראשון
            try {
                if (onProgress) onProgress({
                    status: 'splitting',
                    progress: 20,
                    message: 'מכין קטע ראשון מיוחד...'
                });

                const firstSegment = await AudioSplitter.handleFirstSegment(audioFile, segmentDuration);
                segments.push(firstSegment);

                // עדכון התקדמות
                if (onProgress) onProgress({
                    status: 'splitting',
                    progress: 30,
                    currentSegment: 1,
                    totalSegments: Math.ceil(audioDuration / segmentDuration)
                });

            } catch (firstSegmentError) {
                console.warn('נכשל ביצירת קטע ראשון מיוחד, חוזר לשיטה הרגילה:', firstSegmentError);

                // חישוב הגודל בבתים של הקטע הראשון
                const bytesPerSecond = audioFile.size / audioDuration;
                const endTime = Math.min(segmentDuration, audioDuration);
                const endByte = Math.floor(endTime * bytesPerSecond);

                // יצירת הקטע הראשון באמצעות חיתוך רגיל
                const firstSegmentData = await audioFile.slice(0, endByte).arrayBuffer();
                const firstSegmentBlob = new Blob([firstSegmentData], { type: audioFile.type });
                const firstSegmentFile = new File([firstSegmentBlob], `segment_1.mp3`, {
                    type: audioFile.type,
                    lastModified: new Date().getTime()
                });

                segments.push(firstSegmentFile);
            }

            // מספר הקטעים הנותרים
            const numRemainingSegments = Math.ceil(audioDuration / segmentDuration) - 1;

            if (numRemainingSegments > 0) {
                console.log(`מפצל את שאר הקובץ ל-${numRemainingSegments} קטעים נוספים של ${segmentDuration} שניות כל אחד`);

                // חישוב גודל כל קטע בבתים (בקירוב)
                const bytesPerSecond = audioFile.size / audioDuration;

                // פיצול שאר הקטעים
                for (let i = 1; i <= numRemainingSegments; i++) {
                    const startTime = i * segmentDuration;
                    const endTime = Math.min((i + 1) * segmentDuration, audioDuration);
                    const chunkDuration = endTime - startTime;

                    // חישוב הגודל בבתים
                    const startByte = Math.floor(startTime * bytesPerSecond);
                    const endByte = Math.floor(endTime * bytesPerSecond);

                    // יצירת קטע חדש
                    let segmentData;
                    if (i === numRemainingSegments) {
                        // בקטע האחרון ניקח את כל שאר הקובץ
                        segmentData = await audioFile.slice(startByte).arrayBuffer();
                    } else {
                        segmentData = await audioFile.slice(startByte, endByte).arrayBuffer();
                    }

                    const blob = new Blob([segmentData], { type: audioFile.type });
                    const segmentFile = new File([blob], `segment_${i + 1}.mp3`, {
                        type: audioFile.type,
                        lastModified: new Date().getTime()
                    });

                    segments.push(segmentFile);

                    // עדכון התקדמות
                    if (onProgress) {
                        const segmentProgress = 30 + (70 * (i) / numRemainingSegments);
                        onProgress({
                            status: 'splitting',
                            progress: segmentProgress,
                            currentSegment: i + 1,
                            totalSegments: numRemainingSegments + 1
                        });
                    }
                }
            }

            // בדיקה שהחלקים נוצרו כראוי
            if (segments.length === 0) {
                throw new Error('No audio segments were created');
            }

            if (onProgress) onProgress({ status: 'complete', progress: 100 });
            return segments;

        } catch (error) {
            console.error('Error splitting audio:', error);
            throw error;
        }
    }
    /**
     * טיפול בקטע ראשון עם דילוג גדול יותר
     * @param {File} audioFile - קובץ האודיו המקורי
     * @returns {Promise<File>} - קובץ הקטע הראשון המתוקן
     */
    static async handleFirstSegmentWithLargerSkip(audioFile) {
        try {
            // במקום לנסות לעבד מחדש את הקובץ, פשוט נחתוך אותו בצורה שונה
            const arrayBuffer = await audioFile.arrayBuffer();
            const totalSize = arrayBuffer.byteLength;

            // נדלג על 20% הראשונים של הקובץ - דילוג גדול יותר
            const skipPercent = 0.2; // 20%
            const startByte = Math.floor(totalSize * skipPercent);

            // נקח רק 70% מהגודל המקורי
            const segmentSize = Math.floor(totalSize * 0.7); // 70% מהגודל המקורי
            const endByte = Math.min(startByte + segmentSize, totalSize);

            // יצירת קטע חדש עם דילוג על ההתחלה
            const segmentData = arrayBuffer.slice(startByte, endByte);
            const blob = new Blob([segmentData], { type: 'audio/mpeg' }); // שימוש ישיר ב-audio/mpeg

            // יצירת קובץ חדש
            return new File([blob], `segment_1_fixed_large_skip.mp3`, {
                type: 'audio/mpeg',
                lastModified: Date.now()
            });
        } catch (error) {
            console.error('שגיאה בטיפול בקטע הראשון עם דילוג גדול:', error);
            throw error;
        }
    }
    /**
     * יצירת קטע ראשון תקין 
     * @param {File} audioFile - קובץ האודיו המקורי
     * @param {number} segmentDuration - אורך הקטע בשניות
     * @param {boolean} aggressiveFixing - האם להשתמש בתיקונים אגרסיביים יותר
     * @returns {Promise<File>} - קובץ הקטע הראשון המתוקן
     */
    static async createProperFirstSegment(audioFile, segmentDuration, aggressiveFixing = false) {
        try {
            // קריאת הקובץ המלא
            const arrayBuffer = await audioFile.arrayBuffer();

            // יצירת AudioContext לפענוח מלא של הקובץ
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // חישוב אורך קטע (מוגבל לאורך הקובץ המלא)
            const duration = Math.min(segmentDuration, audioBuffer.duration);

            // יצירת קטע חדש שמתחיל אחרי ההתחלה (דילוג על header/מטא-דאטה)
            // אם aggressiveFixing = true, דלג על יותר זמן
            const skipSeconds = aggressiveFixing ? 1.0 : 0.5; // חצי שניה או שניה שלמה
            const startOffset = Math.min(skipSeconds, audioBuffer.duration / 3); // לא יותר משליש מהקובץ

            // חישוב אורך הקטע החדש בהתאם
            const adjustedDuration = Math.min(duration, audioBuffer.duration - startOffset);

            // יצירת OfflineAudioContext לרנדור החלק
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                Math.ceil(adjustedDuration * audioBuffer.sampleRate),
                audioBuffer.sampleRate
            );

            // יצירת מקור והזנת הנתונים
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);

            // התחלת רנדור מהנקודה המבוקשת
            source.start(0, startOffset, adjustedDuration);
            const renderedBuffer = await offlineContext.startRendering();

            // המרה לפורמט MP3 באמצעות lamejs 
            const mp3Data = [];
            if (window.lamejs) {
                const mp3encoder = new lamejs.Mp3Encoder(
                    renderedBuffer.numberOfChannels,
                    renderedBuffer.sampleRate,
                    128 // bitrate
                );

                const sampleBlockSize = 1152; //דוגמאות פר פריים ב-MP3

                for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
                    const samples = renderedBuffer.getChannelData(ch);
                    const samplesInt16 = new Int16Array(samples.length);

                    // המרה לפורמט מתאים
                    for (let i = 0; i < samples.length; i++) {
                        samplesInt16[i] = samples[i] * 0x7FFF; // המרה ל-16-bit
                    }

                    // קידוד לפי בלוקים
                    for (let i = 0; i < samplesInt16.length; i += sampleBlockSize) {
                        const sampleChunk = samplesInt16.subarray(i, i + sampleBlockSize);
                        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                        if (mp3buf.length > 0) {
                            mp3Data.push(new Uint8Array(mp3buf));
                        }
                    }
                }

                // סיום הקידוד
                const mp3buf = mp3encoder.flush();
                if (mp3buf.length > 0) {
                    mp3Data.push(new Uint8Array(mp3buf));
                }
            } else {
                // אם אין תמיכה ב-lamejs, נשתמש ב-WAV
                // המרה ל-WAV
                const wavBlob = AudioSplitter.audioBufferToWav(renderedBuffer);
                return new File([wavBlob], `segment_1_fixed.wav`, {
                    type: 'audio/wav',
                    lastModified: Date.now()
                });
            }

            // יצירת Blob ואז קובץ
            const blob = new Blob(mp3Data, { type: 'audio/mp3' });
            return new File([blob], `segment_1_fixed.mp3`, {
                type: 'audio/mp3',
                lastModified: Date.now()
            });

        } catch (error) {
            console.error('שגיאה ביצירת קטע ראשון תקין:', error);
            throw error;
        }
    }


    /**
 * קבלת אורך קובץ אודיו
 * @param {File} audioFile - קובץ האודיו
 * @returns {Promise<number>} - אורך הקובץ בשניות
 */
    static async getAudioDuration(audioFile) {
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


    /**
     * חיתוך קובץ האודיו המקורי לחלקים ללא המרה לפורמט אחר
     * שיטה זו עדיפה כי היא משמרת את הפורמט המקורי
     * @param {File} audioFile - קובץ האודיו המקורי
     * @param {number} segmentDuration - אורך כל קטע בשניות
     * @param {number} totalDuration - אורך האודיו המלא בשניות
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<Blob[]>} - מערך של חלקי האודיו
     */
    static async sliceAudioFile(audioFile, segmentDuration, totalDuration, onProgress) {
        return new Promise(async (resolve, reject) => {
            try {
                // קריאת הקובץ כמערך בינארי
                const arrayBuffer = await audioFile.arrayBuffer();

                // חישוב מספר הקטעים
                const numSegments = Math.ceil(totalDuration / segmentDuration);
                console.log(`מפצל ל-${numSegments} קטעים של ${segmentDuration} שניות כל אחד`);

                // חישוב גודל כל קטע בבתים (בקירוב)
                const bytesPerSecond = arrayBuffer.byteLength / totalDuration;

                // יצירת קטעים
                const segments = [];

                for (let i = 0; i < numSegments; i++) {
                    const startTime = i * segmentDuration;
                    const endTime = Math.min((i + 1) * segmentDuration, totalDuration);
                    const chunkDuration = endTime - startTime;

                    // חישוב הגודל בבתים
                    const startByte = Math.floor(startTime * bytesPerSecond);
                    const endByte = Math.floor(endTime * bytesPerSecond);

                    // יצירת קטע חדש
                    let segmentData;
                    if (i === numSegments - 1) {
                        // בקטע האחרון ניקח את כל שאר הקובץ
                        segmentData = arrayBuffer.slice(startByte);
                    } else {
                        segmentData = arrayBuffer.slice(startByte, endByte);
                    }

                    // יצירת Blob מהקטע
                    // נשמור על סוג הקובץ המקורי
                    const blob = new Blob([segmentData], { type: audioFile.type });

                    // הוספת מידע זמני לקטע
                    const segmentFile = new File([blob], `segment_${i + 1}.mp3`, {
                        type: audioFile.type,
                        lastModified: new Date().getTime()
                    });

                    segments.push(segmentFile);

                    // עדכון התקדמות
                    if (onProgress) {
                        const segmentProgress = 10 + (80 * (i + 1) / numSegments);
                        onProgress({
                            status: 'splitting',
                            progress: segmentProgress,
                            currentSegment: i + 1,
                            totalSegments: numSegments
                        });
                    }
                }

                // בדיקה שהחלקים נוצרו כראוי
                if (segments.length === 0) {
                    reject(new Error('No audio segments were created'));
                    return;
                }

                if (onProgress) onProgress({ status: 'complete', progress: 100 });
                resolve(segments);

            } catch (error) {
                console.error('Error slicing audio file:', error);
                reject(error);
            }
        });
    }

    /**
 * טיפול מיוחד בקטע הראשון - פשוט יותר, בלי תלות בספריות חיצוניות
 * @param {File} audioFile - קובץ האודיו המקורי
 * @param {number} segmentDuration - אורך הקטע בשניות
 * @returns {Promise<File>} - קובץ הקטע הראשון המתוקן
 */
    static async handleFirstSegment(audioFile, segmentDuration) {
        try {
            // במקום לנסות לעבד מחדש את הקובץ, פשוט נחתוך אותו בצורה שונה
            const arrayBuffer = await audioFile.arrayBuffer();
            const totalSize = arrayBuffer.byteLength;

            // נדלג על 10% הראשונים של הקובץ כדי להימנע ממטא-דאטה פגום
            const skipPercent = 0.1; // 10%
            const startByte = Math.floor(totalSize * skipPercent);

            // נקח רק חלק מהגודל המקורי
            const segmentSize = Math.floor(totalSize * 0.8); // 80% מהגודל המקורי
            const endByte = Math.min(startByte + segmentSize, totalSize);

            // יצירת קטע חדש עם דילוג על ההתחלה
            const segmentData = arrayBuffer.slice(startByte, endByte);
            const blob = new Blob([segmentData], { type: audioFile.type });

            // יצירת קובץ חדש
            return new File([blob], `segment_1_fixed.mp3`, {
                type: audioFile.type,
                lastModified: Date.now()
            });
        } catch (error) {
            console.error('שגיאה בטיפול בקטע הראשון:', error);
            throw error;
        }
    }

    /**
     * תיקון סוג MIME של קטע אודיו
     * @param {File} segment - קטע האודיו לתיקון
     * @returns {File} - קטע אודיו עם סוג MIME מתוקן
     */
    static fixFirstSegmentMimeType(segment) {
        // יצירת עותק של הקובץ עם סוג MIME שונה
        return new File([segment], segment.name, {
            type: 'audio/mpeg', // שנה ל-audio/mpeg במקום audio/mp3
            lastModified: Date.now()
        });
    }

    /**
     * המרת AudioBuffer לקובץ WAV - שיטה ישנה (לא בשימוש עכשיו)
     * אנחנו שומרים את זה למקרה שנצטרך לחזור אליו
     * @param {AudioBuffer} audioBuffer - ה-AudioBuffer להמרה
     * @returns {Blob} קובץ WAV כ-Blob
     */
    static audioBufferToWav(audioBuffer) {
        const numOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChannels * 2; // כל דגימה היא 2 בתים
        const sampleRate = audioBuffer.sampleRate;

        // יצירת מערך הבתים של קובץ ה-WAV
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        // כתיבת ה-WAV header
        // "RIFF" chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');

        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (1 for PCM)
        view.setUint16(22, numOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numOfChannels * 2, true); // byte rate
        view.setUint16(32, numOfChannels * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample

        // "data" sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        // כתיבת נתוני האודיו
        let offset = 44;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, value, true);
                offset += 2;
            }
        }

        // יצירת ה-Blob
        return new Blob([buffer], { type: 'audio/wav' });

        // פונקציה פנימית לכתיבת מחרוזת ל-DataView
        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
    }


}

// ייצוא המודול
window.AudioSplitter = AudioSplitter;