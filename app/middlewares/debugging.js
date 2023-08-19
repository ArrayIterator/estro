/*!
 * Middlewares to handle header addition
 */
'use strict';

/*!
 * Debugging Middleware on console
 */
module.exports = function (bootstrap, express) {
    if (!bootstrap.is_debug()) {
        return;
    }

    express.use((req, res, next) => {
        console.info(
            '[Request] -> [Method: %s] [Host: %s] %s',
            req.method,
            req.hostname,
            req.originalUrl
        );
        next();
    });
}
