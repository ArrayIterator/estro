// @route('/');
// example
module.exports = (router, bootstrap, express) => {
    router.all('/', (req, res) => {
        res.responder.ok({
            path: req.path,
            ip: req.ip,
            userAgent: req.header('user-agent'),
            uuid: req.uuid,
            method: req.method,
            cookies: req.authCookie.cookies
        });
    });
}
