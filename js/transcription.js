/**
 * מודול לתמלול קבצי אודיו באמצעות OpenAI Whisper ו-Ivrit.ai - עם תמיכה בחילוק קבצים גדולים משופרת
 */
class Transcription {
    /**
     * תמלול קובץ אודיו בודד עם OpenAI Whisper
     */
    static async transcribeSingleOpenAI(audioFile, apiKey) {
        if (!apiKey) {
            throw new Error('מפתח API של OpenAI חסר');
        }

        try {
            if (audioFile.size > 25 * 1024 * 1024) {
                throw new Error('הקובץ גדול מדי - מקסימום 25MB');
            }

            let audioFileClone = new File(
                [await audioFile.arrayBuffer()],
                audioFile.name || 'audio.mp3',
                { type: audioFile.type || 'audio/mpeg' }
            );

            const formData = new FormData();
            formData.append("file", audioFileClone);
            formData.append("model", "whisper-1");
            formData.append("language", "he");
            formData.append("response_format", "text");

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
            throw error;
        }
    }

    /**
     * תמלול קובץ גדול עם חילוק לחלקים (OpenAI)
     */
    static async transcribeLargeFileOpenAI(audioFile, apiKey, onProgress = null) {
        try {
            const chunks = await AudioSplitter.splitBySize(audioFile, 24 * 1024 * 1024, (splitProgress) => {
                if (onProgress) {
                    onProgress({
                        status: 'splitting',
                        progress: splitProgress.progress * 0.2,
                        message: splitProgress.message || 'מחלק קובץ...'
                    });
                }
            });

            const transcriptions = [];

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                if (onProgress) {
                    const progressBase = 20;
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

                try {
                    const transcription = await Transcription.transcribeSingleOpenAI(chunk, apiKey);
                    transcriptions.push(transcription);

                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                } catch (chunkError) {
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

            return transcriptions.join(' ');

        } catch (error) {
            throw error;
        }
    }

    /**
     * תמלול עם OpenAI Whisper (קובץ יחיד או מחולק)
     */
    static async transcribeOpenAI(audioFile, apiKey, onProgress = null) {
        const maxSingleFileSize = 24 * 1024 * 1024; // 24MB

        if (audioFile.size <= maxSingleFileSize) {
            if (onProgress) {
                onProgress({
                    status: 'transcribing',
                    progress: 10,
                    message: 'שולח לOpenAI Whisper...'
                });
            }

            const result = await Transcription.transcribeSingleOpenAI(audioFile, apiKey);

            if (onProgress) {
                onProgress({
                    status: 'complete',
                    progress: 100,
                    message: 'התמלול הושלם!'
                });
            }

            return result;
        } else {
            return await Transcription.transcribeLargeFileOpenAI(audioFile, apiKey, onProgress);
        }
    }

    /**
     * תמלול עם Ivrit.ai דרך RunPod - עם תמיכה בחילוק קבצים משופרת
     */
    static async transcribeIvrit(audioFile, apiKey, endpointId, onProgress = null) {
        if (!apiKey || !endpointId) {
            throw new Error('נדרשים מפתח API ו-Endpoint ID של RunPod');
        }

        // הגדרת גבולות מדויקים יותר לIvrit.ai
        const IVRIT_SINGLE_FILE_LIMIT = 15 * 1024 * 1024; // 15MB - בטוח יותר
        const IVRIT_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB לחלקים - בטוח מאוד

        console.log(`[Ivrit.ai] גודל קובץ: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);

        if (audioFile.size <= IVRIT_SINGLE_FILE_LIMIT) {
            // קובץ קטן - ניסיון ישיר
            try {
                console.log('[Ivrit.ai] מנסה תמלול ישיר (קובץ קטן)');
                if (onProgress) {
                    onProgress({
                        status: 'transcribing',
                        progress: 20,
                        message: 'שולח ל-Ivrit.ai...',
                        currentChunk: 1,
                        totalChunks: 1
                    });
                }

                const result = await this.transcribeSingleIvrit(audioFile, apiKey, endpointId);
                
                if (onProgress) {
                    onProgress({
                        status: 'complete',
                        progress: 100,
                        message: 'התמלול הושלם!'
                    });
                }

                return result;
            } catch (error) {
                console.warn('[Ivrit.ai] תמלול ישיר נכשל, מנסה חילוק:', error.message);
                // אם נכשל בגלל גודל או סיבה אחרת, ננסה חילוק
                return await this.transcribeLargeFileIvrit(audioFile, apiKey, endpointId, onProgress, IVRIT_CHUNK_SIZE);
            }
        } else {
            // קובץ גדול - חילוק ישיר
            console.log('[Ivrit.ai] קובץ גדול - מתחיל חילוק');
            return await this.transcribeLargeFileIvrit(audioFile, apiKey, endpointId, onProgress, IVRIT_CHUNK_SIZE);
        }
    }

    /**
     * תמלול קובץ יחיד עם Ivrit.ai
     */
    static async transcribeSingleIvrit(audioFile, apiKey, endpointId) {
        console.log(`[Ivrit.ai] מתמלל קובץ יחיד: ${audioFile.name}, גודל: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const s = typeof reader.result === 'string' ? reader.result : '';
                    resolve(s.split(',')[1] || '');
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        const base64Data = await fileToBase64(audioFile);

        const payload = {
            type: 'blob',
            data: base64Data,
            model: 'ivrit-ai/whisper-large-v3-turbo-ct2',
            engine: 'faster-whisper'
        };

        const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input: payload })
        });

        if (!response.ok) {
            let errorMessage = `שגיאת Ivrit.ai API (${response.status})`;
            try {
                const err = await response.json();
                if (err?.error) errorMessage += `: ${err.error}`;
            } catch {
                errorMessage += `: ${await response.text()}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        const transcription = this.extractTextFromIvritResponse(result);
        
        console.log(`[Ivrit.ai] תמלול הושלם בהצלחה: ${transcription.length} תווים`);
        return transcription;
    }

    /**
     * תמלול קבצים גדולים עם חילוק - Ivrit.ai משופר
     */
    static async transcribeLargeFileIvrit(audioFile, apiKey, endpointId, onProgress = null, chunkSize = 8 * 1024 * 1024) {
        try {
            console.log(`[Ivrit.ai] מתחיל חילוק קובץ גדול: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);
            console.log(`[Ivrit.ai] גודל חלק: ${(chunkSize / 1024 / 1024).toFixed(2)}MB`);

            // חילוק הקובץ לחלקים
            const chunks = await AudioSplitter.splitBySize(audioFile, chunkSize, (splitProgress) => {
                if (onProgress) {
                    onProgress({
                        status: 'splitting',
                        progress: splitProgress.progress * 0.15, // 15% מהתהליך הכולל
                        message: `מחלק קובץ לחלקים של ${(chunkSize / 1024 / 1024).toFixed(0)}MB...`,
                        currentChunk: splitProgress.currentChunk || 0,
                        totalChunks: splitProgress.totalChunks || Math.ceil(audioFile.size / chunkSize)
                    });
                }
            });

            console.log(`[Ivrit.ai] קובץ חולק ל-${chunks.length} חלקים`);

            // תמלול כל חלק בנפרד
            const transcriptions = [];
            let successfulChunks = 0;
            let failedChunks = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkSizeMB = (chunk.size / 1024 / 1024).toFixed(2);

                if (onProgress) {
                    const progressBase = 15; // אחרי 15% של החילוק
                    const progressPerChunk = 85 / chunks.length; // 85% נותרים לתמלול
                    const currentProgress = progressBase + (i * progressPerChunk);

                    onProgress({
                        status: 'transcribing',
                        progress: currentProgress,
                        message: `מתמלל חלק ${i + 1} מתוך ${chunks.length} (${chunkSizeMB}MB)...`,
                        currentChunk: i + 1,
                        totalChunks: chunks.length
                    });
                }

                try {
                    console.log(`[Ivrit.ai] מתמלל חלק ${i + 1}/${chunks.length}: ${chunkSizeMB}MB`);
                    
                    const transcription = await this.transcribeSingleIvrit(chunk, apiKey, endpointId);
                    transcriptions.push(transcription);
                    successfulChunks++;
                    
                    console.log(`[Ivrit.ai] חלק ${i + 1} הושלם: ${transcription.length} תווים`);

                    // עיכוב בין בקשות כדי לא להעמיס על ה-API
                    if (i < chunks.length - 1) {
                        console.log('[Ivrit.ai] מחכה 3 שניות לפני החלק הבא...');
                        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 שניות
                    }

                } catch (chunkError) {
                    console.error(`[Ivrit.ai] שגיאה בחלק ${i + 1}:`, chunkError.message);
                    failedChunks++;
                    
                    // הוספת הודעת שגיאה לתמלול
                    transcriptions.push(`[שגיאה בתמלול חלק ${i + 1}: ${chunkError.message}]`);
                    
                    // המשך גם עם שגיאות - לא נעצור את כל התהליך
                }
            }

            if (onProgress) {
                onProgress({
                    status: 'complete',
                    progress: 100,
                    message: `התמלול הושלם! (${successfulChunks} חלקים הצליחו, ${failedChunks} נכשלו)`
                });
            }

            // סיכום התוצאות
            console.log(`[Ivrit.ai] סיכום: ${successfulChunks} חלקים הצליחו, ${failedChunks} נכשלו`);
            
            // חיבור כל התמלולים לטקסט אחד
            const fullTranscription = transcriptions.join(' ');
            
            console.log(`[Ivrit.ai] תמלול מלא הושלם: ${fullTranscription.length} תווים`);
            
            return fullTranscription;

        } catch (error) {
            console.error('[Ivrit.ai] שגיאה כללית בתמלול:', error);
            throw error;
        }
    }

    /**
     * חילוץ טקסט מתגובת Ivrit.ai - משופר
     */
    static extractTextFromIvritResponse(result) {
        let text = '';

        try {
            const output = result?.output || result;

            // המבנה הספציפי של Ivrit.ai: output[0].result[].text
            if (Array.isArray(output) && output[0] && Array.isArray(output[0].result)) {
                text = output[0].result
                    .map(segment => segment?.text || '')
                    .filter(t => t.trim())
                    .join(' ');
            }
            // אפשרות חלופית: output.result[].text
            else if (output && Array.isArray(output.result)) {
                text = output.result
                    .map(segment => segment?.text || '')
                    .filter(t => t.trim())
                    .join(' ');
            }
            // חיפוש עמוק אחר טקסט בכל המבנה
            else {
                text = this.findTextInResponse(output);
            }

        } catch (parseError) {
            console.error('[Ivrit.ai] שגיאה בעיבוד תגובה:', parseError);
            throw new Error('שגיאה בעיבוד תגובת Ivrit.ai');
        }

        // ולידציה סופית
        if (!text || text.trim().length === 0) {
            console.error('[Ivrit.ai] תגובה ריקה מהשרת:', JSON.stringify(result, null, 2));
            throw new Error('Ivrit.ai החזיר תשובה ללא טקסט תמלול.');
        }

        return text.trim();
    }

    /**
     * פונקציה עזר לחיפוש טקסט בכל מבנה התגובה
     */
    static findTextInResponse(obj, depth = 0) {
        if (depth > 5) return ''; // מניעת לולאה אינסופית

        if (typeof obj === 'string' && obj.trim().length > 10) {
            return obj;
        }

        if (Array.isArray(obj)) {
            for (const item of obj) {
                const found = this.findTextInResponse(item, depth + 1);
                if (found) return found;
            }
        }

        if (obj && typeof obj === 'object') {
            // חיפוש בשדות נפוצים קודם
            const commonFields = ['text', 'transcription', 'content', 'transcript'];
            for (const field of commonFields) {
                if (obj[field] && typeof obj[field] === 'string' && obj[field].trim().length > 0) {
                    return obj[field];
                }
            }

            // חיפוש בכל השדות
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && value.trim().length > 10) {
                    return value;
                }
                if (typeof value === 'object') {
                    const found = this.findTextInResponse(value, depth + 1);
                    if (found) return found;
                }
            }
        }

        return '';
    }

    /**
     * פונקציה ראשית לתמלול - תומכת במספר ספקים
     */
    static async transcribe(audioFile, provider, apiKey, onProgress = null, endpointId = null) {
        if (!audioFile) {
            throw new Error('קובץ אודיו חסר');
        }

        if (!provider) {
            throw new Error('ספק תמלול חסר');
        }

        if (!apiKey) {
            throw new Error('מפתח API חסר');
        }

        switch (provider) {
            case 'openai':
                return await this.transcribeOpenAI(audioFile, apiKey, onProgress);

            case 'ivrit':
                return await this.transcribeIvrit(audioFile, apiKey, endpointId, onProgress);

            default:
                throw new Error(`ספק תמלול לא נתמך: ${provider}`);
        }
    }

    /**
     * בדיקת תקינות של קובץ אודיו
     */
    static async isAudioFileValid(audioFile) {
        try {
            if (!audioFile || audioFile.size < 100) {
                return false;
            }

            const smallChunk = await audioFile.slice(0, Math.min(1024, audioFile.size)).arrayBuffer();
            if (smallChunk && smallChunk.byteLength > 0) {
                return true;
            }

            return new Promise((resolve) => {
                try {
                    const audio = new Audio();
                    const timeout = setTimeout(() => {
                        URL.revokeObjectURL(audio.src);
                        resolve(true);
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
                    resolve(true);
                }
            });
        } catch (error) {
            return true;
        }
    }

    /**
     * קבלת מידע על ספק התמלול - עדכון לIvrit.ai
     */
    static getProviderInfo(provider) {
        const providers = {
            openai: {
                name: 'OpenAI Whisper',
                maxFileSize: 25 * 1024 * 1024, // 25MB
                supportsLargeFiles: true,
                description: 'תמלול מדויק באיכות גבוהה',
                languages: ['he', 'en', 'ar', 'fr', 'es'],
                pricing: '$0.006 לדקה'
            },
            ivrit: {
                name: 'Ivrit.ai',
                maxFileSize: 15 * 1024 * 1024, // 15MB לקובץ יחיד
                chunkSize: 8 * 1024 * 1024, // 8MB לחלקים
                supportsLargeFiles: true,
                description: 'תמלול מותאם במיוחד לעברית עם חילוק חכם ל-8MB',
                languages: ['he'],
                pricing: 'משתנה לפי RunPod'
            }
        };

        return providers[provider] || null;
    }

    /**
     * בדיקה האם ספק תומך בגודל קובץ מסוים
     */
    static supportsFileSize(provider, fileSize) {
        const providerInfo = this.getProviderInfo(provider);
        if (!providerInfo) return false;

        // עבור Ivrit.ai - תמיד נתמוך בגלל החילוק החכם
        if (provider === 'ivrit') {
            return true; // תמיכה בכל גודל עם חילוק
        }

        return fileSize <= providerInfo.maxFileSize;
    }

    /**
     * המלצה על ספק מתאים לקובץ
     */
    static recommendProvider(audioFile, availableProviders = ['openai', 'ivrit']) {
        if (!audioFile) return availableProviders[0];

        const fileSize = audioFile.size;
        const fileSizeMB = fileSize / (1024 * 1024);

        // עבור קבצים קטנים מ-10MB - Ivrit.ai יהיה טוב
        if (fileSizeMB <= 10 && availableProviders.includes('ivrit')) {
            return 'ivrit';
        }

        // עבור קבצים בינוניים (10-25MB) - תלוי בזמינות
        if (fileSizeMB <= 25) {
            if (availableProviders.includes('openai')) {
                return 'openai';
            }
            if (availableProviders.includes('ivrit')) {
                return 'ivrit';
            }
        }

        // עבור קבצים גדולים - שניהם תומכים בחילוק
        if (availableProviders.includes('openai')) {
            return 'openai';
        }

        return availableProviders[0];
    }
}

// ייצוא המודול
window.Transcription = Transcription;