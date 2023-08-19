const crypto = require('crypto');
const {random, md5} = require('./hash');
const algorithm = 'aes-256-cbc';

function encryption(data, key, raw = false)
{
    if (typeof data !== 'string') {
        return null;
    }
    const hashKey = md5(key);
    const iv = random(16);
    const cipher = crypto.createCipheriv(algorithm, hashKey, iv);
    let encrypted = cipher.update(data, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    encrypted += '|' + iv;
    return Buffer
        .from(encrypted, 'utf-8')
        .toString(raw ? 'binary' : 'base64');
}

function decrypt(data, key)
{
    const hashKey = md5(key);
    if (data instanceof Buffer) {
        data = data.toString('utf-8');
    }
    if (typeof data !== 'string') {
        return null;
    }
    let tempData = Buffer.from(data, 'base64');
    if (tempData.toString('base64') === data) {
        data = tempData.toString('utf-8');
    }

    let matches = data.match(/^(.+)\|([a-f0-9]{16})$/);
    if (!matches || !matches[1] || !matches[2]) {
        return null;
    }
    data = matches[1];
    const iv = matches[2];
    const decipher = crypto.createDecipheriv(algorithm, hashKey, iv);
    let decrypted = decipher.update(data, 'binary', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

module.exports = {
    encryption_algo: algorithm,
    encrypt: encryption,
    decrypt
}
