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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RFC9421Signature = void 0;
const ed25519 = __importStar(require("@noble/ed25519"));
const crypto = __importStar(require("crypto"));
class RFC9421Signature {
    static createSignatureBase(components, params) {
        const lines = [];
        lines.push(`"@authority": ${components.authority}`);
        lines.push(`"@path": ${components.path}`);
        const signatureParamsValue = `("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
        lines.push(`"@signature-params": ${signatureParamsValue}`);
        return lines.join('\n');
    }
    static async signEd25519(components, params, privateKey) {
        if (privateKey.length !== 32) {
            throw new Error('Ed25519 private key must be 32 bytes');
        }
        const signatureBase = this.createSignatureBase(components, params);
        const message = new TextEncoder().encode(signatureBase);
        const signature = await ed25519.sign(message, privateKey);
        const signatureB64 = Buffer.from(signature).toString('base64');
        const signatureInput = `sig2=("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
        return {
            signatureInput,
            signature: `sig2=:${signatureB64}:`,
        };
    }
    static async signRsaPss(components, params, privateKeyPem) {
        const signatureBase = this.createSignatureBase(components, params);
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signatureBase);
        sign.end();
        const signature = sign.sign({
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
        }, 'base64');
        const signatureInput = `sig2=("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
        return {
            signatureInput,
            signature: `sig2=:${signature}:`,
        };
    }
    static generateNonce() {
        const bytes = crypto.randomBytes(16);
        return bytes.toString('hex');
    }
    static generateEd25519KeyPair() {
        const privateKey = ed25519.utils.randomPrivateKey();
        const publicKey = ed25519.getPublicKey(privateKey);
        return { privateKey, publicKey };
    }
    static generateRsaKeyPair() {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });
        return { privateKey, publicKey };
    }
}
exports.RFC9421Signature = RFC9421Signature;
//# sourceMappingURL=rfc9421.js.map