"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const keyPairPath = path.join(os.homedir(), 'portal');
const publicKeyPath = path.join(keyPairPath, 'public.pem');
const privateKeyPath = path.join(keyPairPath, 'private.pem');
function hash(data) {
    return crypto.createHash("sha256").update(data).digest('hex');
}
function performCryptoOperation(operation, key, data) {
    const encoder = new TextEncoder();
    const buffer = (operation === 'encrypt') ?
        crypto.publicEncrypt(key, encoder.encode(data)) :
        crypto.privateDecrypt(key, encoder.encode(data));
    return buffer.toString('hex');
}
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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
        encrypt: (data) => performCryptoOperation('encrypt', publicKey, data),
        decrypt: (data) => performCryptoOperation('decrypt', privateKey, data),
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
        encrypt: (data) => performCryptoOperation('encrypt', publicKey, data),
        decrypt: (data) => performCryptoOperation('decrypt', privateKey, data),
        hash,
    };
}
function main() {
    return (!fs.existsSync(publicKeyPath) || !fs.existsSync(privateKeyPath)) ? generateKeyPair() : readKeyPairs();
}
exports.default = main;
