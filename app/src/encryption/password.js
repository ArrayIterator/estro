const bcrypt = require('bcrypt');
const {hmac_sha256} = require('./hash');
const algorithm = 'sha256';

/**
 * @param password
 * @param cost
 * @returns {string|null}
 */
function password_hash(password, cost = 10)
{
    if (typeof password !== 'string' || typeof cost !== "number") {
        return null;
    }
    // cost as number is minor -> b
    let result = bcrypt.hashSync(password, cost);
    if (typeof result !== 'string') {
        return null;
    }
    // using compatibility with php $2y$
    // @link https://www.php.net/manual/en/function.password-hash.php
    return result.replace(/^\$2b\$/, '$2y$');
}

function password_verify(password, hash)
{
    if (typeof password !== 'string' || typeof hash !== "string") {
        return false;
    }
    if (!/^\$2[abxy]\$[0-9]+\$/.test(hash)) {
        return null;
    }

    hash = hash.replace(/^\$2y\$/, '$2b$');
    return bcrypt.compareSync(password, hash);
}

function hash_password(password, key) {
    return hmac_sha256(password, key);
}

function password_hash_key(password, key, cost = 10) {
    return password_hash(hash_password(password, key), cost);
}

function password_verify_key(password, hash, key) {
    return password_verify(hash_password(password, key), hash);
}

module.exports = {
    hash_algo: algorithm,
    hash_password,
    password_hash,
    password_verify,
    password_hash_key,
    password_verify_key
}
