/**
 * מודול לתמלול קבצי אודיו באמצעות OpenAI Whisper ו-Ivrit.ai - עם תמיכה בחילוק קבצים גדולים
 */
class Transcription {
    /**
     * תמלול קובץ אודיו בודד עם OpenAI Whisper
     * @param {Blob} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של OpenAI
     * @returns {Promise<string>} - טקסט התמלול
     */
    static async transcribeSingleOpenAI(audioFile, apiKey) {
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
            throw error;
        }
    }

    /**
     * תמלול קובץ גדול עם חילוק לחלקים (OpenAI)
     * @param {File} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של OpenAI
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<string>} - טקסט התמלול המלא
     */
    static async transcribeLargeFileOpenAI(audioFile, apiKey, onProgress = null) {
        try {
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

                try {
                    const transcription = await Transcription.transcribeSingleOpenAI(chunk, apiKey);
                    transcriptions.push(transcription);

                    // עיכוב קטן בין בקשות כדי לא להעמיס על ה-API
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

            // חיבור כל התמלולים לטקסט אחד
            const fullTranscription = transcriptions.join(' ');

            return fullTranscription;

        } catch (error) {
            throw error;
        }
    }

    /**
     * תמלול עם OpenAI Whisper (קובץ יחיד או מחולק)
     * @param {File} audioFile - קובץ האודיו לתמלול
     * @param {string} apiKey - מפתח ה-API של OpenAI
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<string>} - טקסט התמלול
     */
    static async transcribeOpenAI(audioFile, apiKey, onProgress = null) {
        const maxSingleFileSize = 24 * 1024 * 1024; // 24MB

        if (audioFile.size <= maxSingleFileSize) {
            // קובץ קטן - תמלול רגיל
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
            // קובץ גדול - תמלול עם חילוק
            return await Transcription.transcribeLargeFileOpenAI(audioFile, apiKey, onProgress);
        }
    }
    /**
  * תמלול עם Ivrit.ai דרך RunPod - גרסה מנוקה סופית
  */
    static async transcribeIvrit(audioFile, apiKey, endpointId) {
        if (!apiKey || !endpointId) {
            throw new Error('נדרשים מפתח API ו-Endpoint ID של RunPod');
        }

        // מגבלת גודל (blob ל-RunPod)
        if (audioFile.size > 10 * 1024 * 1024) {
            throw new Error('הקובץ גדול מדי עבור Ivrit.ai - מקסימום 10MB. נסה להשתמש ב-OpenAI לקבצים גדולים יותר.');
        }

        // המרת קובץ ל-base64 בצורה בטוחה (דפדפן)
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

        // חילוץ טקסט מהתגובה
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
            // אפשרות: טקסט ישיר
            else if (typeof output === 'string') {
                text = output;
            }
            // אפשרות: מערך של segments עם text
            else if (Array.isArray(output)) {
                text = output
                    .map(segment => {
                        if (typeof segment === 'string') return segment;
                        return segment?.text || segment?.transcription || '';
                    })
                    .filter(t => t.trim())
                    .join(' ');
            }
            // אפשרות: אובייקט עם segments
            else if (output && Array.isArray(output.segments)) {
                text = output.segments
                    .map(segment => segment?.text || segment?.transcription || '')
                    .filter(t => t.trim())
                    .join(' ');
            }
            // אפשרות: תגובה עם text ישירות
            else if (output?.text) {
                text = output.text;
            }
            // אפשרות: תגובה עם transcription
            else if (output?.transcription) {
                text = output.transcription;
            }
            // חיפוש עמוק אחר טקסט בכל המבנה
            else {
                text = findTextInResponse(output);
            }

        } catch (parseError) {
            throw new Error('שגיאה בעיבוד תגובת Ivrit.ai');
        }

        // ולידציה סופית
        if (!text || text.trim().length === 0) {
            throw new Error('Ivrit.ai החזיר תשובה ללא טקסט תמלול.');
        }

        return text.trim();
    }

    /**
     * פונקציה עזר לחיפוש טקסט בכל מבנה התגובה
     */
    findTextInResponse(obj, depth = 0) {
        if (depth > 5) return ''; // מניעת לולאה אינסופית

        if (typeof obj === 'string' && obj.trim().length > 10) {
            return obj;
        }

        if (Array.isArray(obj)) {
            for (const item of obj) {
                const found = findTextInResponse(item, depth + 1);
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
                    const found = findTextInResponse(value, depth + 1);
                    if (found) return found;
                }
            }
        }

        return '';
    }

    /**
     * פונקציה ראשית לתמלול - תומכת במספר ספקים
     * @param {File} audioFile - קובץ האודיו לתמלול
     * @param {string} provider - ספק התמלול ('openai' או 'ivrit')
     * @param {string} apiKey - מפתח ה-API
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @param {string} endpointId - ה-Endpoint ID (נדרש ל-Ivrit.ai)
     * @returns {Promise<string>} - טקסט התמלול
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
                if (onProgress) {
                    onProgress({
                        status: 'transcribing',
                        progress: 20,
                        message: 'שולח ל-Ivrit.ai דרך RunPod...'
                    });
                }
                const result = await this.transcribeIvrit(audioFile, apiKey, endpointId);
                if (onProgress) {
                    onProgress({
                        status: 'complete',
                        progress: 100,
                        message: 'התמלול הושלם!'
                    });
                }
                return result;

            default:
                throw new Error(`ספק תמלול לא נתמך: ${provider}`);
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
                    resolve(true);
                }
            });
        } catch (error) {
            return true; // במקרה של ספק, נניח שהקובץ תקין
        }
    }

    /**
     * קבלת מידע על ספק התמלול
     * @param {string} provider - ספק התמלול
     * @returns {Object} - מידע על הספק
     */
    static getProviderInfo(provider) {
        const providers = {
            openai: {
                name: 'OpenAI Whisper',
                maxFileSize: 25 * 1024 * 1024, // 25MB
                supportsLargeFiles: true,
                description: 'תמלול מדויק באיכות גבוהה',
                languages: ['he', 'en', 'ar', 'fr', 'es'], // ועוד רבות
                pricing: '$0.006 לדקה'
            },
            ivrit: {
                name: 'Ivrit.ai',
                maxFileSize: 10 * 1024 * 1024, // 10MB
                supportsLargeFiles: false,
                description: 'תמלול מותאם במיוחד לעברית',
                languages: ['he'],
                pricing: 'משתנה לפי RunPod'
            }
        };

        return providers[provider] || null;
    }

    /**
     * בדיקה האם ספק תומך בגודל קובץ מסוים
     * @param {string} provider - ספק התמלול
     * @param {number} fileSize - גודל הקובץ בבייטים
     * @returns {boolean} - האם הספק תומך בגודל זה
     */
    static supportsFileSize(provider, fileSize) {
        const providerInfo = this.getProviderInfo(provider);
        if (!providerInfo) return false;

        return fileSize <= providerInfo.maxFileSize;
    }

    /**
     * המלצה על ספק מתאים לקובץ
     * @param {File} audioFile - קובץ האודיו
     * @param {Array} availableProviders - רשימת ספקים זמינים
     * @returns {string} - ספק מומלץ
     */
    static recommendProvider(audioFile, availableProviders = ['openai', 'ivrit']) {
        if (!audioFile) return availableProviders[0];

        const fileSize = audioFile.size;

        // אם הקובץ קטן מ-10MB ויש Ivrit.ai זמין - המלץ עליו לעברית
        if (fileSize <= 10 * 1024 * 1024 && availableProviders.includes('ivrit')) {
            return 'ivrit';
        }

        // אחרת, המלץ על OpenAI
        if (availableProviders.includes('openai')) {
            return 'openai';
        }

        // ברירת מחדל
        return availableProviders[0];
    }
}

// ייצוא המודול
window.Transcription = Transcription;