/**
 * מודול לתמלול קבצי אודיו באמצעות OpenAI Whisper API - עם תמיכה בחילוק קבצים גדולים
 */
class Transcription {
    /**
     * תמלול קובץ אודיו בודד עם OpenAI Whisper
     * @param {Blob} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של OpenAI
     * @returns {Promise<string>} - טקסט התמלול
     */
    static async transcribeSingle(audioFile, apiKey) {
        if (!apiKey) {
            throw new Error('מפתח API של OpenAI חסר');
        }

        try {
            // בדיקת גודל הקובץ (מגבלה 25MB של OpenAI)
            if (audioFile.size > 25 * 1024 * 1024) {
                throw new Error('הקובץ גדול מדי - מקסימום 25MB');
            }

            // יצירת עותק של הקובץ
            let audioFileClone = new File(
                [await audioFile.arrayBuffer()],
                audioFile.name || 'audio.mp3',
                { type: audioFile.type || 'audio/mpeg' }
            );

            console.log(`🎧 שולח לOpenAI Whisper: ${audioFileClone.name}, גודל: ${(audioFileClone.size / 1024 / 1024).toFixed(2)}MB, סוג: ${audioFileClone.type}`);

            // יצירת FormData לשליחת הקובץ
            const formData = new FormData();
            formData.append("file", audioFileClone);
            formData.append("model", "whisper-1");
            formData.append("language", "he"); // עברית
            formData.append("response_format", "text");

            // שליחת הקובץ ל-API של OpenAI
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                let errorMessage = `שגיאת API (${response.status})`;
                
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.message) {
                        errorMessage += `: ${errorData.error.message}`;
                    }
                } catch (e) {
                    const errorText = await response.text();
                    errorMessage += `: ${errorText}`;
                }
                
                throw new Error(errorMessage);
            }

            const text = await response.text();
            return text.trim();

        } catch (error) {
            console.error('Error in OpenAI transcription:', error);
            throw error;
        }
    }

    /**
     * תמלול קובץ גדול עם חילוק לחלקים
     * @param {File} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של OpenAI
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<string>} - טקסט התמלול המלא
     */
    static async transcribeLargeFile(audioFile, apiKey, onProgress = null) {
        try {
            console.log(`מתחיל תמלול קובץ גדול: ${audioFile.name}, גודל: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);

            // חילוק הקובץ לחלקים של 24MB
            const chunks = await AudioSplitter.splitBySize(audioFile, 24 * 1024 * 1024, (splitProgress) => {
                if (onProgress) {
                    onProgress({
                        status: 'splitting',
                        progress: splitProgress.progress * 0.2, // 20% מהתהליך הכולל
                        message: splitProgress.message || 'מחלק קובץ...'
                    });
                }
            });

            console.log(`הקובץ חולק ל-${chunks.length} חלקים`);

            // תמלול כל חלק בנפרד
            const transcriptions = [];
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                
                if (onProgress) {
                    const progressBase = 20; // אחרי 20% של החילוק
                    const progressPerChunk = 80 / chunks.length;
                    const currentProgress = progressBase + (i * progressPerChunk);
                    
                    onProgress({
                        status: 'transcribing',
                        progress: currentProgress,
                        message: `מתמלל חלק ${i + 1} מתוך ${chunks.length}...`,
                        currentChunk: i + 1,
                        totalChunks: chunks.length
                    });
                }

                console.log(`מתמלל חלק ${i + 1}/${chunks.length}: ${chunk.name} (${(chunk.size / 1024 / 1024).toFixed(2)}MB)`);
                
                try {
                    const transcription = await Transcription.transcribeSingle(chunk, apiKey);
                    transcriptions.push(transcription);
                    
                    // עיכוב קטן בין בקשות כדי לא להעמיס על ה-API
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                } catch (chunkError) {
                    console.error(`שגיאה בתמלול חלק ${i + 1}:`, chunkError);
                    transcriptions.push(`[שגיאה בתמלול חלק ${i + 1}: ${chunkError.message}]`);
                }
            }

            if (onProgress) {
                onProgress({
                    status: 'complete',
                    progress: 100,
                    message: 'התמלול הושלם!'
                });
            }

            // חיבור כל התמלולים לטקסט אחד
            const fullTranscription = transcriptions.join(' ');
            
            console.log(`תמלול הושלם. אורך טקסט: ${fullTranscription.length} תווים`);
            
            return fullTranscription;

        } catch (error) {
            console.error('שגיאה בתמלול קובץ גדול:', error);
            throw error;
        }
    }

    /**
     * פונקציה ראשית לתמלול - בוחרת אוטומטית בין תמלול רגיל לתמלול עם חילוק
     * @param {File} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של OpenAI
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<string>} - טקסט התמלול
     */
    static async transcribe(audioFile, apiKey, onProgress = null) {
        const maxSingleFileSize = 24 * 1024 * 1024; // 24MB

        if (audioFile.size <= maxSingleFileSize) {
            // קובץ קטן - תמלול רגיל
            console.log('קובץ קטן, תמלול רגיל');
            
            if (onProgress) {
                onProgress({
                    status: 'transcribing',
                    progress: 10,
                    message: 'שולח לOpenAI Whisper...'
                });
            }

            const result = await Transcription.transcribeSingle(audioFile, apiKey);
            
            if (onProgress) {
                onProgress({
                    status: 'complete',
                    progress: 100,
                    message: 'התמלול הושלם!'
                });
            }
            
            return result;
        } else {
            // קובץ גדול - תמלול עם חילוק
            console.log('קובץ גדול, תמלול עם חילוק');
            return await Transcription.transcribeLargeFile(audioFile, apiKey, onProgress);
        }
    }

    /**
     * בדיקת תקינות של קובץ אודיו
     * @param {File|Blob} audioFile - קובץ האודיו לבדיקה
     * @returns {Promise<boolean>} - האם הקובץ תקין
     */
    static async isAudioFileValid(audioFile) {
        try {
            // בדיקה בסיסית
            if (!audioFile || audioFile.size < 100) {
                return false;
            }

            // בדיקה אם אפשר לקרוא את הקובץ
            const smallChunk = await audioFile.slice(0, Math.min(1024, audioFile.size)).arrayBuffer();
            if (smallChunk && smallChunk.byteLength > 0) {
                return true;
            }

            // בדיקה עם אלמנט אודיו
            return new Promise((resolve) => {
                try {
                    const audio = new Audio();
                    const timeout = setTimeout(() => {
                        URL.revokeObjectURL(audio.src);
                        resolve(true); // במקרה של ספק, נניח שהקובץ תקין
                    }, 2000);

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

                    audio.src = URL.createObjectURL(audioFile);
                    audio.load();
                } catch (error) {
                    console.warn('לא ניתן לבדוק עם אלמנט אודיו, מניח שהקובץ תקין:', error);
                    resolve(true);
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