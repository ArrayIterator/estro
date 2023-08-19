const fs = require('fs');
// @appPath
const appPath = require('path').dirname(__dirname);
const ds = require('path').sep;
const {dispatch} = require("./events-manager");

let loaded = false;

module.exports = function (bootstrap, express) {
    if (loaded) {
        return;
    }
    loaded = true;
    let fullPath;
    let directories_to_load = [
        'middlewares',
        'modules',
        'routes'
    ];
    console.info(
        'Preparing [Dependencies -> "%s"]',
        appPath
    );
    for (let key in directories_to_load) {
        let keyIn = directories_to_load[key];
        fullPath = appPath + ds + keyIn;
        if (!fs.existsSync(fullPath)) {
            console.warn(
                'Directory "%s" has not found',
                directories_to_load[key]
            );
            continue;
        }
        try {
            fullPath = fs.realpathSync(fullPath) || fullPath;
        } catch (err) {
        }
        if (!fullPath) {
            continue;
        }
        let lists = fs.readdirSync(fullPath);
        for (let key in lists) {
            let fn;
            let file = fullPath + ds + lists[key];
            try {
                let stat = fs.lstatSync(file);
                if (keyIn !== 'routes' && !stat.isFile()) {
                    console.warn(
                        '[%s -> %s] is not a file.',
                        keyIn.replace(/^[a-z]/, (e) => e.toUpperCase()),
                        lists[key]
                    );
                    continue;
                }

                if (keyIn === 'routes' && lists[key] !== 'index.js') {
                    try {
                        if (!fs.lstatSync(file + ds + 'index.js')?.isFile()) {
                            console.warn(
                                '[%s -> %s] is not a file.',
                                keyIn.replace(/^[a-z]/, (e) => e.toUpperCase()),
                                lists[key] + ds + 'index.js'
                            );
                            continue;
                        }
                        fn = require(file + ds + 'index.js');
                    } catch (err) {
                        console.warn(
                            '[%s -> %s] is not a exists.',
                            keyIn.replace(/^[a-z]/, (e) => e.toUpperCase()),
                            lists[key] + ds + 'index.js'
                        );
                        continue;
                    }
                } else {
                    // must be file
                    if (!stat.isFile()) {
                        console.warn(
                            '[%s -> %s] is not a file.',
                            keyIn.replace(/^[a-z]/, (e) => e.toUpperCase()),
                            lists[key]
                        );
                        continue;
                    }
                    fn = require(file);
                }

                if (typeof fn !== "function") {
                    console.warn(
                        '[%s -> %s] is not a function.',
                        keyIn.replace(/^[a-z]/, (e) => e.toUpperCase()),
                        lists[key]
                    );
                    continue;
                }
                console.debug(
                    'Dispatching [%s -> %s]',
                    keyIn.replace(/^[a-z]/, (e) => e.toUpperCase()),
                    lists[key]
                );

                // @see keyIn
                // @dispatch(on.{keyIn}.dispatch)
                dispatch(
                    'on.' + keyIn +'.dispatch',
                    lists[key],
                    file
                );

                if (keyIn !== 'routes') {
                    // dispatch non route
                    fn.call(bootstrap, bootstrap, express);
                } else {
                    let lower = '';
                    if (lists[key] !== 'index.js') {
                        lower = '/'
                            + lists[key]
                            .toLowerCase()
                            .replace(/[^0-9a-z_-]/, '-')
                            .replace(/-+/, '-')
                            .replace(/(^-+|-+$)/, '');
                    }
                    express.group(lower, (router) => {
                        fn.call(bootstrap, router, bootstrap, express);
                    });
                }

                // @dispatch(on.{keyIn}.dispatched)
                dispatch(
                    'on.' + keyIn +'.dispatched',
                    lists[key],
                    file
                );

            } catch (error) {
                // @dispatch(on.error.{keyIn}.dispatch)
                dispatch(
                    'on.error.' + keyIn +'.dispatch',
                    error,
                    lists[key],
                    file
                );
                console.error(error);
            }
        }
    }
};
