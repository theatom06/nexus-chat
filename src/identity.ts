import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

const keyPairPath = path.join(os.homedir(), 'portal');
const publicKeyPath = path.join(keyPairPath, 'public.pem');
const privateKeyPath = path.join(keyPairPath, 'private.pem');

function hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest('hex');
}

function performCryptoOperation(operation: 'encrypt' | 'decrypt', key: string, data: string): string {
    const encoder = new TextEncoder();
    const buffer = (operation === 'encrypt') ?
        crypto.publicEncrypt(key, encoder.encode(data)) :
        crypto.privateDecrypt(key, encoder.encode(data));

    return buffer.toString('hex');
}

function generateKeyPair() {
    const {
        publicKey,
        privateKey
    } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        },
    });

    fs.mkdirSync(keyPairPath, {
        recursive: true
    });
    fs.writeFileSync(publicKeyPath, publicKey);
    fs.writeFileSync(privateKeyPath, privateKey);

    const UUID = hash(publicKey);

    return {
        publicKey,
        privateKey,
        UUID,
        encrypt: (data: string) => performCryptoOperation('encrypt', publicKey, data),
        decrypt: (data: string) => performCryptoOperation('decrypt', privateKey, data),
        hash
    };
}

function readKeyPairs() {
    const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

    const UUID = hash(publicKey);

    return {
        publicKey,
        privateKey,
        UUID,
        encrypt: (data: string) => performCryptoOperation('encrypt', publicKey, data),
        decrypt: (data: string) => performCryptoOperation('decrypt', privateKey, data),
        hash,
    };
}

interface Export {
    publicKey: string,
    privateKey: string,
    UUID: string,
    encrypt: (data: string) => string,
    decrypt: (data: string) => string,
    hash: (data: string) => string;
}

export default function main(): Export {
    return (!fs.existsSync(publicKeyPath) || !fs.existsSync(privateKeyPath)) ? generateKeyPair() :readKeyPairs()
}