function validateUrl(req, res, next) {

    const url = req.query.url;

    if (!url) {
        return res.json({
            success: false,
            message: "Please enter a URL."
        });
    }

    try {
        new URL(url);
        next();
    } catch {
        return res.json({
            success: false,
            message: "Invalid URL."
        });
    }

}

module.exports = validateUrl;
