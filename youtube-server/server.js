const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); // טוען משתני סביבה מקובץ .env

const { getYoutubeMp3Link } = require('./youtubeHandler');

const app = express();
const PORT = 10000;

const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const upload = multer({ dest: 'temp_uploads/' });

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// בדיקת בריאות
app.get('/', (req, res) => {
    res.send('🎉 YouTube MP3 Server is running!');
});

// API: קבלת קובץ MP3 מ־YouTube
app.post('/youtube', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes('youtube.com')) {
        return res.status(400).json({ error: 'Missing or invalid YouTube URL' });
    }

    try {
        const videoId = new URL(url).searchParams.get("v");

        if (!videoId) {
            return res.status(400).json({ error: 'לא נמצא מזהה וידאו בקישור' });
        }

        console.log(`📺 מנסה להוריד סרטון יוטיוב: ${videoId}`);

        // שימוש בפרמטרים מורחבים: 5 ניסיונות עם השהייה של 4 שניות
        const { link, title } = await getYoutubeMp3Link(videoId, 5, 4000);

        console.log(`✅ התקבל קישור MP3 בהצלחה עבור: ${title}`);
        res.json({ mp3Link: link, title });

    } catch (err) {
        console.error('שגיאה ב־/youtube:', err.message);

        // הודעת שגיאה ברורה יותר
        res.status(500).json({
            error: 'שגיאה בקבלת קובץ MP3 מהשרת החיצוני',
            details: err.message
        });
    }
});
// API: קבלת קובץ אודיו והמרתו ל-MP3
app.post('/convert-audio', upload.single('audio'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send('קובץ לא התקבל');

    const originalPath = file.path;
    const outputPath = path.join('temp_uploads', `${file.filename}.mp3`);

    const ext = path.extname(file.originalname).toLowerCase();
    const isMp3 = ext === '.mp3';

    if (isMp3) {
        // אם זה כבר MP3 – שלח כמו שהוא
        return res.sendFile(path.resolve(originalPath));
    }
    // אחרי שליחת הקובץ למשתמש
    setTimeout(() => {
        fs.existsSync(originalPath) && fs.unlinkSync(originalPath);
        fs.existsSync(outputPath) && fs.unlinkSync(outputPath);
    }, 30000); // מחיקה אחרי 30 שניות


    // המרה ל-MP3
    ffmpeg(originalPath)
        .output(outputPath)
        .audioCodec('libmp3lame')
        .on('end', () => {
            console.log('✅ המרה ל-MP3 הושלמה');
            res.sendFile(path.resolve(outputPath));
        })
        .on('error', (err) => {
            console.error('❌ שגיאה בהמרה ל-MP3:', err.message);
            res.status(500).send('שגיאה בהמרת הקובץ');
        })
        .run();
});


// הפעלת השרת
app.listen(PORT, () => {
    console.log(`✅ YouTube Server running on port ${PORT}`);
});
