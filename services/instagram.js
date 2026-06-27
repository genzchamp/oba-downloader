const { instagramGetUrl } = require("instagram-url-direct");

async function downloadInstagram(url) {

    const data = await instagramGetUrl(url);

    return {
        platform: "Instagram",
        title: data.post_info.caption || "Instagram Reel",
        author: {
            nickname: data.post_info.owner_username
        },
        play: data.url_list[0],
        thumbnail: data.media_details[0].thumbnail
    };

}

module.exports = {
    downloadInstagram
};
