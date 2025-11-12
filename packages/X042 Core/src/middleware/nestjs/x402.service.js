"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402Service = void 0;
const common_1 = require("@nestjs/common");
const web3_js_1 = require("@solana/web3.js");
const verifier_js_1 = require("../../payment/verifier.js");
const signature_store_js_1 = require("../../storage/signature-store.js");
let X402Service = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var X402Service = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            X402Service = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        options;
        verifier;
        config;
        constructor(options) {
            this.options = options;
            const rpcUrl = options.rpcUrl ||
                (options.network === 'mainnet-beta'
                    ? 'https://api.mainnet-beta.solana.com'
                    : 'https://api.devnet.solana.com');
            this.config = {
                network: options.network,
                rpcUrl,
                treasuryWallet: new web3_js_1.PublicKey(options.treasuryWallet),
                acceptedTokens: [],
                timeout: options.timeout || 120000,
                redisUrl: options.redisUrl,
            };
            let signatureStore;
            if (options.redisUrl) {
                signatureStore = new signature_store_js_1.RedisSignatureStore(options.redisUrl);
            }
            else {
                signatureStore = new signature_store_js_1.InMemorySignatureStore();
                if (options.network === 'mainnet-beta') {
                    throw new Error('Redis configuration required for mainnet-beta');
                }
            }
            this.verifier = new verifier_js_1.PaymentVerifier(this.config, signatureStore);
        }
        async verifyPayment(payload, expectedAmount, recipient) {
            return this.verifier.verifyPayment(payload, expectedAmount, recipient);
        }
        getConfig() {
            return this.config;
        }
        getTreasuryWallet() {
            return this.config.treasuryWallet;
        }
    };
    return X402Service = _classThis;
})();
exports.X402Service = X402Service;
//# sourceMappingURL=x402.service.js.map