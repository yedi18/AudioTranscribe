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
        this.youtubeInfo = document.createElement('div');
        this.youtubeInfo.className = 'youtube-info';

        // הוספת אלמנט מידע למיכל YouTube אם קיים
        this.youtubeInfoContainer = document.querySelector('.youtube-input-area');
        if (this.youtubeInfoContainer) {
            this.youtubeInfoContainer.appendChild(this.youtubeInfo);
        }

        // קישור אירועים
        this.bindEvents();

        // הוספת סגנונות
        this.addYouTubeStyles();
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
    }

    /**
     * הוספת סגנונות CSS לתצוגת YouTube
     */
    addYouTubeStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .youtube-video-info {
                display: flex;
                margin-top: 15px;
                background-color: rgba(248, 249, 250, 0.7);
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            
            .video-thumbnail {
                width: 120px;
                height: 90px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .video-thumbnail img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .video-details {
                flex: 1;
                padding: 10px 15px;
            }
            
            .video-details h4 {
                margin: 0 0 8px;
                font-size: 1rem;
                color: var(--primary-color);
            }
            
            .video-details p {
                margin: 4px 0;
                font-size: 0.9rem;
                color: var(--text-color);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * טיפול בתמלול מסרטון יוטיוב
     */
    processYouTubeVideo() {
        const youtubeUrl = this.youtubeUrlInput.value.trim();

        if (!youtubeUrl) {
            this.ui.showError('נא להזין קישור יוטיוב תקין');
            return;
        }

        // בדיקה שהקישור הוא אכן מיוטיוב
        if (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/')) {
            this.ui.showError('נא להזין קישור יוטיוב תקין');
            return;
        }

        // בדיקת מפתח API
        if (!this.ui.apiKey) {
            this.ui.showError('נא להזין מפתח API של Huggingface בהגדרות');
            return;
        }

        // הצגת מצב תמלול
        this.ui.progressContainer.style.display = 'block';
        this.ui.loadingSpinner.style.display = 'block';
        this.processYoutubeBtn.disabled = true;
        this.ui.errorMessage.style.display = 'none';

        // עדכון המצב הראשוני
        this.ui.updateProgress({ status: 'processing', progress: 5, message: 'מכין לעיבוד סרטון YouTube...' });

        // קבלת מזהה הסרטון
        const videoId = this.extractVideoId(youtubeUrl);

        if (!videoId) {
            this.ui.showError('לא ניתן לזהות את מזהה הסרטון. נא לוודא שהקישור תקין.');
            this.processYoutubeBtn.disabled = false;
            return;
        }

        // תחילת תהליך התמלול
        this.transcribeYouTubeVideo(youtubeUrl, this.ui.apiKey)
            .then(transcription => {
                // הצגת התוצאות
                if (transcription) {
                    this.ui.showResults(transcription);
                } else {
                    this.ui.showError('לא התקבל תמלול. נא לנסות שנית.');
                }
            })
            .catch(error => {
                console.error('Error transcribing YouTube video:', error);

                // בדיקה אם השגיאה היא "אין קובץ לתמלול"
                if (error.message && error.message.includes('אין קובץ לתמלול')) {
                    this.ui.showError(error.message);
                } else {
                    this.ui.showError('אירעה שגיאה בתמלול הסרטון: ' + (error.message || 'שגיאה לא ידועה'));
                }
            })
            .finally(() => {
                this.ui.loadingSpinner.style.display = 'none';
                this.processYoutubeBtn.disabled = false;
            });
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
        if (!this.youtubeInfo || !videoInfo) return;

        // יצירת תוכן למידע על הסרטון
        let infoHTML = `<div class="youtube-video-info">`;

        // הוספת תמונה ממוזערת אם קיימת
        if (videoInfo.thumbnail) {
            infoHTML += `<div class="video-thumbnail"><img src="${videoInfo.thumbnail}" alt="תמונה ממוזערת"></div>`;
        }

        // הוספת פרטי הסרטון
        infoHTML += `
            <div class="video-details">
                <h4>${videoInfo.title}</h4>
                <p>יוצר: ${videoInfo.author}</p>
        `;

        // הוספת אורך הסרטון אם קיים
        if (videoInfo.duration) {
            const minutes = Math.floor(videoInfo.duration / 60);
            const seconds = Math.floor(videoInfo.duration % 60);
            infoHTML += `<p>אורך: ${minutes}:${seconds.toString().padStart(2, '0')}</p>`;

            // הוספת זמן משוער לתמלול
            const estimatedTime = this.estimateTranscriptionTime(videoInfo.duration);
            infoHTML += `<p>זמן משוער לתמלול: ${estimatedTime}</p>`;
        }

        infoHTML += `</div></div>`;

        // הצגת המידע
        this.youtubeInfo.innerHTML = infoHTML;
        this.youtubeInfo.style.display = 'flex';
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
            console.error('Invalid URL:', error);
            return null;
        }
    }

    /**
     * קבלת מידע על סרטון YouTube (אורך, כותרת וכו')
     * @param {string} videoId - מזהה הסרטון
     * @returns {Promise<Object>} - מידע על הסרטון
     */
    async getVideoInfo(videoId) {
        try {
            // שימוש ב-API של YouTube לקבלת מידע על הסרטון
            // לצורך הדוגמה, משתמשים בשירות פשוט לקבלת מידע בסיסי
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch video info');
            }

            const data = await response.json();

            return {
                title: data.title || 'סרטון YouTube',
                author: data.author_name || 'לא ידוע',
                thumbnail: data.thumbnail_url,
                // אורך הסרטון לא זמין בשירות זה, נקבל אותו מאוחר יותר
                duration: 120 // ברירת מחדל - 2 דקות
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            return {
                title: 'סרטון YouTube',
                author: 'לא ידוע',
                thumbnail: null,
                duration: 120
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
            // חילוץ מזהה הסרטון
            const videoId = this.extractVideoId(videoUrl);

            if (!videoId) {
                throw new Error('הקישור אינו תקין. נא להזין קישור YouTube חוקי.');
            }

            // קבלת מידע על הסרטון
            const videoInfo = await this.getVideoInfo(videoId);

            // עדכון התקדמות - מקבל מידע על הסרטון
            this.updateYouTubeProgress({
                status: 'info',
                progress: 10,
                videoInfo: videoInfo,
                message: 'מתחיל לעבד את הסרטון...'
            });

            // ניסיון המרת הסרטון לאודיו עם טיפול בשגיאות
            let audioBlob;
            try {
                audioBlob = await this.convertToAudio(videoId);
            } catch (conversionError) {
                console.error('שגיאה בהמרת סרטון יוטיוב:', conversionError);

                // עדכון המשתמש על השגיאה עם מידע שימושי
                this.updateYouTubeProgress({
                    status: 'error',
                    progress: 40,
                    message: 'שגיאה בהורדת האודיו מיוטיוב. נסו שיטה אחרת.'
                });

                // שגיאה ממוקדת למשתמש עם הצעות לפתרון
                throw new Error('לא ניתן להוריד את האודיו מיוטיוב. ייתכן שיש הגבלות על הסרטון או בעיה זמנית בשרת. אנא נסה: (1) העלאת קובץ אודיו ישירות (2) הקלטת האודיו מהמסך או (3) ניסיון סרטון אחר.');
            }

            // בדיקה שהקובץ אכן קיים ותקין לפני המשך עיבוד
            const hasAudio = await this.hasAudioContent(audioBlob);

            if (!hasAudio) {
                throw new Error('אין קובץ לתמלול: הסרטון אינו מכיל תוכן אודיו או שחלה שגיאה בהמרה.');
            }

            // עדכון התקדמות - מתחיל תמלול
            this.updateYouTubeProgress({
                status: 'transcribing',
                progress: 70,
                message: 'מתמלל את האודיו...'
            });

            // יצירת קובץ מה-blob
            const audioFile = new File([audioBlob], `youtube_${videoId}.mp3`, { type: 'audio/mp3' });

            // מנגנון ניסיונות חוזרים לתמלול
            let transcription = '';
            let attempts = 0;
            const maxAttempts = 2;

            while (attempts < maxAttempts) {
                try {
                    // תמלול הקובץ באמצעות שירות התמלול הקיים
                    transcription = await Transcription.transcribeSingle(audioFile, apiKey);
                    break; // אם הצליח, יוצאים מהלולאה
                } catch (transcriptionError) {
                    attempts++;
                    console.warn(`ניסיון תמלול ${attempts} נכשל:`, transcriptionError);

                    if (attempts >= maxAttempts) {
                        throw transcriptionError; // אם כל הניסיונות נכשלו, מעבירים את השגיאה
                    }

                    // המתנה לפני ניסיון נוסף
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    this.updateYouTubeProgress({
                        status: 'transcribing',
                        progress: 75,
                        message: `מנסה שוב לתמלל (ניסיון ${attempts + 1})...`
                    });
                }
            }

            // עדכון התקדמות - תמלול הושלם
            this.updateYouTubeProgress({
                status: 'complete',
                progress: 100,
                message: 'תמלול הושלם בהצלחה!'
            });

            return transcription;

        } catch (error) {
            console.error('Error transcribing YouTube video:', error);
            throw error;
        }
    }

    /**
 * המרת סרטון YouTube לקובץ אודיו באמצעות שרת ה-Render (RapidAPI)
 * @param {string} videoId - מזהה הסרטון
 * @returns {Promise<Blob>} - קובץ האודיו כ-Blob
 */
    async convertToAudio(videoId) {
        try {
            this.updateYouTubeProgress({
                status: 'converting',
                progress: 20,
                message: 'מוריד את האודיו מהיוטיוב...'
            });

            const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;

            const response = await fetch('https://audiotranscribe-27kc.onrender.com/youtube', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: fullUrl })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`השרת לא הצליח להוריד את האודיו (${response.status}): ${errorText}`);
            }

            const audioBlob = await response.blob();

            if (audioBlob.size < 1000) {
                throw new Error(`הקובץ שהתקבל קטן מדי (${audioBlob.size} בייטים). יתכן שהיוטיוב חוסם את ההורדה.`);
            }

            this.updateYouTubeProgress({
                status: 'converting',
                progress: 65,
                message: 'ההמרה הושלמה, טוען ללשונית העלאה...'
            });

            // המרה לקובץ MP3
            const mp3File = new File([audioBlob], `youtube_${videoId}.mp3`, { type: 'audio/mp3' });

            // מעבר אוטומטי לטאב העלאה
            this.ui.switchToTab('upload'); // ודא שקיים פונקציה כזו
            UploadHandler.loadFromBlob(mp3File); // בדיוק כמו בהקלטה

            this.ui.showToast('🎉 ההמרה הושלמה! עבור לטאב העלאת קובץ כדי להתחיל תמלול.');

            // לא חוזר קובץ ולא ממשיך לתמלול בשלב זה
            return;

        } catch (error) {
            console.error('שגיאה בהמרת יוטיוב:', error);
            throw new Error('שגיאה בהמרת הסרטון לאודיו: ' + error.message);
        }
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
                console.error('Error checking audio content:', error);
                resolve(false);
            }
        });
    }
}

// ייצוא המחלקה
window.YouTubeHandler = YouTubeHandler;