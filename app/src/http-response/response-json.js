// noinspection JSUnusedGlobalSymbols

"use strict";

const {ServerResponse} = require('http');
// root ->
const rootPath = require('path').resolve(__dirname + '/../../../');
const events = require('../events-manager');
const {phrase: httpPhrase, code: httpCode} = require('./codes');
const config = require('../configuration')();

let listener;

function getListener()
{
    if (!listener) {
        listener = require('../../bootstrap');
    }
    return listener;
}

function ResponseJSON (code, data)
{
    if (arguments.length > 0) {
        return this.serve(code, data);
    }
    return this;
}

ResponseJSON.prototype.getListener = getListener;

/**
 * @param code
 * @param data
 * @returns {object}
 */
ResponseJSON.prototype.formatResponse = function (code, data) {
    let httpMessage = !data
        ? httpPhrase(code)
        : data;
    if (code < 400) {
        return {data: data};
    }

    let result = {
        message: data || httpMessage
    };
    if (data && typeof data === "object") {
        if (typeof data.message === 'string'
            || data instanceof Error
        ) {
            result.message = data.message;
        }
    }

    if (config.application.debug
        && typeof data !=='string'
        && data
        && typeof data === 'object'
        && (!data.hasOwnProperty('message')
            || Object.keys(data).length > 1
            || data instanceof Error
        )
    ) {
        if (data instanceof Error) {
            let stacks = data.stack.split("\n"),
                trace = [],
                regx = new RegExp('(^|[\s\(]+)' + rootPath, 'g');

            for (let key = 0;stacks.length > key;key++) {
                if (key === 0) {
                    continue;
                }
                trace.push(
                    stacks[key]
                        .trim()
                        .replace(/^at\s+/, '')
                        .replace(regx, '$1__ROOT__')
                );
            }
            result.trace = {
                name: data.name,
                message: data.message,
                stack: trace
            };
        } else {
            result.trace = data;
        }
    }

    let newResult = events.dispatch(
        'json.response.format',
        result,
        code,
        data
    );
    return newResult && typeof newResult === 'object' ? newResult : result;
};

ResponseJSON.prototype.response = null;
ResponseJSON.prototype.setResponse = function (response) {
    this.response = response;
}
ResponseJSON.prototype.serve = function (code = 200, data = undefined, response) {
    let _arguments = {code, data, response};
    if (typeof code === "number"
        || typeof code === 'string' && !/[^0-9]/.test(code.toString())
    ) {
        code = parseInt(code.toString());
        delete _arguments['code'];
    }

    if (response instanceof ServerResponse) {
        delete _arguments['response'];
    }

    for (let key in _arguments) {
        let current = _arguments[key];
        if (current instanceof ServerResponse) {
            response = current;
            delete _arguments[key];
            continue;
        }
        if (typeof current === "number"
            || typeof current === 'string' && !/[^0-9]/.test(current.toString())
        ) {
            code = parseInt(current.toString());
            delete _arguments[key];
        }
    }

    data = _arguments.data;
    if (! (response instanceof ServerResponse)) {
        response = this.response;
    }

    // fallback default
    if (! (response instanceof ServerResponse)) {
        response = require('../../bootstrap').currentResponse();
    }

    if (typeof code !== "number" && !response instanceof ServerResponse) {
        code = 200;
    }
    if (typeof data === "undefined") {
        data = httpPhrase(code);
    }
    if (typeof code === 'string' && ! code.test(/[^0-9]+/)) {
        code = parseInt(code.toString());
    }
    if (typeof code !== "number") {
        code = response instanceof Error ? 500 : 200;
    }

    let httpCode = events
        .dispatch(
            'json.response.code',
            code,
            data,
            response
        );
    if (typeof httpCode === "number" && httpPhrase(code)) {
        code = httpCode;
    }

    let formatted = this.formatResponse(code, data);
    let result = JSON
        .stringify(
            formatted,
            null,
            config.application.prettify ? 4 : 0
        );

    let newResult = events.dispatch(
        'json.response.result',
        result,
        formatted,
        code,
        data,
        response
    );

    if (typeof newResult === 'string' && newResult !== result) {
        try {
            if (typeof JSON.parse(newResult) === 'object') {
                result = newResult;
            }
        } catch (err) {

        }
    }

    response.type('json').status(code);
    events.dispatch('on.json.response.before.send', response);

    response.send(result);

    events.dispatch('on.json.response.after.send', response);
    return response;
}

ResponseJSON.prototype.continue = function (data, response) {
    return this.serve(httpCode.CONTINUE, data, response);
}
ResponseJSON.prototype.switchingProtocols = function (data, response) {
    return this.serve(httpCode.SWITCHING_PROTOCOLS, data, response);
}
ResponseJSON.prototype.processing = function (data, response) {
    return this.serve(httpCode.PROCESSING, data, response);
}
ResponseJSON.prototype.ok = function (data, response) {
    return this.serve(httpCode.OK, data, response);
}
ResponseJSON.prototype.success = ResponseJSON.prototype.ok;

ResponseJSON.prototype.created = function (data, response) {
    return this.serve(httpCode.CREATED, data, response);
}
ResponseJSON.prototype.accepted = function (data, response) {
    return this.serve(httpCode.ACCEPTED, data, response);
}
ResponseJSON.prototype.nonAuthoritativeInformation = function (data, response) {
    return this.serve(httpCode.NON_AUTHORITATIVE_INFORMATION, data, response);
}
ResponseJSON.prototype.noContent = function (data, response) {
    return this.serve(httpCode.NO_CONTENT, data, response);
}
ResponseJSON.prototype.resetContent = function (data, response) {
    return this.serve(httpCode.RESET_CONTENT, data, response);
}
ResponseJSON.prototype.partialContent = function (data, response) {
    return this.serve(httpCode.PARTIAL_CONTENT, data, response);
}
ResponseJSON.prototype.multiStatus = function (data, response) {
    return this.serve(httpCode.MULTI_STATUS, data, response);
}
ResponseJSON.prototype.alreadyReported = function (data, response) {
    return this.serve(httpCode.ALREADY_REPORTED, data, response);
}
ResponseJSON.prototype.multipleChoices = function (data, response) {
    return this.serve(httpCode.MULTIPLE_CHOICES, data, response);
}
ResponseJSON.prototype.movedPermanently = function (data, response) {
    return this.serve(httpCode.MOVED_PERMANENTLY, data, response);
}
ResponseJSON.prototype.found = function (data, response) {
    return this.serve(httpCode.FOUND, data, response);
}
ResponseJSON.prototype.seeOther = function (data, response) {
    return this.serve(httpCode.SEE_OTHER, data, response);
}
ResponseJSON.prototype.notModified = function (data, response) {
    return this.serve(httpCode.NOT_MODIFIED, data, response);
}
ResponseJSON.prototype.useProxy = function (data, response) {
    return this.serve(httpCode.USE_PROXY, data, response);
}
ResponseJSON.prototype.switchProxy = function (data, response) {
    return this.serve(httpCode.SWITCH_PROXY, data, response);
}
ResponseJSON.prototype.temporaryRedirect = function (data, response) {
    return this.serve(httpCode.TEMPORARY_REDIRECT, data, response);
}
ResponseJSON.prototype.badRequest = function (data, response) {
    return this.serve(httpCode.BAD_REQUEST, data, response);
}
ResponseJSON.prototype.unauthorized = function (data, response) {
    return this.serve(httpCode.UNAUTHORIZED, data, response);
}
ResponseJSON.prototype.paymentRequired = function (data, response) {
    return this.serve(httpCode.PAYMENT_REQUIRED, data, response);
}
ResponseJSON.prototype.forbidden = function (data, response) {
    return this.serve(httpCode.FORBIDDEN, data, response);
}
ResponseJSON.prototype.notFound = function (data, response) {
    return this.serve(httpCode.NOT_FOUND, data, response);
}
ResponseJSON.prototype.methodNotAllowed = function (data, response) {
    return this.serve(httpCode.METHOD_NOT_ALLOWED, data, response);
}
ResponseJSON.prototype.notAcceptable = function (data, response) {
    return this.serve(httpCode.NOT_ACCEPTABLE, data, response);
}
ResponseJSON.prototype.proxyAuthenticationRequired = function (data, response) {
    return this.serve(httpCode.PROXY_AUTHENTICATION_REQUIRED, data, response);
}
ResponseJSON.prototype.requestTimeOut = function (data, response) {
    return this.serve(httpCode.REQUEST_TIME_OUT, data, response);
}
ResponseJSON.prototype.conflict = function (data, response) {
    return this.serve(httpCode.CONFLICT, data, response);
}
ResponseJSON.prototype.gone = function (data, response) {
    return this.serve(httpCode.GONE, data, response);
}
ResponseJSON.prototype.lengthRequired = function (data, response) {
    return this.serve(httpCode.LENGTH_REQUIRED, data, response);
}
ResponseJSON.prototype.preconditionFailed = function (data, response) {
    return this.serve(httpCode.PRECONDITION_FAILED, data, response);
}
ResponseJSON.prototype.requestEntityTooLarge = function (data, response) {
    return this.serve(httpCode.REQUEST_ENTITY_TOO_LARGE, data, response);
}
ResponseJSON.prototype.requestUriTooLarge = function (data, response) {
    return this.serve(httpCode.REQUEST_URI_TOO_LARGE, data, response);
}
ResponseJSON.prototype.unsupportedMediaType = function (data, response) {
    return this.serve(httpCode.UNSUPPORTED_MEDIA_TYPE, data, response);
}
ResponseJSON.prototype.requestedRangeNotSatisfiable = function (data, response) {
    return this.serve(httpCode.REQUESTED_RANGE_NOT_SATISFIABLE, data, response);
}
ResponseJSON.prototype.expectationFailed = function (data, response) {
    return this.serve(httpCode.EXPECTATION_FAILED, data, response);
}
ResponseJSON.prototype.imATeapot = function (data, response) {
    return this.serve(httpCode.IM_A_TEAPOT, data, response);
}
ResponseJSON.prototype.unprocessableEntity = function (data, response) {
    return this.serve(httpCode.UNPROCESSABLE_ENTITY, data, response);
}
ResponseJSON.prototype.locked = function (data, response) {
    return this.serve(httpCode.LOCKED, data, response);
}
ResponseJSON.prototype.failedDependency = function (data, response) {
    return this.serve(httpCode.FAILED_DEPENDENCY, data, response);
}
ResponseJSON.prototype.unorderedCollection = function (data, response) {
    return this.serve(httpCode.UNORDERED_COLLECTION, data, response);
}
ResponseJSON.prototype.upgradeRequired = function (data, response) {
    return this.serve(httpCode.UPGRADE_REQUIRED, data, response);
}
ResponseJSON.prototype.preconditionRequired = function (data, response) {
    return this.serve(httpCode.PRECONDITION_FAILED, data, response);
}
ResponseJSON.prototype.tooManyRequests = function (data, response) {
    return this.serve(httpCode.TOO_MANY_REQUESTS, data, response);
}
ResponseJSON.prototype.requestHeaderFieldsTooLarge = function (data, response) {
    return this.serve(httpCode.REQUEST_HEADER_FIELDS_TOO_LARGE, data, response);
}
ResponseJSON.prototype.unavailableForLegalReasons = function (data, response) {
    return this.serve(httpCode.UNAVAILABLE_FOR_LEGAL_REASONS, data, response);
}
ResponseJSON.prototype.internalServerError = function (data, response) {
    return this.serve(httpCode.INTERNAL_SERVER_ERROR, data, response);
}
ResponseJSON.prototype.error = ResponseJSON.prototype.internalServerError;

ResponseJSON.prototype.notImplemented = function (data, response) {
    return this.serve(httpCode.NOT_IMPLEMENTED, data, response);
}
ResponseJSON.prototype.badGateway = function (data, response) {
    return this.serve(httpCode.BAD_GATEWAY, data, response);
}
ResponseJSON.prototype.serviceUnavailable = function (data, response) {
    return this.serve(httpCode.SERVICE_UNAVAILABLE, data, response);
}

module.exports = ResponseJSON;
