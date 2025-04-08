/**
 * מודול לתמלול קבצי אודיו באמצעות Huggingface
 */
class Transcription {
    /**
     * תמלול קובץ אודיו בודד
     * @param {Blob} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של Huggingface
     * @returns {Promise<string>} - טקסט התמלול
     */
    static async transcribeSingle(audioFile, apiKey) {
        if (!apiKey) {
            throw new Error('מפתח API חסר');
        }
        
        // יצירת FormData לשליחת הקובץ
        const formData = new FormData();
        
        try {
            // בדיקה אם הקובץ הוא מסוג File או Blob
            if (audioFile instanceof File) {
                console.log(`שולח קובץ: ${audioFile.name}, גודל: ${audioFile.size} בתים, סוג: ${audioFile.type}`);
                formData.append('file', audioFile);
            } else if (audioFile instanceof Blob) {
                // יצירת אובייקט File מה-Blob
                const fileName = `audio_segment_${new Date().getTime()}.mp3`;
                const file = new File([audioFile], fileName, { type: 'audio/mpeg' });
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
            throw error;
        }
    }
    
    /**
     * תמלול מספר קטעים של אודיו באופן מקבילי
     * @param {Blob[]} audioSegments - מערך של קטעי אודיו
     * @param {string} apiKey - מפתח ה-API של Huggingface
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @param {number} maxConcurrent - מספר מקסימלי של בקשות במקביל
     * @returns {Promise<string>} - טקסט התמלול המלא
     */
    static async transcribeSegments(audioSegments, apiKey, onProgress = null, maxConcurrent = 2) {
        if (!apiKey) {
            throw new Error('מפתח API חסר');
        }
        
        if (!audioSegments || audioSegments.length === 0) {
            return '';
        }
        
        console.log(`מתחיל תמלול ${audioSegments.length} קטעים`);
        
        const results = new Array(audioSegments.length);
        let completedSegments = 0;
        
        // פונקציה לעיבוד קטע בודד
        async function processSegment(index) {
            try {
                const segment = audioSegments[index];
                
                console.log(`מתמלל קטע ${index + 1}/${audioSegments.length}`);
                
                // תמלול הקטע
                const transcription = await Transcription.transcribeSingle(segment, apiKey);
                
                // שמירת התוצאה במיקום המתאים במערך
                results[index] = transcription;
                
                // עדכון ההתקדמות
                completedSegments++;
                
                if (onProgress) {
                    onProgress({
                        status: 'transcribing',
                        progress: (completedSegments / audioSegments.length) * 100,
                        completedSegments,
                        totalSegments: audioSegments.length,
                        currentSegmentIndex: index
                    });
                }
                
                return transcription;
            } catch (error) {
                console.error(`Error transcribing segment ${index + 1}:`, error);
                results[index] = `[שגיאה בתמלול קטע ${index + 1}: ${error.message}]`;
                
                // עדכון ההתקדמות גם במקרה של שגיאה
                completedSegments++;
                if (onProgress) {
                    onProgress({
                        status: 'error',
                        progress: (completedSegments / audioSegments.length) * 100,
                        completedSegments,
                        totalSegments: audioSegments.length,
                        currentSegmentIndex: index,
                        error: error.message
                    });
                }
                
                throw error;
            }
        }
        
        // עיבוד קטעים בקבוצות מקבילות
        async function processInBatches() {
            const totalSegments = audioSegments.length;
            
            // עיבוד בקבוצות של maxConcurrent קטעים
            for (let i = 0; i < totalSegments; i += maxConcurrent) {
                const batchPromises = [];
                
                // יצירת Promise לכל קטע בקבוצה הנוכחית
                for (let j = 0; j < maxConcurrent && i + j < totalSegments; j++) {
                    batchPromises.push(processSegment(i + j).catch(error => {
                        // לכידת שגיאות כדי שהקבוצה תמשיך גם אם קטע אחד נכשל
                        console.error(`Batch processing error for segment ${i + j}:`, error);
                        return `[שגיאה בתמלול]`;
                    }));
                }
                
                // המתנה לסיום הקבוצה הנוכחית לפני המעבר לקבוצה הבאה
                await Promise.allSettled(batchPromises);
                
                // עיכוב קטן בין קבוצות כדי לא להעמיס על ה-API
                if (i + maxConcurrent < totalSegments) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        // עיבוד כל הקטעים בקבוצות
        await processInBatches();
        
        // בדיקת שלמות התוצאות
        for (let i = 0; i < audioSegments.length; i++) {
            if (!results[i]) {
                results[i] = `[לא התקבל תמלול לקטע ${i + 1}]`;
            }
        }
        
        // חיבור כל התוצאות לטקסט אחד
        return results.join(' ');
    }
    
    /**
     * בדיקת תקינות של קובץ אודיו
     * @param {File|Blob} audioFile - קובץ האודיו לבדיקה
     * @returns {Promise<boolean>} - האם הקובץ תקין
     */
    static async isAudioFileValid(audioFile) {
        return new Promise((resolve) => {
            try {
                const audio = new Audio();
                
                audio.oncanplay = () => {
                    URL.revokeObjectURL(audio.src);
                    resolve(true);
                };
                
                audio.onerror = () => {
                    URL.revokeObjectURL(audio.src);
                    resolve(false);
                };
                
                audio.src = URL.createObjectURL(audioFile);
            } catch (error) {
                console.error('Error validating audio file:', error);
                resolve(false);
            }
        });
    }
}

// ייצוא המודול
window.Transcription = Transcription;