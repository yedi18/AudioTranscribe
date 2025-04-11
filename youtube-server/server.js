const express = require('express');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
// פונקציה שמוודאת שהקובץ נוצר בדיסק
const waitForFile = (path, timeout = 5000) =>
    new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (!err) return resolve(true);
                if (Date.now() - start > timeout) return reject(new Error('File did not appear in time'));
                setTimeout(check, 200);
            });
        };
        check();
    });

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/youtube', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send("Missing YouTube URL");

    const filename = `audio_${Date.now()}.mp3`;

    try {
        // שינוי הפרמטרים שמועברים ל-yt-dlp
        await ytdlp(url, {
            output: filename,
            extractAudio: true,
            audioFormat: 'mp3',
            postProcessorArgs: [
              '-ar', '16000',  // דגימת קול: 16kHz
              '-ac', '1',      // ערוץ אחד (מונו)
              '-b:a', '128k'   // קצב דגימה: 128kbps
            ]
          });
          
        await waitForFile(filename); // המתנה לקובץ להיווצר

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
