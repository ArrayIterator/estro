'use strict';

/*!
 * Middlewares to handle header addition
 */
const {attach, dispatch} = require("../src/events-manager");

module.exports = function (bootstrap, express) {
    // @attach(on.middleware.start)
    attach('on.middleware.start', (bootstrap, request, response) => {
        // remove X-Powered-By
        response.removeHeader('X-Powered-By');
        // add X-Request-Id
        response.setHeader('X-Request-Id', request.uuid || bootstrap.request_uuid());

        // @dispatch(on.middleware.headers)
        dispatch('on.middleware.headers', bootstrap, request, response);
    });
}
