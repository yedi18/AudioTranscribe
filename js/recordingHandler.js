/**
 * מודול מתוקן לטיפול בהקלטת אודיו
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
        this.audioContext = null;

        // אלמנטי ממשק
        this.startRecordBtn = document.getElementById('start-record-btn');
        this.stopRecordBtn = document.getElementById('stop-record-btn');
        this.recordTimer = document.getElementById('record-timer');
        this.recordWave = document.getElementById('record-wave');
        console.log('🎯 recordWave element:', this.recordWave);


        // קישור אירועים
        this.bindEvents();

        // אתחול האנימציה עם קו סטטי
        this.createStaticWaveform();

    }

    /**
   * יצירת canvas עם קו סטטי ראשוני 
   */
    createStaticWaveform() {
        if (!this.recordWave) {
            console.warn("אלמנט record-wave לא נמצא");
            return;
        }

        // ניקוי כל תוכן קיים
        this.recordWave.innerHTML = '';

        // יצירת canvas חדש
        const canvas = document.createElement('canvas');
        canvas.className = 'record-wave-canvas';
        canvas.width = 350;  // קבוע לפי ה-CSS
        canvas.height = 70;  // קבוע לפי ה-CSS

        // הוספת ה-canvas לתוך record-wave
        this.recordWave.appendChild(canvas);

        // שמירת ה-canvas כדי שנוכל להשתמש בו מאוחר יותר
        this.waveformCanvas = canvas;

        // ציור קו בסיס סטטי
        const ctx = canvas.getContext('2d');
        this.drawStaticLine(canvas, ctx);
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
            // בדיקה אם כבר מקליט
            if (this.isRecording) {
                console.log("כבר בהקלטה, מתעלם מהקריאה");
                return;
            }

            // איפוס הטיימר לפני התחלה חדשה
            this.recordingTime = 0;
            if (this.recordTimer) {
                this.recordTimer.textContent = '00:00';
            }

            // בקשת גישה למיקרופון
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1
                }
            });
            console.log("✅ קיבלנו גישה למיקרופון:", stream);

            this.recordingStream = stream;

            // התחלת אנימציית הגלים
            this.startWaveformAnimation(stream);
            console.log("🌊 מנסה להפעיל אנימציית גלים");


            // יצירת AudioContext לניתוח אודיו
            this.audioContext = new AudioContext({
                sampleRate: 44100,
                latencyHint: 'interactive'
            });

            const source = this.audioContext.createMediaStreamSource(stream);
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.1;
            source.connect(analyser);

            // הגדרת המקליט
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };

            this.recorder = new MediaRecorder(stream, options);

            // אירועי המקליט
            this.recorder.onstart = () => {
                console.log("🎙 ההקלטה התחילה בהצלחה!", this.recorder.mimeType);
                this.recordedChunks = [];
                this.isRecording = true;
            };

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    console.log("📦 התקבל chunk של הקלטה:", e.data.size, "bytes");
                    this.recordedChunks.push(e.data);
                } else {
                    console.warn("⚠️ התקבל chunk ריק");
                }
            };

            // הוספת ניתוח עוצמת שמע
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // פונקציה לעקיבה אחר עוצמת השמע
            const trackVolume = () => {
                if (!this.isRecording) return;

                analyser.getByteFrequencyData(dataArray);

                // חישוב ממוצע עוצמת הקול
                let average = 0;
                for (let i = 0; i < bufferLength; i++) {
                    average += dataArray[i];
                }
                average = average / bufferLength;

                // שמירת העוצמה לבדיקת שקט
                if (!this.volumeSamples) this.volumeSamples = [];
                this.volumeSamples.push(average);

                // הגבלת מספר הדגימות לזיכרון
                if (this.volumeSamples.length > 100) {
                    this.volumeSamples.shift();
                }

                requestAnimationFrame(trackVolume);
            };

            // התחלת מעקב אחר עוצמת השמע
            requestAnimationFrame(trackVolume);

            // התחלת ההקלטה
            this.recorder.start(1000);

            // עדכון ממשק המשתמש
            if (this.startRecordBtn) this.startRecordBtn.disabled = true;
            if (this.stopRecordBtn) this.stopRecordBtn.disabled = false;
            if (this.recordWave) this.recordWave.classList.add('recording');

            // התחלת טיימר
            // ניקוי טיימר קודם אם קיים
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
            }

            this.recordingInterval = setInterval(() => {
                this.recordingTime++;

                if (this.recordTimer) {
                    const minutes = Math.floor(this.recordingTime / 60).toString().padStart(2, '0');
                    const seconds = (this.recordingTime % 60).toString().padStart(2, '0');
                    this.recordTimer.textContent = `${minutes}:${seconds}`;
                }
            }, 1000);
        } catch (error) {
            console.error('שגיאה בהקלטה:', error);
            if (this.ui && this.ui.showError) {
                this.ui.showError('לא הצלחנו לגשת למיקרופון. אנא ודא שאישרת גישה למיקרופון ונסה שוב.');
            } else {
                alert('לא הצלחנו לגשת למיקרופון. אנא ודא שאישרת גישה למיקרופון ונסה שוב.');
            }
        }
    }

    async stopRecording() {
        console.log("🛑 עצירת הקלטה");

        if (this.recorder && this.recorder.state !== 'inactive') {
            // בקשת דגימה אחרונה לפני העצירה
            if (this.recorder.state === 'recording') {
                this.recorder.requestData();
            }

            console.log("📼 עוצר את המקליט");
            this.recorder.stop();

            // עדכון UI
            if (this.startRecordBtn) this.startRecordBtn.disabled = false;
            if (this.stopRecordBtn) this.stopRecordBtn.disabled = true;
            if (this.recordWave) this.recordWave.classList.remove('recording');

            // סימון שההקלטה הסתיימה
            this.isRecording = false;

            // עצירת הטיימר - חשוב!
            if (this.recordingInterval) {
                console.log("⏱️ עוצר את הטיימר");
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }



            // עצירת האנימציה
            this.stopWaveformAnimation();

            // עצירת סטרים המיקרופון
            if (this.recordingStream) {
                console.log("🎤 עוצר את סטרים המיקרופון");
                this.recordingStream.getTracks().forEach(track => track.stop());
                this.recordingStream = null;
            }

            try {
                // וידוא שהתקבלו chunks
                if (this.recordedChunks.length === 0) {
                    throw new Error("לא התקבלו נתוני הקלטה");
                }

                // יצירת blob מהקטעים שהוקלטו
                const webmBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                console.log("📁 Blob ראשוני שנוצר:", webmBlob.size, "bytes");

                // המרה ל-MP3 תקין
                const mp3Blob = await this.convertToMp3(webmBlob);
                console.log("🔄 המרה הושלמה, גודל ה-MP3:", mp3Blob.size, "bytes");

                // בדיקה אם ההקלטה ריקה או שקטה
                const isSilent = this.checkIfRecordingIsSilent();
                console.log("האם חלש", isSilent);

                if (isSilent) {
                    this.ui.showError('אין קובץ לתמלול: לא זוהה שמע בהקלטה. נא לנסות שוב ולדבר ברור יותר.');
                    return;
                }

                // איפוס הטיימר לאפס
                this.recordingTime = 0;
                if (this.recordTimer) {
                    this.recordTimer.textContent = '00:00';
                }

                // יצירת קובץ MP3
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const recordedFile = new File([mp3Blob], `הקלטה_${timestamp}.mp3`, {
                    type: 'audio/mp3',
                    lastModified: Date.now()
                });
                console.log("קובץ נוצר");

                // וידוא תקינות הקובץ
                const isValid = await this.validateAudioFile(recordedFile);
                if (!isValid) {
                    this.ui.showError('ההקלטה לא הצליחה ליצור קובץ תקין     . נסה שוב.');
                    return;
                }
                console.log("קובץ תקין")

                // טיפול בקובץ כאילו הועלה
                console.log("📝 שולח לתמלול");
                this.handleRecordedFile(recordedFile);
                //const blobUrl = URL.createObjectURL(recordedFile);

            } catch (error) {
                console.error("🔴 שגיאה בעיבוד ההקלטה:", error);
                if (this.ui && this.ui.showError) {
                    this.ui.showError(`שגיאה בעיבוד ההקלטה: ${error.message}`);
                } else {
                    alert(`שגיאה בעיבוד ההקלטה: ${error.message}`);
                }
            }
        }
    }

    startWaveformAnimation(stream) {
        if (!this.recordWave) {
            console.warn("⚠️ אלמנט record-wave לא נמצא");
            return;
        }

        // צור canvas רק אם לא קיים
        if (!this.waveformCanvas) {
            const canvas = document.createElement('canvas');
            canvas.className = 'record-wave-canvas';
            canvas.width = 350;
            canvas.height = 70;
            this.recordWave.appendChild(canvas);
            this.waveformCanvas = canvas;
        }

        const canvas = this.waveformCanvas;
        const ctx = canvas.getContext('2d');
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);

        this.analyser = audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.fftSize;
        this.dataArray = new Uint8Array(this.bufferLength);

        source.connect(this.analyser);

        this.waveformCtx = ctx;
        this.waveformHistory = [];
        this.waveformSilentCounter = 0;

        const barWidth = 2;
        const spacing = 1;

        const draw = () => {
            this.analyser.getByteTimeDomainData(this.dataArray);

            const centerY = canvas.height / 2;
            const scale = 1.4;
            const sample = this.dataArray[Math.floor(this.bufferLength / 2)];
            const v = (sample - 128) / 128.0;
            const height = v * centerY * scale;

            this.waveformSilentCounter = Math.abs(height) < 1 ? this.waveformSilentCounter + 1 : 0;
            this.waveformHistory.unshift(this.waveformSilentCounter < 10 || this.waveformHistory.length < 3 ? height : 0);

            const maxBars = Math.floor(canvas.width / (barWidth + spacing));
            if (this.waveformHistory.length > maxBars) this.waveformHistory.pop();

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // קו אופקי באמצע
            ctx.beginPath();
            ctx.strokeStyle = '#4c6ef5';
            ctx.lineWidth = 1;
            ctx.moveTo(0, centerY);
            ctx.lineTo(canvas.width, centerY);
            ctx.stroke();

            // ציור הגלים
            for (let i = 0; i < this.waveformHistory.length; i++) {
                const h = this.waveformHistory[i];
                const x = canvas.width - i * (barWidth + spacing);
                ctx.beginPath();
                ctx.strokeStyle = '#4c6ef5';
                ctx.lineWidth = barWidth;
                ctx.moveTo(x, centerY);
                ctx.lineTo(x, centerY + h);
                ctx.moveTo(x, centerY);
                ctx.lineTo(x, centerY - h);
                ctx.stroke();
            }

            if (this.isRecording) {
                this.waveformAnimationId = requestAnimationFrame(draw);
            }
        };

        // התחלת ציור
        this.isRecording = true;
        draw();
    }

    /**
    * עצירת אנימציית גלי הקול
    */
    stopWaveformAnimation() {
        if (this.waveformAnimationId) {
            cancelAnimationFrame(this.waveformAnimationId);
            this.waveformAnimationId = null;
        }

    }

    drawStaticLine(canvas, ctx) {
        // וידוא שה-canvas בגודל הנכון
        if (canvas.width !== 350) canvas.width = 350;
        if (canvas.height !== 70) canvas.height = 70;

        const centerY = canvas.height / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = '#4c6ef5';
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();
    }


    /**
     * המרת WebM ל-MP3 באמצעות AudioContext
     * @param {Blob} webmBlob - ה-WEBM שיש להמיר
     * @return {Promise<Blob>} - ה-MP3 המומר
     */
    async convertToMp3(webmBlob) {
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioContext = this.audioContext || new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const samples = audioBuffer.getChannelData(0); // ערוץ 1 (mono)
        const sampleRate = audioBuffer.sampleRate;

        const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // mono, 128kbps
        const blockSize = 1152;
        const mp3Data = [];

        for (let i = 0; i < samples.length; i += blockSize) {
            const sampleChunk = samples.subarray(i, i + blockSize);
            const int16Chunk = new Int16Array(sampleChunk.length);

            for (let j = 0; j < sampleChunk.length; j++) {
                int16Chunk[j] = Math.max(-32768, Math.min(32767, sampleChunk[j] * 32767));
            }

            const mp3buf = mp3Encoder.encodeBuffer(int16Chunk);
            if (mp3buf.length > 0) {
                mp3Data.push(new Uint8Array(mp3buf));
            }
        }

        const finalBuffer = mp3Encoder.flush();
        if (finalBuffer.length > 0) {
            mp3Data.push(new Uint8Array(finalBuffer));
        }
        console.log("🎼 מה מחזיר convertToMp3:", new Blob(mp3Data, { type: 'audio/mp3' }));

        return new Blob(mp3Data, { type: 'audio/mp3' });
    }


    /**
     * המרת AudioBuffer לקובץ WAV
     * @param {AudioBuffer} audioBuffer - ה-AudioBuffer להמרה
     * @return {Blob} קובץ WAV כ-Blob
     */
    audioBufferToWav(audioBuffer) {
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
        return averageVolume < 3;
    }

    /**
     * בדיקת תקינות קובץ אודיו
     * @param {File} audioFile - קובץ האודיו
     * @returns {Promise<boolean>} - האם הקובץ תקין
     */
    async validateAudioFile(audioFile) {
        return new Promise((resolve) => {
            try {
                // בדיקה בסיסית של גודל הקובץ
                if (!audioFile || audioFile.size < 1000) {
                    console.error('❌ קובץ האודיו קטן מדי:', audioFile?.size);
                    resolve(false);
                    return;
                }

                const audio = new Audio();
                let timeoutId;

                audio.oncanplay = () => {
                    clearTimeout(timeoutId);
                    URL.revokeObjectURL(audio.src);
                    console.log('✅ קובץ האודיו תקין, אורך:', audio.duration);
                    resolve(true);
                };

                audio.onerror = (e) => {
                    clearTimeout(timeoutId);
                    URL.revokeObjectURL(audio.src);
                    console.error('❌ שגיאה בקובץ האודיו:', e);
                    resolve(false);
                };

                // טיימאאוט למקרה שאין תגובה
                timeoutId = setTimeout(() => {
                    URL.revokeObjectURL(audio.src);
                    console.warn('⏱️ תם הזמן לבדיקת קובץ האודיו');
                    resolve(false);
                }, 5000);

                // ניסיון לטעון את הקובץ
                audio.src = URL.createObjectURL(audioFile);
                audio.load();
            } catch (error) {
                console.error('❌ שגיאה בבדיקת קובץ האודיו:', error);
                resolve(false);
            }
        });
    }

    /**
    * טיפול בקובץ הקלטה לאחר סיום ההקלטה
    * @param {File} recordedFile - קובץ ההקלטה
     */
    handleRecordedFile(recordedFile) {
        console.log('✅ מתחיל טיפול בקובץ הקלטה:', recordedFile.name, recordedFile.size, "bytes");

        try {
            // שמירת התייחסות לקובץ המוקלט ומקורו
            const audioFile = recordedFile;

            // מעבר ללשונית העלאת קובץ ראשית
            console.log('מעבר ללשונית העלאת קובץ');
            const uploadTab = document.querySelector('[data-tab="upload-file"]');
            if (uploadTab) {
                uploadTab.click();
            } else {
                console.error('לא נמצאה לשונית "העלאת קובץ"');
            }

            // המתנה קצרה לאחר המעבר ללשונית
            setTimeout(() => {
                try {
                    // קריאה לפונקציה האחידה
                    if (!this.ui) {
                        throw new Error('this.ui לא מוגדר בתוך handleRecordedFile');
                    }

                    console.log('קריאה ל-handleNewFile עם מקור:', 'recording');
                    this.ui.handleNewFile(audioFile, 'recording');

                    // וידוא תצוגת אזורים
                    if (this.ui.uploadArea) {
                        console.log('מצב תצוגה של uploadArea לפני:',
                            window.getComputedStyle(this.ui.uploadArea).display);
                        this.ui.uploadArea.style.display = 'none';
                    }

                    if (this.ui.fileInfo) {
                        console.log('מצב תצוגה של fileInfo לפני:',
                            window.getComputedStyle(this.ui.fileInfo).display);
                        this.ui.fileInfo.style.display = 'block';
                    }

                    // עדכון זמן משוער לתמלול
                    this.getRecordingDuration(audioFile)
                        .then(duration => {
                            console.log("📏 זמן שנמדד:", duration, "שניות");
                            this.ui.updateEstimatedTime(duration);
                        })
                        .catch(err => {
                            console.error("⛔ שגיאה בזמן:", err);
                            this.ui.updateEstimatedTime(15); // ברירת מחדל
                        });

                    // גלילה עדינה למטה ומיקוד על כפתור התמלול
                    setTimeout(() => {
                        if (this.ui.fileInfo) {
                            this.ui.fileInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                        if (this.ui.transcribeBtn) {
                            this.ui.transcribeBtn.focus();
                        }

                        // וידוא סופי שהאזורים מוצגים כראוי
                        console.log('מצב סופי - fileInfo:',
                            this.ui.fileInfo ? window.getComputedStyle(this.ui.fileInfo).display : 'לא קיים',
                            'uploadArea:',
                            this.ui.uploadArea ? window.getComputedStyle(this.ui.uploadArea).display : 'לא קיים');
                    }, 300);

                } catch (innerError) {
                    console.error('❌ שגיאה בטיפול בקובץ לאחר מעבר לשונית:', innerError);
                    if (this.ui && typeof this.ui.showError === 'function') {
                        this.ui.showError('שגיאה בטיפול בקובץ לאחר מעבר לשונית: ' + innerError.message);
                    }
                }
            }, 100); // המתנה קצרה לאחר מעבר לשונית

            // ניקוי משאבי הקלטה
            this.cleanupRecordingResources();

            console.log('✅ טיפול ראשוני בקובץ המוקלט הושלם');

        } catch (error) {
            console.error('❌ שגיאה בטיפול בקובץ ההקלטה:', error);
            if (this.ui && typeof this.ui.showError === 'function') {
                this.ui.showError('שגיאה בטיפול בקובץ ההקלטה: ' + error.message);
            }
        }
    }

    /**
     * ניקוי משאבי הקלטה
     */
    cleanupRecordingResources() {
        // עצירת הטיימר
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }

        // איפוס הטיימר
        this.recordingTime = 0;
        if (this.recordTimer) {
            this.recordTimer.textContent = '00:00';
        }

        // עצירת סטרים המיקרופון
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(track => track.stop());
            this.recordingStream = null;
        }

        // איפוס מצב הכפתורים
        if (this.startRecordBtn) {
            this.startRecordBtn.disabled = false;
        }

        if (this.stopRecordBtn) {
            this.stopRecordBtn.disabled = true;
        }

        // סגירת AudioContext
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    // להוסיף למחלקת RecordingHandler
    resetRecordingUI() {
        // איפוס מצב ההקלטה
        this.isRecording = false;

        // איפוס הטיימר
        this.recordingTime = 0;
        if (this.recordTimer) {
            this.recordTimer.textContent = '00:00';
        }

        // איפוס מצב כפתורים
        if (this.startRecordBtn) {
            this.startRecordBtn.disabled = false;
        }
        if (this.stopRecordBtn) {
            this.stopRecordBtn.disabled = true;
        }

        // איפוס אנימציית הגלים
        this.stopWaveformAnimation();
        this.createStaticWaveform();

        // ניקוי חלקי הקלטה
        this.recordedChunks = [];

        // ניקוי סטרים אם קיים
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(track => track.stop());
            this.recordingStream = null;
        }

        // סגירת AudioContext
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
    /**
     * קבלת אורך ההקלטה בשניות
     * @param {File} audioFile - קובץ האודיו
     * @returns {Promise<number>} - אורך ההקלטה בשניות
     */
    getRecordingDuration(audioFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const audioContext = new AudioContext();

                audioContext.decodeAudioData(reader.result)
                    .then((decodedData) => {
                        resolve(decodedData.duration); // ⬅️ זה הזמן האמיתי
                    })
                    .catch((error) => {
                        console.error("❌ שגיאה בפענוח אודיו:", error);
                        reject(error);
                    });
            };

            reader.onerror = (err) => {
                reject(err);
            };

            reader.readAsArrayBuffer(audioFile);
        });
    }
}
// ייצוא המחלקה
window.RecordingHandler = RecordingHandler;
