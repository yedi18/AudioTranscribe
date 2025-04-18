const axios = require('axios');

const getYoutubeMp3Link = async (videoId, retries = 5, delay = 3000) => {
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
      console.log(`🔁 ניסיון #${attempt}/${retries} למשיכת MP3 מ־YouTube`);

      // המתנה בניסיונות נוספים - הגדלת ההמתנה בכל ניסיון נוסף
      if (attempt > 1) {
        const waitTime = delay * (attempt - 1); // הגדלת ההמתנה בכל ניסיון
        console.log(`⏱️ ממתין ${waitTime / 1000} שניות לפני ניסיון חוזר...`);
        await new Promise(res => setTimeout(res, waitTime));
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
      console.warn(`❌ שגיאה בניסיון ${attempt}/${retries}: ${error.message}`);

      // אם זה לא הניסיון האחרון, המשך לניסיון הבא
      if (attempt < retries) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`לא הצלחנו להשיג קישור MP3 לאחר ${retries} ניסיונות`);
};

module.exports = { getYoutubeMp3Link };