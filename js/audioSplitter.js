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
            console.log(`אורך האודיו המקורי: ${audioDuration} שניות`);
            
            // אם הקובץ קצר מהזמן המבוקש, פשוט נחזיר אותו כמו שהוא
            if (audioDuration <= segmentDuration) {
                console.log("הקובץ קצר מספיק - מחזיר את הקובץ המקורי");
                if (onProgress) onProgress({ status: 'complete', progress: 100 });
                return [audioFile];
            }
            
            // אחרת, נפצל את הקובץ לחלקים
            if (onProgress) onProgress({ 
                status: 'splitting', 
                progress: 10,
                totalSegments: Math.ceil(audioDuration / segmentDuration),
                duration: audioDuration 
            });
            
            // ננסה לפצל את הקובץ לפי הזמן
            return await AudioSplitter.sliceAudioFile(audioFile, segmentDuration, audioDuration, onProgress);
            
        } catch (error) {
            console.error('Error splitting audio:', error);
            throw error;
        }
    }
    
    /**
     * קבלת אורך הקובץ בשניות
     * @param {File} audioFile - קובץ האודיו
     * @returns {Promise<number>} - אורך הקובץ בשניות
     */
    static async getAudioDuration(audioFile) {
        return new Promise((resolve, reject) => {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';
            
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(audio.src);
                resolve(audio.duration);
            };
            
            audio.onerror = (err) => {
                URL.revokeObjectURL(audio.src);
                reject(new Error('Failed to load audio metadata'));
            };
            
            audio.src = URL.createObjectURL(audioFile);
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
                    const segmentFile = new File([blob], `segment_${i+1}.mp3`, { 
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