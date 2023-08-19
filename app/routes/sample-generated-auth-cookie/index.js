// @route('/');
module.exports = (router, bootstrap, express) => {
    router.all('/', (req, res) => {
        let username = 'admin';
        let id = 1;
        let hash = req.authCookie.generateCookieValue(id, username);
        res.responder.ok({
            id,
            username,
            cookie: hash,
            validated: req.authCookie.validateCookieValue(hash),
        });
    });
}
