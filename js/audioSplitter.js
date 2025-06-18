/**
 * מודול לחילוק קבצי אודיו גדולים לחלקים קטנים לפי בייטים
 */
class AudioSplitter {
    /**
     * חילוק קובץ אודיו גדול לחלקים קטנים לפי גודל בבייטים
     * @param {File} audioFile - קובץ האודיו לחילוק
     * @param {number} maxSizeBytes - גודל מקסימלי לכל חלק בבייטים (ברירת מחדל: 24MB)
     * @param {Function} onProgress - פונקציית callback לעדכון התקדמות
     * @returns {Promise<File[]>} מערך של חלקי אודיו
     */
    static async splitBySize(audioFile, maxSizeBytes = 24 * 1024 * 1024, onProgress = null) {
        try {
            if (audioFile.size <= maxSizeBytes) {
                if (onProgress) onProgress({ status: 'complete', progress: 100 });
                return [audioFile];
            }

            // קריאת הקובץ המלא כ-ArrayBuffer
            const arrayBuffer = await audioFile.arrayBuffer();
            const totalSize = arrayBuffer.byteLength;
            const numChunks = Math.ceil(totalSize / maxSizeBytes);

            const chunks = [];
            
            for (let i = 0; i < numChunks; i++) {
                const start = i * maxSizeBytes;
                const end = Math.min(start + maxSizeBytes, totalSize);
                
                // יצירת חלק חדש
                const chunkData = arrayBuffer.slice(start, end);
                const chunkBlob = new Blob([chunkData], { type: audioFile.type || 'audio/mpeg' });
                
                // יצירת שם קובץ לחלק
                const originalName = audioFile.name || 'audio.mp3';
                const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
                const extension = originalName.split('.').pop() || 'mp3';
                const chunkName = `${nameWithoutExt}_חלק_${i + 1}.${extension}`;
                
                const chunkFile = new File([chunkBlob], chunkName, {
                    type: audioFile.type || 'audio/mpeg',
                    lastModified: Date.now()
                });
                
                chunks.push(chunkFile);
                
                // עדכון התקדמות
                if (onProgress) {
                    const progress = ((i + 1) / numChunks) * 100;
                    onProgress({
                        status: 'splitting',
                        progress: progress,
                        currentChunk: i + 1,
                        totalChunks: numChunks,
                        message: `מחלק חלק ${i + 1} מתוך ${numChunks}`
                    });
                }
            }

            if (onProgress) onProgress({ status: 'complete', progress: 100 });
            return chunks;

        } catch (error) {
            throw error;
        }
    }

    /**
     * בדיקה אם קובץ זקוק לחילוק
     * @param {File} file - הקובץ לבדיקה
     * @param {number} maxSize - גודל מקסימלי בבייטים (ברירת מחדל: 24MB)
     * @returns {boolean} האם הקובץ זקוק לחילוק
     */
    static needsSplitting(file, maxSize = 24 * 1024 * 1024) {
        return file.size > maxSize;
    }

    /**
     * קבלת מספר החלקים הצפוי
     * @param {File} file - הקובץ
     * @param {number} maxSize - גודל מקסימלי לחלק (ברירת מחדל: 24MB)
     * @returns {number} מספר החלקים הצפוי
     */
    static getExpectedChunks(file, maxSize = 24 * 1024 * 1024) {
        return Math.ceil(file.size / maxSize);
    }

    /**
     * הערכת עלות התמלול
     * @param {File} file - הקובץ
     * @returns {Object} מידע על העלות הצפויה
     */
    static estimateCost(file) {
        const sizeInMB = file.size / (1024 * 1024);
        const estimatedMinutes = sizeInMB * 0.5; // הערכה גסה: 0.5 דקות לכל MB
        const costPerMinute = 0.006; // $0.006 לדקה
        const estimatedCost = estimatedMinutes * costPerMinute;
        
        return {
            estimatedMinutes: Math.round(estimatedMinutes),
            estimatedCostUSD: Number(estimatedCost.toFixed(3)),
            estimatedCostILS: Number((estimatedCost * 3.7).toFixed(2))
        };
    }

    /**
     * הערכת זמן תמלול לקובץ 24MB
     * @param {File} file - הקובץ
     * @returns {Object} מידע על זמן התמלול הצפוי
     */
    static estimateTranscriptionTime(file) {
        const sizeInMB = file.size / (1024 * 1024);
        
        // נתונים מבוססי ניסיון:
        // קובץ 24MB (~3 שעות אודיו) לוקח בדרך כלל 45-90 שניות לתמלול
        const baseTimePerMB = 3; // 3 שניות לכל MB
        const variabilityFactor = 0.5; // וריאציה של 50%
        
        const estimatedSeconds = sizeInMB * baseTimePerMB;
        const minTime = estimatedSeconds * (1 - variabilityFactor);
        const maxTime = estimatedSeconds * (1 + variabilityFactor);
        
        return {
            estimatedSeconds: Math.round(estimatedSeconds),
            minSeconds: Math.round(minTime),
            maxSeconds: Math.round(maxTime),
            displayText: this.formatTime(estimatedSeconds)
        };
    }

    /**
     * פורמט זמן לתצוגה
     * @param {number} seconds - זמן בשניות
     * @returns {string} זמן מפורמט
     */
    static formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)} שניות`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes} דקות${remainingSeconds > 0 ? ` ו-${remainingSeconds} שניות` : ''}`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} שעות${minutes > 0 ? ` ו-${minutes} דקות` : ''}`;
        }
    }
}

// ייצוא המודול
window.AudioSplitter = AudioSplitter;