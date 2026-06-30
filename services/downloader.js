const { downloadTikTok } = require("./tiktok");
const { downloadInstagram } = require("./instagram");

async function download(url) {

    if (url.includes("tiktok")) {
        return await downloadTikTok(url);
    }


    if (
        url.includes("instagram.com/reel/") ||
        url.includes("instagram.com/p/")
    ) {
        return await downloadInstagram(url);
    }

    return {
        success: false,
        platform: "Unknown",
        message: "Platform not supported yet."
    };

}

module.exports = {
    download
};
