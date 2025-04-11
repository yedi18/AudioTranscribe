const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); // טוען משתני סביבה מקובץ .env

const { getYoutubeMp3Link } = require('./youtubeHandler');

const app = express();
const PORT = 10000;

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
        const { link, title } = await getYoutubeMp3Link(videoId);
        res.json({ mp3Link: link, title });

    } catch (err) {
        console.error('שגיאה ב־/youtube:', err.message);
        res.status(500).json({ error: 'שגיאה בקבלת קובץ MP3 מהשרת החיצוני' });
    }
});

// הפעלת השרת
app.listen(PORT, () => {
    console.log(`✅ YouTube Server running on port ${PORT}`);
});
