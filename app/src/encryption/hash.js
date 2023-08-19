const crypto = require('crypto');

function hash(algo, data, raw = false)
{
    if (!data instanceof Buffer && typeof data !== "string") {
        return null;
    }
    let hash = crypto.createHash(algo);
    hash.update(data);
    return hash.digest(!raw ? 'hex' : 'binary');
}

function hash_hmac(algo, data, key, raw = false)
{
    key = key || '';
    if (!data instanceof Buffer && typeof data !== "string") {
        return null;
    }
    if (!key instanceof Buffer && typeof key !== "string") {
        return null;
    }
    let hash = crypto.createHmac(algo, key);
    hash.update(data);
    return hash.digest(!raw ? 'hex' : 'binary');
}

function random(length = 32)
{
    let result = '';
    const characters = 'abcdef0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

module.exports = {
    random,
    hash,
    md5: (data, raw = false) => hash('md5', data, raw),
    sha1: (data, raw = false) => hash('sha1', data, raw),
    sha256: (data, raw = false) => hash('sha256', data, raw),
    sha384: (data, raw = false) => hash('sha384', data, raw),
    sha512: (data, raw = false) => hash('sha512', data, raw),
    hash_hmac,
    hmac_md5: (data, key, raw = false) => hash_hmac('md5', data, key, raw),
    hmac_sha1: (data, key, raw = false) => hash_hmac('sha1', data, key, raw),
    hmac_sha256: (data, key, raw = false) => hash_hmac('sha256', data, key, raw),
    hmac_sha384: (data, key, raw = false) => hash_hmac('sha384', data, key, raw),
    hmac_sha512: (data, key, raw = false) => hash_hmac('sha512', data, key, raw),
}
