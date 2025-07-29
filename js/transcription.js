/**
 * מודול לתמלול קבצי אודיו באמצעות OpenAI Whisper ו-Ivrit.ai - תוקן
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
            const chunkSize = 24 * 1024 * 1024; // 24MB
            const expectedChunks = Math.ceil(audioFile.size / chunkSize);

            const chunks = await AudioSplitter.splitBySize(audioFile, chunkSize, (splitProgress) => {
                if (onProgress) {
                    onProgress({
                        status: 'splitting',
                        progress: splitProgress.progress * 0.2,
                        message: `מחלק קובץ ל-${expectedChunks} חלקים...`,
                        currentChunk: splitProgress.currentChunk,
                        totalChunks: expectedChunks
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
                        message: `מעביר חלק ${i + 1} מתוך ${chunks.length} דרך OpenAI Whisper...`,
                        currentChunk: i + 1,
                        totalChunks: chunks.length,
                        provider: 'OpenAI'
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
                    message: 'שולח ל-OpenAI Whisper...',
                    provider: 'OpenAI'
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
     * תמלול עם Ivrit.ai דרך RunPod - חילוק ל-10MB
     */
    static async transcribeIvrit(audioFile, apiKey, endpointId, onProgress = null) {
        if (!apiKey || !endpointId) {
            throw new Error('נדרשים מפתח API ו-Endpoint ID של RunPod');
        }

        // מגבלות Ivrit.ai - חילוק ל-10MB
        const IVRIT_SINGLE_FILE_LIMIT = 10 * 1024 * 1024; // 10MB
        const IVRIT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB לחלקים גם כן

        if (audioFile.size <= IVRIT_SINGLE_FILE_LIMIT) {
            // קובץ קטן - ניסיון ישיר
            try {
                if (onProgress) {
                    onProgress({
                        status: 'transcribing',
                        progress: 20,
                        message: 'שולח ל-Ivrit.ai...',
                        currentChunk: 1,
                        totalChunks: 1,
                        provider: 'Ivrit.ai'
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
                // אם נכשל, ננסה חילוק
                return await this.transcribeLargeFileIvrit(audioFile, apiKey, endpointId, onProgress, IVRIT_CHUNK_SIZE);
            }
        } else {
            // קובץ גדול - חילוק ישיר
            return await this.transcribeLargeFileIvrit(audioFile, apiKey, endpointId, onProgress, IVRIT_CHUNK_SIZE);
        }
    }

    /**
     * תמלול קובץ יחיד עם Ivrit.ai
     */
    static async transcribeSingleIvrit(audioFile, apiKey, endpointId) {
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
        return this.extractTextFromIvritResponse(result);
    }

    /**
     * תמלול קבצים גדולים עם חילוק - Ivrit.ai (10MB חלקים)
     */
    static async transcribeLargeFileIvrit(audioFile, apiKey, endpointId, onProgress = null, chunkSize = 10 * 1024 * 1024) {
        try {
            // חישוב מספר חלקים נכון
            const expectedChunks = Math.ceil(audioFile.size / chunkSize);

            // חילוק הקובץ לחלקים
            const chunks = await AudioSplitter.splitBySize(audioFile, chunkSize, (splitProgress) => {
                if (onProgress) {
                    onProgress({
                        status: 'splitting',
                        progress: splitProgress.progress * 0.15,
                        message: `מחלק קובץ ל-${expectedChunks} חלקים של 10MB...`,
                        currentChunk: splitProgress.currentChunk || 0,
                        totalChunks: expectedChunks
                    });
                }
            });

            const transcriptions = [];
            let successfulChunks = 0;
            let failedChunks = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkSizeMB = (chunk.size / 1024 / 1024).toFixed(1);

                if (onProgress) {
                    const progressBase = 15;
                    const progressPerChunk = 85 / chunks.length;
                    const currentProgress = progressBase + (i * progressPerChunk);

                    onProgress({
                        status: 'transcribing',
                        progress: currentProgress,
                        message: `מעביר חלק ${i + 1} מתוך ${chunks.length} דרך Ivrit.ai ...`,
                        currentChunk: i + 1,
                        totalChunks: chunks.length,
                        provider: 'Ivrit.ai'
                    });
                }

                try {
                    const transcription = await this.transcribeSingleIvrit(chunk, apiKey, endpointId);
                    transcriptions.push(transcription);
                    successfulChunks++;

                    // עיכוב בין בקשות
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }

                } catch (chunkError) {
                    failedChunks++;
                    transcriptions.push(`[שגיאה בתמלול חלק ${i + 1}: ${chunkError.message}]`);
                }
            }

            if (onProgress) {
                onProgress({
                    status: 'complete',
                    progress: 100,
                    message: `התמלול הושלם! (${successfulChunks} חלקים הצליחו${failedChunks > 0 ? `, ${failedChunks} נכשלו` : ''})`
                });
            }

            return transcriptions.join(' ');

        } catch (error) {
            throw error;
        }
    }

    /**
     * חילוץ טקסט מתגובת Ivrit.ai
     */
    static extractTextFromIvritResponse(result) {
        let text = '';

        try {
            const output = result?.output || result;

            if (Array.isArray(output) && output[0] && Array.isArray(output[0].result)) {
                text = output[0].result
                    .map(segment => segment?.text || '')
                    .filter(t => t.trim())
                    .join(' ');
            }
            else if (output && Array.isArray(output.result)) {
                text = output.result
                    .map(segment => segment?.text || '')
                    .filter(t => t.trim())
                    .join(' ');
            }
            else {
                text = this.findTextInResponse(output);
            }

        } catch (parseError) {
            throw new Error('שגיאה בעיבוד תגובת Ivrit.ai');
        }

        if (!text || text.trim().length === 0) {
            throw new Error('Ivrit.ai החזיר תשובה ללא טקסט תמלול.');
        }

        return text.trim();
    }

    /**
     * פונקציה עזר לחיפוש טקסט בכל מבנה התגובה
     */
    static findTextInResponse(obj, depth = 0) {
        if (depth > 5) return '';

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
            const commonFields = ['text', 'transcription', 'content', 'transcript'];
            for (const field of commonFields) {
                if (obj[field] && typeof obj[field] === 'string' && obj[field].trim().length > 0) {
                    return obj[field];
                }
            }

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
     * פונקציה ראשית לתמלול
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
     * קבלת מידע על ספק התמלול - עודכן ל-10MB חלקים
     */
    static getProviderInfo(provider) {
        const providers = {
            openai: {
                name: 'OpenAI Whisper',
                displayName: 'OpenAI',
                maxFileSize: 25 * 1024 * 1024, // 25MB
                chunkSize: 24 * 1024 * 1024, // 24MB לחלקים
                supportsLargeFiles: true,
                description: 'תמלול מדויק באיכות גבוהה',
                languages: ['he', 'en', 'ar', 'fr', 'es'],
                pricing: '$0.006 לדקה'
            },
            ivrit: {
                name: 'Ivrit.ai',
                displayName: 'Ivrit.ai',
                maxFileSize: 10 * 1024 * 1024, // 10MB לקובץ יחיד
                chunkSize: 10 * 1024 * 1024, // 10MB לחלקים
                supportsLargeFiles: true,
                description: 'תמלול מותאם במיוחד לעברית עם חילוק ל-10MB',
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

        // שני הספקים תומכים בחילוק
        return true;
    }

    /**
     * המלצה על ספק מתאים לקובץ - ללא הודעות קופצות
     */
    static recommendProvider(audioFile, availableProviders = ['openai', 'ivrit']) {
        if (!audioFile) return availableProviders[0];

        const fileSize = audioFile.size;
        const fileSizeMB = fileSize / (1024 * 1024);

        // עבור קבצים קטנים מ-8MB - Ivrit.ai יהיה טוב
        if (fileSizeMB <= 8 && availableProviders.includes('ivrit')) {
            return 'ivrit';
        }

        // עבור קבצים בינוניים (8-25MB) - תלוי בזמינות
        if (fileSizeMB <= 25) {
            if (availableProviders.includes('openai')) {
                return 'openai';
            }
            if (availableProviders.includes('ivrit')) {
                return 'ivrit';
            }
        }

        // עבור קבצים גדולים - OpenAI עדיף
        if (availableProviders.includes('openai')) {
            return 'openai';
        }

        return availableProviders[0];
    }
}

// ייצוא המודול
window.Transcription = Transcription;