const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const cors = require('cors');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath); // קובע את הנתיב ל־ffmpeg

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.post('/youtube', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send("Missing YouTube URL");

    const timestamp = Date.now();
    const filename = `audio_${timestamp}.mp3`;
    const tempFile = `temp_${timestamp}.mp4`;

    try {
        const info = await ytdl.getInfo(url);
        console.log(`📥 מוריד: ${info.videoDetails.title}`);

        const stream = ytdl(url, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });

        const writeStream = fs.createWriteStream(tempFile);
        stream.pipe(writeStream);

        writeStream.on('finish', () => {
            ffmpeg(tempFile)
                .audioBitrate(128)
                .audioChannels(1)
                .audioFrequency(16000)
                .format('mp3')
                .output(filename)
                .on('end', () => {
                    console.log('✅ ההמרה הושלמה');

                    fs.unlinkSync(tempFile); // מוחק קובץ זמני

                    const fileStream = fs.createReadStream(filename);
                    res.setHeader('Content-Type', 'audio/mpeg');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    fileStream.pipe(res);

                    fileStream.on('close', () => {
                        fs.unlinkSync(filename); // מוחק את קובץ ה־MP3 אחרי שליחה
                    });
                })
                .on('error', (err) => {
                    console.error('❌ שגיאת ffmpeg:', err);
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                    res.status(500).send('שגיאה בהמרת הקובץ');
                })
                .run();
        });

        stream.on('error', (err) => {
            console.error('❌ שגיאת הורדה:', err);
            res.status(500).send('שגיאה בהורדת הסרטון');
        });

    } catch (err) {
        console.error('❌ שגיאה כללית:', err);
        res.status(500).send(`שגיאה בהורדה: ${err.message}`);
    }
});

app.get('/', (req, res) => {
    res.send('🎵 שרת תמלול יוטיוב פעיל!');
});

app.listen(port, () => {
    console.log(`✅ YouTube Server running on port ${port}`);
});
