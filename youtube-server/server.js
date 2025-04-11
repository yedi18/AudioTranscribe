const express = require('express');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/youtube', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send("Missing YouTube URL");

    const filename = `audio_${Date.now()}.mp3`;

    try {
        await ytdlp(url, {
            output: filename,
            extractAudio: true,
            audioFormat: 'mp3',
            postProcessorArgs: ['-ar', '16000', '-ac', '1']
        });


        const fileStream = fs.createReadStream(filename);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fileStream.pipe(res);

        fileStream.on('close', () => {
            fs.unlinkSync(filename);
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("שגיאה בהורדה או המרה");
    }
});

app.get('/', (req, res) => {
    res.send('🎵 שרת תמלול יוטיוב פעיל!');
});

app.listen(port, () => {
    console.log(`✅ YouTube Server running on port ${port}`);
});
