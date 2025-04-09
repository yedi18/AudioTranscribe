/**
 * מודול לטיפול בהקלטת אודיו
 */
class RecordingHandler {
    /**
     * יוצר מופע חדש של מנהל הקלטות
     * @param {UI} uiInstance - התייחסות למופע UI הראשי
     */
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.recorder = null;
        this.recordedChunks = [];
        this.recordingTime = 0;
        this.recordingInterval = null;
        this.recordingStream = null;
        this.isRecording = false;
        this.volumeSamples = [];
        
        // אלמנטי ממשק
        this.startRecordBtn = document.getElementById('start-record-btn');
        this.stopRecordBtn = document.getElementById('stop-record-btn');
        this.recordTimer = document.getElementById('record-timer');
        this.recordWave = document.getElementById('record-wave');
        
        // קישור אירועים
        this.bindEvents();
        
        // הוספת CSS להקלטה
        this.addRecordingStyles();
    }
    
    /**
     * קישור אירועים לכפתורי הקלטה
     */
    bindEvents() {
        if (!this.startRecordBtn || !this.stopRecordBtn) return;
        
        this.startRecordBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
    }
    
    /**
     * התחלת הקלטה
     */
    async startRecording() {
        try {
            // בקשת גישה למיקרופון
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recordingStream = stream;
            
            // יצירת AudioContext לניתוח אודיו
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            
            // הגדרת מקליט
            this.recorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            this.isRecording = true;
            
            // הוספת ניתוח עוצמת שמע
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // פונקציה לאנימציית גלי קול
            const updateWaveform = () => {
                if (!this.isRecording) return;
                
                analyser.getByteFrequencyData(dataArray);
                
                // חישוב ממוצע עוצמת הקול
                let average = 0;
                for (let i = 0; i < bufferLength; i++) {
                    average += dataArray[i];
                }
                average = average / bufferLength;
                
                // עדכון האנימציה של גלי הקול לפי העוצמה
                const waveIntensity = Math.min(10, average / 5); // מגביל את העוצמה
                this.recordWave.style.setProperty('--wave-intensity', waveIntensity + 'px');
                
                // שמירת העוצמה לבדיקת שקט
                if (!this.volumeSamples) this.volumeSamples = [];
                this.volumeSamples.push(average);
                
                // הגבלת מספר הדגימות לזיכרון
                if (this.volumeSamples.length > 100) {
                    this.volumeSamples.shift();
                }
                
                requestAnimationFrame(updateWaveform);
            };
            
            requestAnimationFrame(updateWaveform);
            
            // טיפול בנתוני ההקלטה
            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };
            
            // טיפול בסיום ההקלטה
            this.recorder.onstop = () => {
                this.isRecording = false;
                
                // יצירת blob מהקטעים שהוקלטו
                const blob = new Blob(this.recordedChunks, { type: 'audio/mp3' });
                
                // בדיקה אם ההקלטה ריקה או שקטה
                const isSilent = this.checkIfRecordingIsSilent();
                
                if (isSilent) {
                    this.ui.showError('אין קובץ לתמלול: לא זוהה שמע בהקלטה. נא לנסות שוב ולדבר ברור יותר.');
                    
                    // עצירת סטרים המיקרופון
                    this.recordingStream.getTracks().forEach(track => track.stop());
                    
                    // איפוס טיימר ההקלטה
                    clearInterval(this.recordingInterval);
                    this.recordingTime = 0;
                    this.recordTimer.textContent = '00:00';
                    this.recordWave.classList.remove('recording');
                    
                    // איפוס מצב הכפתורים
                    this.startRecordBtn.disabled = false;
                    this.stopRecordBtn.disabled = true;
                    
                    return;
                }
                
                // יצירת קובץ
                const recordedFile = new File([blob], `הקלטה_${new Date().toISOString()}.mp3`, { type: 'audio/mp3' });
                
                // טיפול בקובץ כאילו הועלה
                this.handleRecordedFile(recordedFile);
                
                // עצירת סטרים המיקרופון
                this.recordingStream.getTracks().forEach(track => track.stop());
                
                // איפוס טיימר ההקלטה
                clearInterval(this.recordingInterval);
                this.recordingTime = 0;
                this.recordTimer.textContent = '00:00';
                this.recordWave.classList.remove('recording');
                
                // החלפת לשונית להעלאת קובץ
                document.querySelector('[data-tab="upload-file"]').click();
            };
            
            // התחלת ההקלטה
            this.recorder.start();
            
            // עדכון ממשק המשתמש
            this.startRecordBtn.disabled = true;
            this.stopRecordBtn.disabled = false;
            this.recordWave.classList.add('recording');
            
            // התחלת טיימר
            this.recordingTime = 0;
            this.volumeSamples = [];
            this.recordingInterval = setInterval(() => {
                this.recordingTime++;
                const minutes = Math.floor(this.recordingTime / 60).toString().padStart(2, '0');
                const seconds = (this.recordingTime % 60).toString().padStart(2, '0');
                this.recordTimer.textContent = `${minutes}:${seconds}`;
            }, 1000);
        } catch (error) {
            console.error('שגיאה בהקלטה:', error);
            this.ui.showError('לא הצלחנו לגשת למיקרופון. אנא ודא שאישרת גישה למיקרופון ונסה שוב.');
        }
    }
    
    /**
     * עצירת הקלטה
     */
    stopRecording() {
        if (this.recorder && this.recorder.state !== 'inactive') {
            this.recorder.stop();
            this.startRecordBtn.disabled = false;
            this.stopRecordBtn.disabled = true;
        }
    }
    
    /**
     * בדיקה אם ההקלטה שקטה (ללא שמע משמעותי)
     * @returns {boolean} האם ההקלטה שקטה
     */
    checkIfRecordingIsSilent() {
        // אם ההקלטה קצרה מדי (פחות מ-2 שניות)
        if (this.recordingTime < 2) {
            return true;
        }
        
        // אם אין מספיק דגימות קול
        if (!this.volumeSamples || this.volumeSamples.length < 10) {
            return false; // במקרה של ספק, נניח שיש שמע
        }
        
        // חישוב ממוצע עוצמת הקול
        const averageVolume = this.volumeSamples.reduce((sum, vol) => sum + vol, 0) / this.volumeSamples.length;
        
        // אם הממוצע נמוך מדי, ההקלטה נחשבת שקטה
        // הסף כאן (5) הוא שרירותי וניתן להתאים אותו
        return averageVolume < 5;
    }
    
    /**
     * טיפול בקובץ הקלטה לאחר סיום ההקלטה
     * @param {File} recordedFile - קובץ ההקלטה
     */
    handleRecordedFile(recordedFile) {
        this.ui.selectedFile = recordedFile;
        
        // הצגת פרטי הקובץ בממשק
        this.ui.fileName.textContent = "הקלטה חדשה";
        this.ui.fileSize.textContent = `גודל: ${this.ui.formatFileSize(recordedFile.size)}`;
        
        // הצגת אזור מידע הקובץ עם אנימציה
        this.ui.fileInfo.style.display = 'block';
        this.ui.uploadArea.style.display = 'none';
        
        // עדכון זמן משוער לתמלול
        this.getRecordingDuration(recordedFile).then(duration => {
            this.ui.updateEstimatedTime(duration);
        }).catch(error => {
            console.error('שגיאה בקריאת אורך ההקלטה:', error);
            this.ui.updateEstimatedTime(this.recordingTime); // שימוש בזמן שנמדד
        });
        
        // הסתרת שגיאות קודמות
        this.ui.errorMessage.style.display = 'none';
        
        // גלילה עדינה למטה כדי להראות את האפשרויות
        setTimeout(() => {
            this.ui.fileInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.ui.transcribeBtn.focus();
        }, 300);
    }
    
    /**
     * קבלת אורך ההקלטה בשניות
     * @param {File} audioFile - קובץ האודיו
     * @returns {Promise<number>} - אורך ההקלטה בשניות
     */
    getRecordingDuration(audioFile) {
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
     * הוספת CSS לאנימציית גלי קול
     */
    addRecordingStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .record-wave {
                width: 300px;
                height: 60px;
                background-color: rgba(76, 110, 245, 0.1);
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }
            
            .recording .record-wave::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 2px;
                background-color: var(--primary-color);
                animation: waveAnimation 0.5s ease-in-out infinite;
                transform: scaleY(var(--wave-intensity, 1));
            }
            
            @keyframes waveAnimation {
                0%, 100% {
                    transform: translateY(0) scaleY(var(--wave-intensity, 1));
                }
                50% {
                    transform: translateY(0) scaleY(calc(var(--wave-intensity, 1) * 2));
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ייצוא המחלקה
window.RecordingHandler = RecordingHandler;