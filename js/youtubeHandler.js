/**
 * מודול לטיפול בסרטוני YouTube
 */
class YouTubeHandler {
    /**
     * יוצר מופע חדש של מנהל סרטוני YouTube
     * @param {UI} uiInstance - התייחסות למופע UI הראשי
     */
    constructor(uiInstance) {
        this.ui = uiInstance;

        // אלמנטי ממשק
        this.youtubeUrlInput = document.getElementById('youtube-url');
        this.processYoutubeBtn = document.getElementById('process-youtube-btn');

        // מוצא את מיכל ה-YouTube
        const youtubeInputArea = document.querySelector('.youtube-input-area');

        if (!youtubeInputArea) {
            return;
        }

        // בדיקה אם כבר קיים אלמנט מידע
        let existingInfo = youtubeInputArea.querySelector('.youtube-info');

        if (existingInfo) {
            this.youtubeInfo = existingInfo;
        } else {
            // יצירת אלמנט חדש
            this.youtubeInfo = document.createElement('div');
            this.youtubeInfo.className = 'youtube-info';
            this.youtubeInfo.style.margin = '15px 0';
            this.youtubeInfo.style.width = '100%';

            // הוספה בסוף מיכל הקלט
            youtubeInputArea.appendChild(this.youtubeInfo);
        }

        // קישור אירועים
        this.bindEvents();
    }
    /**
     * קישור אירועים לאלמנטי YouTube
     */
    bindEvents() {
        if (!this.youtubeUrlInput || !this.processYoutubeBtn) return;

        this.processYoutubeBtn.addEventListener('click', () => {
            this.processYouTubeVideo();
        });

        // הוספת אפשרות ללחוץ על Enter בשדה הקלט
        this.youtubeUrlInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.processYouTubeVideo();
            }
        });

        // האזנה לשינויים בשדה הקלט של YouTube
        this.youtubeUrlInput.addEventListener('input', () => {
            this.previewYoutubeVideo();
        });

        this.youtubeUrlInput.addEventListener('paste', () => {
            // המתנה קצרה כדי לוודא שהערך מתעדכן אחרי ההדבקה
            setTimeout(() => {
                this.previewYoutubeVideo();
            }, 100);
        });
    }
    /**
 * תצוגה מקדימה של סרטון יוטיוב כאשר מדביקים/מזינים קישור
 */
    previewYoutubeVideo() {
        const youtubeUrl = this.youtubeUrlInput.value.trim();

        if (!youtubeUrl) {
            if (this.youtubeInfo) {
                this.youtubeInfo.innerHTML = '';
                this.youtubeInfo.style.display = 'none';
            }
            return;
        }

        if (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/')) {
            return;
        }

        const videoId = this.extractVideoId(youtubeUrl);

        if (!videoId) {
            return;
        }

        this.getVideoInfo(videoId)
            .then(videoInfo => {
                this.displayYouTubeInfo(videoInfo);
            })
            .catch(error => {
                // שגיאה בקבלת מידע - לא עושים כלום
            });
    }

    /**
     * טיפול בתמלול מסרטון יוטיוב
     */
    processYouTubeVideo() {
        const youtubeUrl = this.youtubeUrlInput.value.trim();
        const loadingIndicator = document.getElementById('youtube-loading');
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        if (!youtubeUrl) {
            this.ui.showError('נא להזין קישור יוטיוב תקין');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        if (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/')) {
            this.ui.showError('נא להזין קישור יוטיוב תקין');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        if (!this.ui.apiKey) {
            this.ui.showError('נא להזין מפתח API של Huggingface בהגדרות');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        this.ui.progressContainer.style.display = 'block';
        this.ui.loadingSpinner.style.display = 'block';
        this.processYoutubeBtn.disabled = true;
        this.ui.errorMessage.style.display = 'none';

        this.ui.updateProgress({ status: 'processing', progress: 5, message: 'מכין לעיבוד סרטון YouTube...' });

        const videoId = this.extractVideoId(youtubeUrl);

        if (!videoId) {
            this.ui.showError('לא ניתן לזהות את מזהה הסרטון. נא לוודא שהקישור תקין.');
            this.processYoutubeBtn.disabled = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        this.getVideoInfo(videoId)
            .then((videoInfo) => this.convertToAudio(videoId, videoInfo.title)) // השינוי כאן
            .then(() => {
                this.processYoutubeBtn.disabled = false;
                this.ui.loadingSpinner.style.display = 'none';
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            })
            .catch(error => {
                this.ui.showError('אירעה שגיאה בעיבוד הסרטון: ' + (error.message || 'שגיאה לא ידועה'));
                this.ui.loadingSpinner.style.display = 'none';
                this.processYoutubeBtn.disabled = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            });
    }

    /**
   * קבלת מידע על סרטון YouTube
   * @param {string} videoId - מזהה הסרטון
   * @returns {Promise<Object>} - מידע על הסרטון
   */
    async getVideoInfo(videoId) {
        try {
            // שימוש בשירות noembed לקבלת מידע על הסרטון
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);

            if (!response.ok) {
                throw new Error(`שגיאה בקבלת מידע על הסרטון: ${response.status}`);
            }

            const data = await response.json();

            // יצירת אובייקט מידע
            const videoInfo = {
                title: data.title || 'סרטון YouTube',
                author: data.author_name || 'לא ידוע',
                thumbnail: data.thumbnail_url,
                // אומדן אורך - אם לא מגיע מהשירות
                duration: data.duration || 120 // ברירת מחדל - 2 דקות
            };

            // הצגת המידע בממשק בעיצוב שתואם לתמונה שהראית
            this.displayYouTubeInfo(videoInfo);

            return videoInfo;
        } catch (error) {
            // אם יש שגיאה, מציג מידע בסיסי
            const fallbackInfo = {
                title: 'סרטון YouTube',
                author: 'לא ידוע',
                thumbnail: null,
                duration: 120
            };

            this.displayYouTubeInfo(fallbackInfo);
            return fallbackInfo;
        }
    }
    /**
     * עדכון התקדמות בתהליך תמלול סרטון יוטיוב
     * @param {Object} progressData - נתוני ההתקדמות
     */
    updateYouTubeProgress(progressData) {
        const { status, progress, message, videoInfo } = progressData;

        // עדכון סרגל ההתקדמות
        this.ui.progressBar.style.width = progress + '%';
        this.ui.progressText.textContent = Math.round(progress) + '%';

        // עדכון הודעת הסטטוס
        switch (status) {
            case 'info':
                this.ui.progressStatus.innerHTML = '<i class="fas fa-info-circle"></i> ' + (message || 'מקבל מידע על הסרטון...');

                // הצגת מידע על הסרטון אם קיים
                if (videoInfo) {
                    this.displayYouTubeInfo(videoInfo);
                }
                break;

            case 'converting':
                this.ui.progressStatus.innerHTML = '<i class="fas fa-exchange-alt fa-spin"></i> ' + (message || 'ממיר את הסרטון לאודיו...');
                break;

            case 'transcribing':
                this.ui.progressStatus.innerHTML = '<i class="fas fa-microphone"></i> ' + (message || 'מתמלל את האודיו...');
                break;

            case 'complete':
                this.ui.progressStatus.innerHTML = '<i class="fas fa-check-circle"></i> ' + (message || 'הושלם!');
                break;

            case 'error':
                this.ui.progressStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + (message || 'אירעה שגיאה');
                break;
        }

        // אם התקדמות מלאה, הצג אפקט של סיום
        if (progress >= 100) {
            this.ui.progressBar.style.transition = 'all 0.3s';
            this.ui.progressBar.style.boxShadow = '0 0 15px rgba(55, 178, 77, 0.7)';
        }
    }

    /**
 * הצגת מידע על סרטון YouTube
 * @param {Object} videoInfo - מידע על הסרטון
 */
    displayYouTubeInfo(videoInfo) {
        if (!this.youtubeInfo) return;

        const html = `
            <div class="youtube-video-info">
                <div class="video-thumbnail">
                    <img src="${videoInfo.thumbnail}" alt="תמונה ממוזערת">
                </div>
                <div class="video-details">
                    <h4>${videoInfo.title}</h4>
                    <p>יוצר: ${videoInfo.author}</p>
                </div>
            </div>
        `;

        this.youtubeInfo.innerHTML = html;
        this.youtubeInfo.style.display = 'block';
    }

    /**
  * חילוץ מזהה הסרטון מקישור YouTube
  * @param {string} url - קישור YouTube
  * @returns {string|null} - מזהה הסרטון או null אם לא נמצא
  */
    extractVideoId(url) {
        // בדיקה שיש קישור
        if (!url) return null;

        try {
            // ניסיון ליצור אובייקט URL
            const urlObj = new URL(url);

            // קישורים בפורמט youtube.com/watch?v=VIDEO_ID
            if (urlObj.hostname.includes('youtube.com')) {
                return urlObj.searchParams.get('v');
            }

            // קישורים בפורמט youtu.be/VIDEO_ID
            if (urlObj.hostname === 'youtu.be') {
                return urlObj.pathname.substring(1);
            }

            return null;
        } catch (error) {
            // טיפול בשגיאות של URL - ניסיון לחלץ באמצעות ביטויים רגולריים
            let match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            return match ? match[1] : null;
        }
    }

    /**
    * קבלת מידע על סרטון YouTube
     * @param {string} videoId - מזהה הסרטון
    * @returns {Promise<Object>} - מידע על הסרטון
    */
    async getVideoInfo(videoId) {
        try {
            // ניסיון לקבל מידע באמצעות noembed
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);

            if (!response.ok) {
                throw new Error(`שגיאת שרת: ${response.status}`);
            }

            const data = await response.json();

            // יצירת אובייקט המידע
            const videoInfo = {
                title: data.title || 'סרטון YouTube',
                author: data.author_name || 'לא ידוע',
                thumbnail: data.thumbnail_url,
                duration: 120 // ברירת מחדל - 2 דקות
            };

            // ניסיון להוציא משך זמן מדויק
            if (data.duration) {
                // אם המידע מכיל ישירות את משך הזמן
                videoInfo.duration = parseInt(data.duration);
            } else {
                // ניסיון לחלץ זמן מהכותרת או מהתיאור (אם יש)
                const timePattern = /(\d+):(\d+)/;
                const titleMatch = data.title ? data.title.match(timePattern) : null;

                if (titleMatch) {
                    const minutes = parseInt(titleMatch[1]);
                    const seconds = parseInt(titleMatch[2]);
                    videoInfo.duration = minutes * 60 + seconds;
                }
            }

            // אם יש תיאור ואין זמן, ננסה לחלץ מהתיאור
            if (data.description && videoInfo.duration === 120) {
                const descMatch = data.description.match(/(\d+):(\d+)/);
                if (descMatch) {
                    const minutes = parseInt(descMatch[1]);
                    const seconds = parseInt(descMatch[2]);
                    videoInfo.duration = minutes * 60 + seconds;
                }
            }

            return videoInfo;

        } catch (error) {
            // מידע ברירת מחדל במקרה של שגיאה
            return {
                title: 'סרטון YouTube',
                author: 'לא ידוע',
                thumbnail: null,
                duration: 120 // ברירת מחדל - 2 דקות
            };
        }
    }

    /**
     * הערכת זמן תמלול סרטון
     * @param {number} durationInSeconds - אורך הסרטון בשניות
     * @returns {string} - הערכת זמן תמלול מפורמטת
     */
    estimateTranscriptionTime(durationInSeconds) {
        // הנחות: 
        // - המרת סרטון לוקחת כ-10 שניות קבועות + 0.1 * משך הסרטון
        // - תמלול לוקח כ-0.5 * משך הסרטון

        const conversionTime = 10 + (durationInSeconds * 0.1);
        const transcriptionTime = durationInSeconds * 0.5;

        const totalEstimatedSeconds = conversionTime + transcriptionTime;

        // פורמט זמן
        if (totalEstimatedSeconds < 60) {
            return `${Math.ceil(totalEstimatedSeconds)} שניות`;
        } else {
            const minutes = Math.floor(totalEstimatedSeconds / 60);
            const seconds = Math.ceil(totalEstimatedSeconds % 60);
            return `${minutes} דקות ${seconds > 0 ? `ו-${seconds} שניות` : ''}`;
        }
    }

    /**
 * המרת סרטון יוטיוב לטקסט מתומלל
 * @param {string} videoUrl - קישור YouTube
 * @param {string} apiKey - מפתח API של Huggingface
 * @returns {Promise<string>} - טקסט התמלול
 */
    async transcribeYouTubeVideo(videoUrl, apiKey) {
        try {
            const videoId = this.extractVideoId(videoUrl);
            if (!videoId) throw new Error('הקישור אינו תקין. נא להזין קישור YouTube חוקי.');

            const videoInfo = await this.getVideoInfo(videoId);

            this.updateYouTubeProgress({
                status: 'info',
                progress: 10,
                videoInfo: videoInfo,
                message: 'מתחיל לעבד את הסרטון...'
            });

            let audioBlob;
            try {
                audioBlob = await this.convertToAudio(videoId, videoInfo.title);
            } catch (conversionError) {
                this.updateYouTubeProgress({
                    status: 'error',
                    progress: 40,
                    message: 'שגיאה בהורדת האודיו מיוטיוב. נסו שיטה אחרת.'
                });
                throw new Error('לא ניתן להוריד את האודיו. אנא נסה סרטון אחר או העלאה ידנית.');
            }

            const hasAudio = await this.hasAudioContent(audioBlob);
            if (!hasAudio) throw new Error('אין קובץ לתמלול: הסרטון ריק או הומר לא נכון.');

            this.updateYouTubeProgress({
                status: 'transcribing',
                progress: 70,
                message: 'מתמלל את האודיו...'
            });

            const audioFile = new File([audioBlob], `youtube_${videoId}.mp3`, { type: 'audio/mp3' });

            // מדידת זמן
            const startTime = Date.now();

            let transcription = '';
            let attempts = 0;
            const maxAttempts = 2;

            while (attempts < maxAttempts) {
                try {
                    const selectedProvider = this.ui.getSelectedProvider?.() || 'groq';

                    transcription = await Transcription.transcribeSingle(audioFile, apiKey, selectedProvider);
                    break;
                } catch (transcriptionError) {
                    attempts++;
                    if (attempts >= maxAttempts) throw transcriptionError;

                    await new Promise(resolve => setTimeout(resolve, 2000));
                    this.updateYouTubeProgress({
                        status: 'transcribing',
                        progress: 75,
                        message: `מנסה שוב לתמלל (ניסיון ${attempts + 1})...`
                    });
                }
            }

            const endTime = Date.now();
            const elapsedSeconds = Math.round((endTime - startTime) / 1000);
            const estimatedAudioDuration = elapsedSeconds * 5;

            this.updateYouTubeProgress({
                status: 'complete',
                progress: 100,
                message: 'תמלול הושלם בהצלחה!'
            });

            return transcription;

        } catch (error) {
            throw error;
        }
    }

    /**
    * תיקון בפונקציה convertToAudio בקובץ youtubeHandler.js
    * השינוי: שימוש בכותרת הסרטון במקום במזהה הסרטון לשם הקובץ
    */

    // במקום הקוד הנוכחי בפונקציה convertToAudio, החלף את החלק הזה:

    async convertToAudio(videoId, videoTitle) {
        try {
            this.updateYouTubeProgress({
                status: 'converting',
                progress: 20,
                message: 'מקבל את קובץ ה-MP3 מהשרת...'
            });

            // הוספת מנגנון נסיון חוזר אוטומטי
            let maxRetries = 3;
            let attempt = 0;
            let response = null;
            let success = false;

            while (attempt < maxRetries && !success) {
                attempt++;
                try {
                    // הוספת עיכוב קטן בניסיונות חוזרים
                    if (attempt > 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }

                    response = await fetch('https://audiotranscribe-27kc.onrender.com/youtube', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` })
                    });

                    if (response.ok) {
                        success = true;
                    }
                } catch (retryError) {
                    // שגיאה בניסיון - ממשיך לניסיון הבא
                }
            }

            // בדיקה אם הצלחנו אחרי כל הניסיונות
            if (!success) {
                throw new Error(`לא התקבל קישור לקובץ MP3 לאחר ${maxRetries} ניסיונות`);
            }

            const data = await response.json();
            if (!data.mp3Link) {
                throw new Error('לא התקבל קישור לקובץ MP3');
            }

            this.updateYouTubeProgress({
                status: 'converting',
                progress: 50,
                message: 'מוריד את קובץ ה-MP3...'
            });

            const audioResp = await fetch(data.mp3Link);
            const audioBlob = await audioResp.blob();

            if (audioBlob.size < 1000) {
                throw new Error('הקובץ שהתקבל קטן מדי או ריק');
            }

            this.updateYouTubeProgress({
                status: 'converting',
                progress: 65,
                message: 'ההמרה הושלמה, טוען ללשונית העלאה...'
            });

            // *** כאן השינוי החשוב - יצירת שם קובץ נקי מהכותרת ***

            // ניקוי כותרת הסרטון ליצירת שם קובץ תקין
            let cleanTitle = videoTitle ?
                videoTitle
                    .replace(/[^\u0590-\u05FF\w\s\-_.()]/g, '') // שמירה על עברית, אנגלית ותווים בסיסיים בלבד
                    .replace(/\s+/g, ' ') // החלפת כמה רווחים ברווח אחד
                    .trim() // הסרת רווחים מההתחלה והסוף
                    .substring(0, 100) // הגבלת אורך לשם קובץ תקין
                : `youtube_video_${videoId}`;

            // אם הכותרת ריקה אחרי הניקוי, השתמש בברירת מחדל
            if (!cleanTitle || cleanTitle.length === 0) {
                cleanTitle = `youtube_video_${videoId}`;
            }

            const fileName = `${cleanTitle}.mp3`;

            const audioFile = new File([audioBlob], fileName, {
                type: 'audio/mp3',
                lastModified: Date.now()
            });

            // הוספת מאפיין לזיהוי מקור
            audioFile.source = 'youtube';
            audioFile.originalTitle = videoTitle;
            audioFile.videoId = videoId;

            this.handleYoutubeFile(audioFile);

            return audioBlob;

        } catch (error) {
            throw new Error('שגיאה בהמרת הסרטון לאודיו: ' + error.message);
        }
    }


    // פונקציה חדשה שצריך להוסיף
    handleYoutubeFile(audioFile) {
        // מעבר ללשונית העלאת קובץ
        const uploadTab = document.querySelector('[data-tab="upload-file"]');
        if (uploadTab) {
            uploadTab.click();
        }

        // המתנה קצרה לאחר המעבר ללשונית
        setTimeout(() => {
            try {
                if (!this.ui) {
                    throw new Error('this.ui לא מוגדר בתוך handleYoutubeFile');
                }

                this.ui.handleNewFile(audioFile, 'youtube');

                // וידוא תצוגת אזורים
                if (this.ui.uploadArea) {
                    this.ui.uploadArea.style.display = 'none';
                }

                if (this.ui.fileInfo) {
                    this.ui.fileInfo.style.display = 'block';
                }

                // גלילה עדינה למטה ומיקוד על כפתור התמלול
                setTimeout(() => {
                    if (this.ui.fileInfo) {
                        this.ui.fileInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    if (this.ui.transcribeBtn) {
                        this.ui.transcribeBtn.focus();
                    }
                }, 300);

            } catch (innerError) {
                if (this.ui && typeof this.ui.showError === 'function') {
                    this.ui.showError('שגיאה בטיפול בקובץ לאחר מעבר לשונית: ' + innerError.message);
                }
            }
        }, 100);
    }

    // להוסיף למחלקת YouTubeHandler
    resetYoutubeUI() {
        // איפוס שדה הקלט
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = '';
        }

        // ניקוי מידע על סרטון אם מוצג
        if (this.youtubeInfo) {
            this.youtubeInfo.innerHTML = '';
            this.youtubeInfo.style.display = 'none';
        }

        // איפוס כפתור העיבוד
        if (this.processYoutubeBtn) {
            this.processYoutubeBtn.disabled = false;
        }
    }
    /**
     * בדיקה אם יש תוכן אודיו בקובץ
     * @param {Blob} audioBlob - קובץ האודיו
     * @returns {Promise<boolean>} - האם יש תוכן אודיו
     */
    async hasAudioContent(audioBlob) {
        // אם אין נתונים או קובץ קטן מדי
        if (!audioBlob || audioBlob.size < 1000) {
            return false;
        }

        // בדיקת הקובץ
        return new Promise((resolve) => {
            try {
                const audio = new Audio();
                const objectUrl = URL.createObjectURL(audioBlob);

                audio.oncanplay = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(true);
                };

                audio.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(false);
                };

                // טיימאאוט למקרה שאין תגובה
                const timeout = setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(false);
                }, 5000);

                audio.oncanplay = () => {
                    clearTimeout(timeout);
                    URL.revokeObjectURL(objectUrl);
                    resolve(true);
                };

                audio.src = objectUrl;
                audio.load();
            } catch (error) {
                resolve(false);
            }
        });
    }
}

// ייצוא המחלקה
window.YouTubeHandler = YouTubeHandler;