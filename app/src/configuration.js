const default_config = {
    "application": {
        "debug": null,
        "environment" : "production",
        "prettify": false,
        "debug_log": true,
        "benchmark": false
    },
    "database": {},
    "cookie": {
        "name": "cookie_session",
        "path": "/",
        "expire": 0
    },
    "security" : {
        "key": "",
        "salt": ""
    },
    "server": {
        "port": 3000,
        "host": "127.0.0.1",
        "timeout": 5,
        "retry" : 10
    }
};
const default_db_config = {
    "username": "root",
    "password": "",
    "database": "",
    "host": "127.0.0.1",
    "port": 3306,
    "dialect": "mysql",
}
let configuration;

/**
 * @returns {{} & {} & {server: {port: number, host: string, timeout: number, retry: number}, database: {}, security: {salt: string, key: string}, application: {environment: string, benchmark: false, debug: null, debug_log: boolean, prettify: boolean}, cookie: {path: string, expire: number, name: string}} & {application: {debug: *, environment: string, prettify: boolean}, database: {}, cookie: {name: string, path: string, expire: number}, security: {key: string, salt: string}, server: {port: number, host: string, timeout: number, retry: number}}}
 */
module.exports = () => {
    if (configuration && typeof configuration === 'object') {
        return Object.assign({}, configuration);
    }
    let json, database;
    try {
        json = require('../../config.json');
    } catch (err) {
    }
    if (Object.prototype.toString.call(json) !== '[object Object]') {
        json = {};
    }
    try {
        database = require('../../database.json');
    } catch (err) {
    }
    if (Object.prototype.toString.call(database) !== '[object Object]') {
        database = {};
    }

    configuration = Object.assign({}, default_config, json);
    if (typeof configuration.server.port !== "number") {
        if (typeof configuration.server.port === 'string'
            && !configuration.server.port.match(/[^0-9]/)
        ) {
            configuration.server.port = parseInt(configuration.server.port);
        }
    }
    if (typeof configuration.server.port !== 'number') {
        configuration.server.port = default_config.server.port;
    }

    for (let key in configuration) {
        if (default_config.hasOwnProperty(key)
            && typeof configuration[key] !== typeof default_config[key]
        ) {
            configuration[key] = default_config[key];
        }
    }

    // override database
    for (let key in database) {
        if (typeof database[key] !== 'object') {
            continue;
        }
        let db = database[key];
        key = key.toLowerCase();
        configuration.database[key] = Object.assign(configuration.database[key]||{}, db);
    }
    if (typeof configuration.server.timeout !== 'number') {
        configuration.server.timeout = default_config.server.timeout;
    }
    if (configuration.server.timeout < 2) {
        configuration.server.timeout = 2;
    }
    if (configuration.server.timeout > 3600) {
        configuration.server.timeout = 3600;
    }

    // fallback default database
    if (typeof configuration.database[configuration.application.environment] !== "object") {
        configuration.database[configuration.application.environment] = default_db_config;
    }
    // override by node env
    configuration.application.environment = process.env.NODE_ENV || configuration.application.environment;
    if (typeof configuration.application.environment !== 'string') {
        configuration.application.environment = 'production';
    }
    configuration.application.environment = configuration.application.environment.toLowerCase();
    configuration.application.debug = typeof configuration.application === "object"
        && (
            typeof configuration.application?.debug == "boolean"
                ? configuration.application.debug
                : (
                    // dev|developments?|staging|test|tests|testings?
                    /^(?:dev(?:elopments?)?|staging|test(?:(?:ing)?s?)?)$/i
                        .test(configuration.application.environment)
                )
        );
    configuration.application.prettify = !!(configuration.application.debug || configuration.application.prettify);
    return Object.assign({}, configuration);
};
