// noinspection JSUnusedGlobalSymbols

/*!
 * Bootstrap application listeners
 */
require('express-group-routes');
const delay = 5000;
const express = require('express')();
const events = require('./src/events-manager');
const dependencies = require('./src/dependencies');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const JsonResponder = require('./src/http-response').response;
const config = require('./src/configuration')();
const util = require('util');
const {dispatch, attach_once, attach_once_remove} = require("./src/events-manager");
const color = require('cli-color');
const path = require("path");
const Cookie = require("./src/auth/cookie");
const {request} = require("express");
const colorize = {
    info: 'blue',
    warn: 'yellow',
    error: 'red',
    debug: 'white',
    debugInfo: 'white',
};

/*!
 * PREPEND TIME ON CONSOLE
 */
const functions = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: config.application.debug_log ? (console.debug || console.log).bind(console) : () => '',
    trace: (console.trace || console.log).bind(console),
};

Object.keys(functions).forEach(function(k) {
    let name = k.toUpperCase();
    let fn = (e) => e;
    try {
        if (k !== 'log' && typeof colorize[k] !== "undefined") {
            fn = (e) => color[colorize[k]]['bold'](e);
        }
    } catch {
    }
    console[k] = function() {
        arguments[0] = util.format(
            '['
            + fn(name)
            + (k.length < 5 ? ' '.repeat(5 - k.length): '')
            + '] ['
            + color['cyan']((new Date).toISOString())
            + '] %s',
            fn(arguments[0])
        );
        functions[k].apply(console, arguments);
    };
});

// globals variables
let _time_start;
let _hr_time_start;
let _in_progress;
let _server_error;
let _response;
let _request;
let _time;
let _hrtime;
let _uuid;
let _server;

// bootstrap
const bootstrap = {
    root: () => path.resolve(__dirname + '../../'),
    configuration: () => config,
    is_debug: () => !!config.application.debug,
    is_benchmark: () => !!config.application.benchmark,
    request_hrtime : () => _request ? _request.hrtime : _hrtime,
    request_time : () => _request ? _request.time : _time,
    request_uuid : () => _request ? _request.uuid : _uuid,
    server_start_time : () => _time_start,
    server_start_hrtime : () => _hr_time_start,
    express: () => express,
    responder: (res) => {
        if (res && res.responder) {
            return res.responder;
        }
        return _response && _response.responder ? _response.responder : bootstrap.jsonResponder(res);
    },
    cookieAuth: () => {
        let request = bootstrap.currentRequest();
        return request ? request.authCookie : null;
    },
    currentResponse : () => _response,
    currentRequest : () => _request,
    jsonResponder: (response) => {
        let json = new JsonResponder();
        if (response) {
            json.setResponse(response);
        }
        return json;
    },
    run: () => {
        return new Promise((resolve, reject) => {
            let express = bootstrap.express();
            if (_server_error) {
                return reject(_server_error);
            }
            if (_server) {
                if (_in_progress) {
                    console.info(
                        'Application being initialize at %s',
                        _time_start.toISOString()
                    );
                } else {
                    console.info(
                        'Application already run on %s:%d at %s',
                        _server.address()['address'],
                        _server.address()['port'],
                        _time_start.toISOString()
                    );
                }
                return resolve(_server, express);
            }

            let retry = config.server.retry;

            retry = retry < 0 ? 0 : retry;
            _time_start = new Date();
            _hr_time_start = process.hrtime.bigint();

            let max_retry = retry;
            let host = config.server.host || '127.0.0.1';
            function createServer()
            {
                if (max_retry === retry) {
                    // @dispatch(on.before.create.server)
                    events.dispatch(
                        'on.before.create.server',
                        host,
                        config.server.port,
                        retry,
                        max_retry
                    );
                }

                _in_progress = true;
                console.info(
                    'Creating Server %s:%d %s',
                    host,
                    config.server.port,
                    (retry === max_retry
                        ? 'maximum retry : ('+ max_retry +')'
                        : ''
                    )
                );
                // @dispatch(on.before.server.listen)
                events.dispatch(
                    'on.before.listen.server',
                    host,
                    config.server.port,
                    retry,
                    max_retry
                );
                _server = express.listen(
                    config.server.port,
                    host,
                    () => {
                        _in_progress = false;
                        express.server = _server;
                        // noinspection HttpUrlsUsage
                        console.info(
                            "Listening http://%s:%d",
                            _server.address()['address'],
                            _server.address()['port']
                        );
                        // @dispatch(on.success.create.server)
                        events.dispatch(
                            'on.success.create.server',
                            _server,
                            host,
                            config.server.port,
                            retry,
                            max_retry
                        );
                        resolve(_server, express);
                    }
                ).on('error', (e) => {
                    if (retry-- < 1) {
                        _in_progress = false;
                        _server_error = e;
                        // @dispatch(on.failed.create.server)
                        events.dispatch(
                            'on.failed.create.server',
                            _server_error,
                            host,
                            config.server.port,
                            retry,
                            max_retry
                        );
                        return reject(e);
                    }
                    let try_used = 5;
                    let interval = setInterval(() => {
                        if (try_used-- < 1) {
                            console.log();
                            clearInterval(interval);
                            createServer();
                            return;
                        }
                        process.stdout.clearLine(0);  // clear current text
                        process.stdout.cursorTo(0);
                        process
                            .stdout
                            .write(
                                `Error: (${e.message}) - will executed in : ${try_used + 1}`
                            );
                    }, 1000);
                });
            }
            createServer();
        });
    }
}

module.exports = bootstrap;

// middlewares
express
    .use((
        req,
        res,
        next
    ) => {
        _time = new Date();
        _hrtime = process.hrtime.bigint();
        _uuid = uuid.v4();

        _response = res;
        _request  = req;
        _request.time = _time;
        _request.hrtime = _hrtime;
        _request.uuid = _uuid;
        _request.authCookie = new Cookie(req);

        // set json
        res.type('json');
        res.responder = bootstrap.jsonResponder(res);

        /*!
         * INTERVAL LOOPING
         */
        let requestTimeoutInterval;
        res.on('close', () => {
            if (requestTimeoutInterval) {
                clearInterval(requestTimeoutInterval);
                requestTimeoutInterval = null;
            }

            // @dispatch(express.server.closed)
            dispatch('express.server.closed');
            try {
                res.end();
            } catch (err) {
            }
        });

        let serverInterval = config.server.timeout;
            serverInterval = parseInt(serverInterval.toString());
            if (serverInterval < 2) {
                serverInterval = 2;
            }
        let originalServerInterval = serverInterval;

        function bootstrapDeleteIntervalTimedOut() {
            if (requestTimeoutInterval) {
                clearInterval(requestTimeoutInterval);
                requestTimeoutInterval = null;
            }
        }

        // @attach_once(on.json.response.after.send)
        attach_once_remove(
            'on.json.response.after.send',
            bootstrapDeleteIntervalTimedOut
        );

        requestTimeoutInterval = setInterval(() => {
            if (serverInterval-- > 0) {
                let intervalData = dispatch(
                    'server.looping.interval',
                    serverInterval
                );
                if (typeof intervalData === "number"
                    && intervalData !== serverInterval
                    && !/[^0-9]/.test(intervalData.toString())
                ) {
                    serverInterval = intervalData;
                }
                return;
            }

            serverInterval = 0;
            if (requestTimeoutInterval) {
                clearInterval(requestTimeoutInterval);
                requestTimeoutInterval = null;
            }

            let delays = delay/1000;
            requestTimeoutInterval = setInterval(
                () => {
                    if (delays-- > 0) {
                        return;
                    }
                    clearInterval(requestTimeoutInterval);
                    requestTimeoutInterval = null;
                    res
                        .status(408)
                        .json({message: 'Request Timeout'})
                        .send();
                },
                1000
            );
            console.error(
                'Request Timeout After %s seconds',
                originalServerInterval
            );
            // @dispatch(on.timeout)
            dispatch('on.timeout');
            return res.responder.serve(408, res);
        }, 1000);

        /*!
         * END INTERVAL LOOPING
         */

        // @dispatch(on.middleware.start)
        dispatch('on.middleware.start', bootstrap, req, res);

        next();

        // @dispatch(on.middleware.end)
        dispatch('on.middleware.end', bootstrap, req, res);
    })
    // Body Parser
    .use(bodyParser.urlencoded({extended: true}))
    .use(bodyParser.json());

express.bootstrap = bootstrap;

// load dependencies
dependencies.call(bootstrap, bootstrap, express);

// handle 404
// noinspection JSUnusedLocalSymbols
express
    .use('*', (req, res) => {
        bootstrap.responder(res).serve(404, res);
    })
    .use((err, req, res, next) => {
        // @dispatch(on.error)
        dispatch('on.error', err);
        console.log(bootstrap.responder(res));
        bootstrap.responder(res).serve(500, err, res);
    });

