const express = require("express");

const router = express.Router();

const { downloadTikTok } = require("../services/tiktok");

router.get("/download", async (req, res) => {

    const url = req.query.url;

    if (!url) {

        return res.json({
            success:false,
            message:"Please provide a TikTok URL."
        });

    }

    try{

        const data = await downloadTikTok(url);

        res.json({
            success:true,
            platform:"TikTok",
            data
        });

    }catch(err){

        res.json({
            success:false,
            message:"Failed to download TikTok."
        });

    }

});

module.exports = router;
