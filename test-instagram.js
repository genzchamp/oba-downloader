const { instagramGetUrl } = require("instagram-url-direct");

async function test() {

const url = "https://www.instagram.com/reel/DZ9JTx_IZLe/";

    try {

        const data = await instagramGetUrl(url);

        console.log(data);

    } catch (err) {

        console.log(err);

    }

}

test();
