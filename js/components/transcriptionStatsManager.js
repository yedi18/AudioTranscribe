// js/transcriptionStatsManager.js
/**
 * מחלקה לניהול סטטיסטיקות תמלול - גרסה משופרת
 * מספקת הערכות זמן מדויקות יותר והצגת נתונים מפורטת
 */
class TranscriptionStatsManager {
    constructor() {
        this.storageKey = 'transcription_statistics';
        this.stats = this.loadStats();
    }

    loadStats() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    saveStats() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
        } catch (error) {
            console.warn('Failed to save transcription stats:', error);
        }
    }

    addTranscriptionStat(fileSize, duration, transcriptionTime, actualCost = null) {
        const stat = {
            timestamp: Date.now(),
            fileSize, // בבייטים
            duration, // בשניות
            transcriptionTime, // זמן תמלול בפועל בשניות
            actualCost, // עלות בפועל ב-USD
            date: new Date().toISOString()
        };

        this.stats.unshift(stat);

        // שמירה של מקסימום 50 סטטיסטיקות
        if (this.stats.length > 50) {
            this.stats = this.stats.slice(0, 50);
        }

        this.saveStats();
        this.updateStatsDisplay();
    }

    getAverageStats() {
        if (this.stats.length === 0) return null;

        const recent = this.stats.slice(0, 15); // 15 האחרונים לדיוק טוב יותר
        const totalTime = recent.reduce((sum, stat) => sum + stat.transcriptionTime, 0);
        const totalSize = recent.reduce((sum, stat) => sum + stat.fileSize, 0);
        const avgTimePerMB = totalTime / (totalSize / (1024 * 1024));

        return {
            count: recent.length,
            avgTimePerMB,
            avgTranscriptionTime: totalTime / recent.length,
            avgFileSize: totalSize / recent.length,
            totalProcessedMB: totalSize / (1024 * 1024),
            efficiency: this.calculateEfficiency(recent)
        };
    }

    calculateEfficiency(stats) {
        // חישוב יעילות על בסיס יחס זמן תמלול לגודל קובץ
        if (stats.length < 3) return null;
        
        const ratios = stats.map(stat => {
            const sizeMB = stat.fileSize / (1024 * 1024);
            return stat.transcriptionTime / sizeMB;
        });
        
        const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
        const stdDev = Math.sqrt(ratios.reduce((sum, ratio) => sum + Math.pow(ratio - avgRatio, 2), 0) / ratios.length);
        
        return {
            avgSecondsPerMB: avgRatio,
            consistency: Math.max(0, 100 - (stdDev / avgRatio * 100)) // אחוז עקביות
        };
    }

    estimateTranscriptionTime(fileSizeBytes) {
        const averageStats = this.getAverageStats();
        if (!averageStats || averageStats.count < 3) {
            // ברירת מחדל מבוססת על נתונים אמפיריים
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            
            // הערכה מדויקת יותר בהתבסס על גודל הקובץ
            if (fileSizeMB <= 1) {
                return Math.max(15, fileSizeMB * 25); // קבצים קטנים - 25 שניות ל-MB
            } else if (fileSizeMB <= 10) {
                return Math.max(25, fileSizeMB * 18); // קבצים בינוניים - 18 שניות ל-MB
            } else if (fileSizeMB <= 50) {
                return Math.max(60, fileSizeMB * 12); // קבצים גדולים - 12 שניות ל-MB
            } else {
                return Math.max(180, fileSizeMB * 8); // קבצים מאוד גדולים - 8 שניות ל-MB
            }
        }

        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        const estimatedTime = fileSizeMB * averageStats.avgTimePerMB;
        
        // הוספת מרווח בטיחות של 20% בהתבסס על עקביות
        const safetyMargin = averageStats.efficiency && averageStats.efficiency.consistency > 70 ? 1.1 : 1.3;
        
        return Math.max(15, estimatedTime * safetyMargin);
    }

    getEstimateText(fileSizeBytes) {
        const averageStats = this.getAverageStats();
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        const estimatedSeconds = this.estimateTranscriptionTime(fileSizeBytes);
        
        let baseText = this.formatTimeEstimate(estimatedSeconds);
        
        if (averageStats && averageStats.count >= 5) {
            const confidence = averageStats.efficiency?.consistency || 50;
            let reliabilityText = '';
            
            if (confidence > 80) {
                reliabilityText = '(הערכה מדויקת)';
            } else if (confidence > 60) {
                reliabilityText = '(הערכה טובה)';
            } else {
                reliabilityText = '(הערכה בסיסית)';
            }
            
            const avgMB = averageStats.avgFileSize / (1024 * 1024);
            const processingNote = `בהתבסס על ${averageStats.count} תמלולים אחרונים - גודל ממוצע: ${avgMB.toFixed(1)}MB`;
            
            return `${baseText} ${reliabilityText}<br><small style="color: #666;">${processingNote}</small>`;
        }
        
        return `${baseText} (הערכה ראשונית)`;
    }

    formatTimeEstimate(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)} שניות`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            if (remainingSeconds === 0) {
                return `${minutes} דקות`;
            } else if (remainingSeconds < 30) {
                return `${minutes}-${minutes + 1} דקות`;
            } else {
                return `כ-${minutes + 1} דקות`;
            }
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} שעות${minutes > 0 ? ` ו-${minutes} דקות` : ''}`;
        }
    }

    updateStatsDisplay() {
        const statsCard = document.getElementById('transcription-stats');
        const tipsCard = document.getElementById('tips-card');

        if (!statsCard || !tipsCard) return;

        const averageStats = this.getAverageStats();

        if (averageStats && averageStats.count >= 3) {
            const statsCount = document.getElementById('stats-count');
            const statsList = document.getElementById('stats-list');

            if (statsCount) statsCount.textContent = averageStats.count;

            if (statsList) {
                const avgTimeMins = Math.round(averageStats.avgTranscriptionTime / 60 * 10) / 10;
                const avgSizeMB = Math.round(averageStats.avgFileSize / (1024 * 1024) * 10) / 10;
                const timePerMB = Math.round(averageStats.avgTimePerMB * 10) / 10;
                const efficiency = averageStats.efficiency;

                let efficiencyText = '';
                if (efficiency && efficiency.consistency > 60) {
                    efficiencyText = `<li>עקביות: ${Math.round(efficiency.consistency)}% - מערכת לומדת את הדפוסים שלך</li>`;
                }

                // הערכה לגדלים שונים
                const estimate20MB = this.formatTimeEstimate(this.estimateTranscriptionTime(20 * 1024 * 1024));
                const estimate5MB = this.formatTimeEstimate(this.estimateTranscriptionTime(5 * 1024 * 1024));

                statsList.innerHTML = `
                    <li>זמן תמלול ממוצע: ${avgTimeMins} דקות</li>
                    <li>גודל קובץ ממוצע: ${avgSizeMB} MB</li>
                    <li>מהירות עיבוד: ${timePerMB} שניות ל-MB</li>
                    ${efficiencyText}
                    <li><strong>הערכות:</strong> קובץ 5MB ～ ${estimate5MB} | 20MB ～ ${estimate20MB}</li>
                `;
            }

            statsCard.style.display = 'block';
        } else {
            statsCard.style.display = 'none';
        }
    }

    generateDetailedStatsHTML() {
        if (this.stats.length === 0) {
            return '<p>אין נתוני תמלול זמינים עדיין.</p>';
        }

        const recent = this.stats.slice(0, 20);
        const averageStats = this.getAverageStats();
        
        let html = `
            <div class="stats-summary">
                <h4>סיכום סטטיסטיקות (${recent.length} תמלולים אחרונים)</h4>
                <div class="stats-grid">
        `;

        if (averageStats) {
            const avgTimeMins = Math.round(averageStats.avgTranscriptionTime / 60 * 10) / 10;
            const avgSizeMB = Math.round(averageStats.avgFileSize / (1024 * 1024) * 10) / 10;
            const totalProcessedMB = Math.round(averageStats.totalProcessedMB * 10) / 10;

            html += `
                <div class="stat-item">
                    <div class="stat-value">${avgTimeMins} דק'</div>
                    <div class="stat-label">זמן ממוצע</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${avgSizeMB} MB</div>
                    <div class="stat-label">גודל ממוצע</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(averageStats.avgTimePerMB)} שנ'/MB</div>
                    <div class="stat-label">מהירות</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalProcessedMB} MB</div>
                    <div class="stat-label">סה"כ עובד</div>
                </div>
            `;

            if (averageStats.efficiency) {
                html += `
                    <div class="stat-item">
                        <div class="stat-value">${Math.round(averageStats.efficiency.consistency)}%</div>
                        <div class="stat-label">עקביות</div>
                    </div>
                `;
            }
        }

        // הערכות לגדלים שונים
        const commonSizes = [1, 5, 10, 20, 50]; // MB
        html += `
                </div>
                <div class="prediction-section">
                    <h5>הערכות זמן לגדלי קבצים נפוצים:</h5>
                    <div class="predictions-grid">
        `;

        commonSizes.forEach(sizeMB => {
            const sizeBytes = sizeMB * 1024 * 1024;
            const estimatedTime = this.formatTimeEstimate(this.estimateTranscriptionTime(sizeBytes));
            html += `
                <div class="prediction-item">
                    <span class="size">${sizeMB}MB</span>
                    <span class="arrow">→</span>
                    <span class="time">${estimatedTime}</span>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
            <div class="stats-table">
                <h4>היסטוריית תמלולים מפורטת</h4>
                <table>
                    <thead>
                        <tr>
                            <th>תאריך</th>
                            <th>גודל קובץ</th>
                            <th>זמן תמלול</th>
                            <th>מהירות</th>
                            <th>יעילות</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        recent.forEach(stat => {
            const date = new Date(stat.timestamp).toLocaleDateString('he-IL');
            const sizeMB = (stat.fileSize / (1024 * 1024)).toFixed(1);
            const timeMin = (stat.transcriptionTime / 60).toFixed(1);
            const speedPerMB = (stat.transcriptionTime / (stat.fileSize / (1024 * 1024))).toFixed(1);
            
            // חישוב יעילות יחסית
            const expectedTime = this.estimateTranscriptionTime(stat.fileSize);
            const efficiency = Math.round((expectedTime / stat.transcriptionTime) * 100);
            const efficiencyClass = efficiency > 100 ? 'excellent' : efficiency > 80 ? 'good' : efficiency > 60 ? 'average' : 'poor';

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${sizeMB} MB</td>
                    <td>${timeMin} דק'</td>
                    <td>${speedPerMB} שנ'/MB</td>
                    <td class="efficiency-${efficiencyClass}">${efficiency}%</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }
}

// ייצוא המחלקה
window.TranscriptionStatsManager = TranscriptionStatsManager;