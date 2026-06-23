const axios = require("axios");

async function downloadTikTok(url) {

    const response = await axios.get(
        `https://tikwm.com/api/?url=${encodeURIComponent(url)}`
    );

    return response.data.data;
}

module.exports = {
    downloadTikTok
};
