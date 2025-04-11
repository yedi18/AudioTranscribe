const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

const port = process.env.PORT || 5000;

app.use(express.json());

app.post('/youtube', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send("Missing YouTube URL");

    const filename = `audio_${Date.now()}.mp3`;
    const tempFile = `temp_${Date.now()}.mp4`;

    try {
        // בדיקה שהסרטון קיים וניתן להוריד
        const info = await ytdl.getInfo(url);
        console.log(`מוריד: ${info.videoDetails.title}`);

        // יצירת stream הורדה
        const stream = ytdl(url, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });

        // שמירת הקובץ המקורי כקובץ זמני ואז המרה ל-MP3
        const writeStream = fs.createWriteStream(tempFile);

        stream.pipe(writeStream);

        writeStream.on('finish', () => {
            // המרה ל-MP3 עם הגדרות ספציפיות
            ffmpeg(tempFile)
                .audioBitrate(128)
                .audioChannels(1)
                .audioFrequency(16000)
                .format('mp3')
                .output(filename)
                .on('end', () => {
                    console.log('המרה הושלמה');

                    // מחיקת הקובץ הזמני
                    fs.unlinkSync(tempFile);

                    // שליחת הקובץ לקליינט
                    const fileStream = fs.createReadStream(filename);
                    res.setHeader('Content-Type', 'audio/mpeg');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    fileStream.pipe(res);

                    fileStream.on('close', () => {
                        fs.unlinkSync(filename);
                    });
                })
                .on('error', (err) => {
                    console.error('שגיאת ffmpeg:', err);
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                    res.status(500).send('שגיאה בהמרת הקובץ');
                })
                .run();
        });

        stream.on('error', (err) => {
            console.error('שגיאת הורדה:', err);
            res.status(500).send('שגיאה בהורדת הסרטון');
        });

    } catch (err) {
        console.error('שגיאה:', err);
        res.status(500).send(`שגיאה בהורדה: ${err.message}`);
    }
});

app.get('/', (req, res) => {
    res.send('🎵 שרת תמלול יוטיוב פעיל!');
});

app.listen(port, () => {
    console.log(`✅ YouTube Server running on port ${port}`);
});