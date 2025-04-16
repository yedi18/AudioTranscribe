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
      const response = await axios.request(options);
      const { link, title, status } = response.data;

      if (status === 'ok') {
        console.log('✅ הצלחה בהמרה!');
        return { link, title };
      } else {
        throw new Error('ה־API לא החזיר status=ok');
      }

    } catch (error) {
      console.warn(`❌ שגיאה בניסיון ${attempt}: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

module.exports = { getYoutubeMp3Link };
