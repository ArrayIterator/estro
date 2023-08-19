'use strict';

/*!
 * Events that approach function checking by content of function
 * Default priority is 10
 */
const _events = {};
const _called = {};
const _current_event_named = {};
const _once_remove_fn = {};
const {sha1} = require('./encryption/hash');

function attach_event_once(name, fn, priority = 10) {
    priority = typeof priority === "number"
        ? priority
        : 10;

    let event = get_event(name, fn, priority);
    if (event) {
        return event;
    }

    return attach_event(name, fn, priority);
}

function attach_once_remove(name, fn, priority = 10)
{
    priority = typeof priority === "number"
        ? priority
        : 10;
    let event = get_event(name, fn, priority);
    if (event) {
        return event;
    }

    let attached = attach_event(name, fn, priority);
    if (!attached) {
        return attached;
    }
    if (!_once_remove_fn[name]) {
        _once_remove_fn[name] = {};
    }
    priority = attached.priority;
    if (!_once_remove_fn[name][priority]) {
        _once_remove_fn[name][priority] = {};
    }
    _once_remove_fn[name][priority][sha1(fn.toString())] = true;
    return attached;
}

function attach_event(name, fn, priority = 10) {
    if (typeof name !== 'string' || typeof fn !== "function" ) {
        return false;
    }
    priority = typeof priority !== "number" ? 10 : priority;
    if (!_events[name]) {
        _events[name] = {};
    }
    if (_events[name][priority] === undefined) {
        _events[name][priority] = [];
    }

    _events[name][priority].push(fn);
    return {
        function: fn,
        priority
    };
}

function remove_event(name = null, fn = null, priority = null) {
    let counted = 0;
    if (typeof name !== 'string' && name !== null
        || priority !== null && priority !== undefined && typeof priority !== "number"
    ) {
        return counted;
    }
    if (typeof fn === "function"
        && _once_remove_fn[name]
        && typeof _once_remove_fn[name] === "object"
    ) {
        if (priority === null || _once_remove_fn[name][priority]) {
            let fnHash = sha1(fn.toString());
            for (let prior in _once_remove_fn[name]) {
                let p = parseInt(prior);
                if (priority === null || p === priority) {
                    delete _once_remove_fn[name][prior][fnHash];
                }
                if (Object.keys(_once_remove_fn[name][prior]).length === 0) {
                    delete _once_remove_fn[name][prior];
                }
            }
            if (Object.keys(_once_remove_fn[name]).length === 0) {
                delete _once_remove_fn[name];
            }
        }
    }

    priority = typeof priority !== "number" ? null : priority;
    for (let theName in _events) {
        if (name !== null && name === theName) {
            continue;
        }

        for (let prior in _events[theName]) {
            let p = parseInt(prior);
            if (priority !== null && p !== priority) {
                continue;
            }
            if (!fn) {
                counted += Object.keys(_events[theName][prior]);
                delete _events[theName][prior];
                if (Object.keys(_events[theName]).length === 0) {
                    delete _events[theName];
                }
                continue;
            }

            let eventData = [];
            for (let i in _events[theName][prior]) {
                if (fn === _events[theName][prior][i]
                    || fn.toString() !== _events[theName][prior][i].toString()
                ) {
                    eventData.push(_events[theName][prior]);
                    continue;
                }
                counted++;
            }
            if (eventData.length > 0) {
                _events[theName][prior] = eventData;
            } else {
                delete _events[theName][prior];
            }
        }

        if (Object.values(_events[theName]).length === 0) {
            delete _events[theName];
        }
    }

    return counted;
}

function dispatch_event(name, ..._arguments) {
    if (typeof name !== 'string' || _events[name] === undefined) {
        return _arguments[0];
    }
    let keyData = [];
    if (_current_event_named[name]) {
        keyData = Object.values(name);
        delete _current_event_named[name];
    }

    _current_event_named[name] = keyData;
    _events[name] = Object
        .keys(_events[name])
        .sort()
        .reduce(
            (obj, key) => {
                obj[key] = _events[name][key];
                return obj;
            },
            {}
        );
    let _eventData = Object.assign({}, _events[name]);
    for (let prior in _eventData) {
        for (let i in _eventData[prior]) {
            if (!_called[name]) {
                _called[name] = {};
            }
            for (let ia in _current_event_named[name]) {
                if (_current_event_named[name][ia] === _eventData[prior][i]
                    || _current_event_named[name][ia].toString() === _eventData[prior][i].toString()
                ) {
                    delete _current_event_named[name][ia];
                    break;
                }
            }
            let hashName = sha1(_eventData[prior][i].toString());
            if (!_called[name][hashName]) {
                _called[name][hashName] = 0;
            }
            if (_once_remove_fn[name] && _once_remove_fn[name][prior]) {
                if (_once_remove_fn[name][prior][hashName]) {
                    delete _once_remove_fn[name][prior][hashName];
                    if (_events[name][prior]
                        && _events[name][prior][i]
                    ) {
                        let eventsData = [];
                        let iString = i.toString();
                        for (let keyRemove in _events[name][prior]) {
                            if (keyRemove === iString) {
                                continue;
                            }
                            eventsData.push(_events[name][prior]);
                        }
                        if (eventsData.length) {
                            _events[name][prior] = eventsData;
                        } else {
                            delete _events[name][prior];
                        }
                    }
                }

                if (Object.keys(_once_remove_fn[name][prior]).length === 0) {
                    delete _once_remove_fn[name][prior];
                }
                if (Object.keys(_once_remove_fn[name]).length === 0) {
                    delete _once_remove_fn[name];
                }
                if (_events[name] && _events[name][prior]) {
                    if (Object.keys(_events[name][prior]).length === 0) {
                        delete _events[name][prior];
                    }
                }
            }

            _current_event_named[name].push(_eventData[prior][i]);
            _called[name][hashName]++;
            _arguments[0]  = _eventData[prior][i](..._arguments);
            for (let ia in _current_event_named[name]) {
                if (_current_event_named[name][ia] === _eventData[prior][i]) {
                    delete _current_event_named[name][ia];
                    break;
                }
            }
        }
    }

    if (_events[name] && Object.keys(_events[name]).length === 0) {
        delete _events[name];
    }

    if (Object.keys(_current_event_named[name]).length === 0) {
        delete _current_event_named[name];
    }

    return _arguments[0];
}

function get_event(name, fn, priority) {
    if (typeof name !== 'string'
        || _events[name] === undefined
        || typeof fn !== "function"
        || typeof priority !== "number"
    ) {
        return null;
    }
    for (let prior in _events[name]) {
        let p = parseInt(prior);
        if (p !== priority) {
            continue;
        }
        for (let i in _events[name][prior]) {
            if (fn.toString() === _events[name][prior][i].toString()) {
                return {
                    function: _events[name][prior][i],
                    priority: p
                };
            }
        }
    }

    return null;
}


function dispatched_count(name, fn) {
    if (!_called[name] || typeof fn !== "function") {
        return 0;
    }
    let hash = sha1(fn.toString());
    return _called[name][hash] || 0;
}

function has_event(name, fn = null, priority = null) {
    let count = 0;
    if (typeof name !== 'string' || _events[name] === undefined) {
        return count;
    }
    for (let prior in _events[name]) {
        let p = parseInt(prior);
        if (priority !== null && p !== priority) {
            continue;
        }
        if (!fn) {
            count += Object.keys(_events[name][prior]).length;
            continue;
        }
        for (let i in _events[name][prior]) {
            if (!fn || fn.toString() === _events[name][prior][i].toString()) {
                count++;
            }
        }
    }

    return count;
}

function current_event() {
    let obj = Object.values(_current_event_named);
    obj = obj.pop();
    return obj.length ? obj[obj.length-1] : null;
}

function in_event(name, fn  = null) {
    if (!_current_event_named[name]) {
        return false;
    }
    if (!fn) {
        return true;
    }

    for (let key in _current_event_named[name]) {
        if (_current_event_named[name][key] === fn
            || _current_event_named[name][key].toString() === fn.toString()
        ) {
            return true;
        }
    }

    return false;
}

module.exports = {
    dispatch: dispatch_event,
    attach: attach_event,
    attach_once_remove,
    attach_once: attach_event_once,
    remove: remove_event,
    inside: in_event,
    current: current_event,
    dispatched_count,
    has: has_event
}
