const axios = require('axios');

const getYoutubeMp3Link = async (videoId, retries = 3, delay = 2000) => {
  const options = {
    method: 'GET',
    url: 'https://youtube-mp36.p.rapidapi.com/dl',
    params: { id: videoId },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
    }
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔁 ניסיון #${attempt} למשיכת MP3 מ־YouTube`);

      // המתנה בניסיונות נוספים
      if (attempt > 1) {
        console.log(`⏱️ ממתין ${delay / 1000} שניות לפני ניסיון חוזר...`);
        await new Promise(res => setTimeout(res, delay));
      }

      const response = await axios.request(options);
      const { link, title, status } = response.data;

      if (status === 'ok' && link) {
        console.log('✅ הצלחה בהמרה!');
        return { link, title };
      } else {
        console.warn(`⚠️ תשובה לא תקינה מה-API, סטטוס: ${status}`);
        // המתנה מעט ארוכה יותר בין הניסיונות
        await new Promise(res => setTimeout(res, 1000));
      }

    } catch (error) {
      console.warn(`❌ שגיאה בניסיון ${attempt}: ${error.message}`);

      // אם זה לא הניסיון האחרון, המשך לניסיון הבא
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error('לא הצלחנו להשיג קישור MP3 לאחר מספר ניסיונות');
};
module.exports = { getYoutubeMp3Link };
