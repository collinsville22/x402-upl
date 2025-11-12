export type SignatureAlgorithm = 'ed25519' | 'rsa-pss-sha256';
export interface SignatureParams {
    created: number;
    expires: number;
    keyId: string;
    alg: SignatureAlgorithm;
    nonce: string;
    tag: 'agent-browser-auth' | 'agent-payer-auth';
}
export interface SignatureComponents {
    authority: string;
    path: string;
}
export interface SignatureResult {
    signatureInput: string;
    signature: string;
}
export declare class RFC9421Signature {
    static createSignatureBase(components: SignatureComponents, params: SignatureParams): string;
    static signEd25519(components: SignatureComponents, params: SignatureParams, privateKey: Uint8Array): Promise<SignatureResult>;
    static signRsaPss(components: SignatureComponents, params: SignatureParams, privateKeyPem: string): Promise<SignatureResult>;
    static generateNonce(): string;
    static generateEd25519KeyPair(): {
        privateKey: Uint8Array;
        publicKey: Uint8Array;
    };
    static generateRsaKeyPair(): {
        privateKey: string;
        publicKey: string;
    };
}
//# sourceMappingURL=rfc9421.d.ts.map