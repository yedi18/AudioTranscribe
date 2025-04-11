const axios = require('axios');

const getYoutubeMp3Link = async (videoId) => {
  const options = {
    method: 'GET',
    url: 'https://youtube-mp36.p.rapidapi.com/dl',
    params: { id: videoId },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const { link, title, status } = response.data;

    if (status === 'ok') {
      return { link, title };
    } else {
      throw new Error('ה־API לא הצליח להמיר את הסרטון');
    }

  } catch (error) {
    console.error('❌ שגיאה ב־youtubeHandler:', error.message);
    throw error;
  }
};

module.exports = { getYoutubeMp3Link };
