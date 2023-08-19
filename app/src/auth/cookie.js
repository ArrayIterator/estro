"use strict";
/*!
 * Session less cookie authentication
 */
const {IncomingMessage} = require('http');
const {sha1, hash_hmac} = require("../encryption/hash");
const {parse: parseCookie} = require("cookie");

function getBrowserNameBased(request)
{
    let ua = request.header('user-agent');
    let result = {};
    let match = ua ? ua.match(/^[^(]+\(([^;\s)]+);/) : [];
    match = match || [];
    result['system'] = match[1] ? match[1].trim().toLocaleLowerCase() : 'unknown';
    let regex = {
        'edge': /\s+Edge\//i,
        'msie': /\s+MSIE\s+[1-9]/i,
        'firefox': /\s+Firefox\//i,
        'opera': /\s+Opera\//i,
        'chrome': /\s+Chrome\//i,
        'safari': /AppleWebKit.*\s+Safari\/[0-9.]+\s*$/i,
        'webkit': /\s+Webkit\//i,
    }
    for (let i in regex) {
        if (regex[i].test(ua)) {
            result['browser'] = i;
            break;
        }
    }
    if (!result['browser']) {
        result['browser'] = 'unknown';
    }
    return result;
}

class Cookie
{
    _cookieName;
    _securityKey = null;
    _request;
    _rawCookies = '';
    _cookies = {};
    _userAgent;
    _userAgentHash;
    _skipUserAgent = false;
    _hash_records = {};

    constructor(request, cookieName = null, securityKey = null) {
        if (!request instanceof IncomingMessage) {
            throw new Error(
                "Argument 'request' must be instance of 'IncomingMessage'"
            );
        }

        const configuration = require('../configuration')();
        cookieName = cookieName || configuration.cookie.name;
        if (typeof cookieName !== 'string') {
            throw new Error(
                "Argument 'cookieName' should be as a string"
            );
        }
        cookieName = cookieName.trim() || configuration.cookie.name;
        if (typeof cookieName !== 'string') {
            throw new Error(
                "Argument 'cookieName' should be as a string"
            );
        }
        securityKey = securityKey || configuration.security.key;
        if (securityKey !== null && typeof securityKey !== 'string') {
            throw new Error(
                "Argument 'securityKey' should be as a string"
            );
        }

        this.setRequest(request);
        this.setCookieName(cookieName);
        this.setSecurityKey(securityKey);
        this._rawCookies = request.headers.cookie || {};
        this._cookies = parseCookie(this.rawCookies);
        this._request = request;
        this._cookieName = cookieName;
        this._securityKey = securityKey;
    }

    setRequest(request) {
        this._request = request;
    }

    setCookieName(cookieName) {
        this._cookieName = cookieName;
    }
    setSecurityKey(key) {
        this._securityKey = key;
    }

    getCookie(name = undefined) {
        name = typeof name === 'undefined' ? this.cookieName : name;
        if (typeof name !== 'string') {
            return undefined;
        }
        return this.cookies[name] || undefined;
    }

    get cookies() {
        return this._cookies;
    }

    get cookie() {
        return this.getCookie();
    }

    get cookieName() {
        return this._cookieName;
    }

    get rawCookies() {
        return this._rawCookies;
    }

    get request() {
        return this._request;
    }

    get securityKey() {
        return this._securityKey;
    }

    get userAgent()
    {
        if (!this._userAgent) {
            this._userAgent = getBrowserNameBased(this.request);
        }
        return this._userAgent;
    }

    get userAgentHash()
    {
        if (!this._userAgentHash) {
            this._userAgentHash = sha1(Object.values(this.userAgent).join('|'));
        }
        return this._userAgentHash;
    }

    get skipUserAgent() {
        return this._skipUserAgent;
    }

    set skipUserAgent(value) {
        this._skipUserAgent = !!value;
    }

    set request(value) {
        this.setRequest(value);
    }

    set cookieName(name) {
        this.setCookieName(name);
    }

    set securityKey(value) {
        this.setSecurityKey(value);
    }

    /**
     *
     * @param cookieValue
     * @param skipUserAgent
     * @return {{
     *  hash: string,
     *  time: int,
     *  username_hash: string,
     *  random: string,
     *  user_agent_hash: string
     * }|null}
     */
    validateCookieValue(cookieValue, skipUserAgent = false)
    {
        let hashKey = sha1(cookieValue);
        let result = null;
        if (this._hash_records.hasOwnProperty(hashKey)) {
            result = this._hash_records[hashKey];
            if (!result || typeof result !== 'string') {
                return null;
            }
            if (skipUserAgent) {
                return result;
            }
            return result === this.userAgentHash ? result : null;
        }
        this._hash_records[hashKey] = false;
        // hash
        // timeHex
        // usernameHex
        // userIdHex
        // random
        // UAHash
        let match = cookieValue.match(
            /^([a-f0-9]{40})([a-f0-9]{8})([a-f0-9]{32})([a-f0-9]+)([a-f0-9]{30})([a-f0-9]{40})$/
        );
        if (!match) {
            return null;
        }

        let hash = match[1];
        let timeHex = match[2];
        let usernameHex = match[3];
        let userIdHex = match[4];
        let random = match[5];
        let UAHash = match[6];
        let time = parseInt(timeHex, 16);
        let currentTime = parseInt(((new Date()).getTime() / 1000).toString());
        let date = new Date();
            date.setFullYear(date.getFullYear() - 5);
        let fiveYearsAgo = parseInt((date.getTime() / 1000).toString());

        /**
         * Validate sign
         */
        // check if time less than 5 years ago
        // or the time greater than current time
        if (fiveYearsAgo >= time || currentTime < time) {
            return null;
        }

        let newHash = hash_hmac(
        'sha1',
        usernameHex + '|' + random + '|' + userIdHex + '|' + timeHex,
            this.securityKey
        );
        if (hash !== newHash) {
            return null;
        }

        // validate user agent
        let userId = parseInt(userIdHex, 16);
        this._hash_records[hashKey] = {
            'hash': hash,
                'time':time,
                'username_hash': usernameHex,
                'user_id':userId,
                'random': random,
                'user_agent_hash':UAHash,
        };
        if (!skipUserAgent && hash_hmac('sha1', this.userAgentHash, random) !==  UAHash) {
            return null;
        }
        return this._hash_records[hashKey];
    }

    /**
     * Generate cookie value, username converted to lowercase
     *
     * @param userId
     * @param username
     * @return {string}
     */
    generateCookieValue(userId, username) {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return null;
        }
        if (typeof userId === 'string') {
            if (/[^0-9]+$/.test(userId)) {
                return null;
            }
            userId = parseInt(userId);
        }
        if (typeof userId !== 'number') {
            return null;
        }

        let userIdHex = userId.toString(16);
        let random = sha1(
            (new Date().getTime())
            + '|'
            + Math.random()
            + '|'
            + (new Date().getTime())
        ).substring(0, 30);
        let time_hex = parseInt(((new Date().getTime()) / 1000).toString());
        let timeHex = time_hex.toString(16);
        let usernameHex = hash_hmac(
            'md5',
            username.trim().toLowerCase(),
            this.securityKey
            + ''
            + random
        );
        let hash = hash_hmac(
            'sha1',
            usernameHex + '|' + random + '|' + userIdHex + '|' + timeHex,
            this.securityKey
        );

        // add additional validation
        return hash
            + timeHex
            + usernameHex
            + userIdHex
            + random
            + hash_hmac('sha1', this.userAgentHash, random);
    }
}

module.exports = Cookie;
