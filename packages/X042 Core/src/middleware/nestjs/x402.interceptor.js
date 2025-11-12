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
exports.X402Interceptor = void 0;
const common_1 = require("@nestjs/common");
const web3_js_1 = require("@solana/web3.js");
const x402_constants_js_1 = require("./x402.constants.js");
let X402Interceptor = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var X402Interceptor = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            X402Interceptor = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        reflector;
        x402Service;
        options;
        constructor(reflector, x402Service, options) {
            this.reflector = reflector;
            this.x402Service = x402Service;
            this.options = options;
        }
        async intercept(context, next) {
            const paymentConfig = this.reflector.get(x402_constants_js_1.X402_PAYMENT_METADATA, context.getHandler());
            if (!paymentConfig) {
                return next.handle();
            }
            const http = context.switchToHttp();
            const request = http.getRequest();
            const response = http.getResponse();
            if (request.method === 'OPTIONS') {
                return next.handle();
            }
            const paymentHeader = request.headers['x-payment'];
            if (!paymentHeader) {
                const requirements = {
                    scheme: 'exact',
                    network: this.getNetworkString(this.x402Service.getConfig().network),
                    asset: paymentConfig.asset || 'SOL',
                    payTo: this.x402Service.getTreasuryWallet().toBase58(),
                    amount: paymentConfig.price.toString(),
                    timeout: this.x402Service.getConfig().timeout,
                    nonce: this.generateNonce(),
                };
                throw new common_1.HttpException({
                    statusCode: 402,
                    message: 'Payment Required',
                    requirements,
                }, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            try {
                const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
                const result = await this.x402Service.verifyPayment(paymentPayload, paymentConfig.price, new web3_js_1.PublicKey(this.x402Service.getTreasuryWallet()));
                if (!result.valid) {
                    if (this.options.onPaymentFailed) {
                        await this.options.onPaymentFailed(result.reason || 'Payment verification failed');
                    }
                    throw new common_1.HttpException({
                        statusCode: 402,
                        message: 'Payment Required',
                        error: result.reason || 'Payment verification failed',
                    }, common_1.HttpStatus.PAYMENT_REQUIRED);
                }
                if (this.options.onPaymentVerified) {
                    await this.options.onPaymentVerified(paymentPayload);
                }
                response.setHeader('X-Payment-Verified', 'true');
                response.setHeader('X-Payment-Signature', paymentPayload.signature);
                request.x402 = {
                    verified: true,
                    signature: paymentPayload.signature,
                    from: paymentPayload.from,
                    to: paymentPayload.to,
                    amount: paymentPayload.amount,
                    asset: paymentPayload.asset,
                };
                return next.handle();
            }
            catch (error) {
                if (error instanceof common_1.HttpException) {
                    throw error;
                }
                const errorMessage = error instanceof Error ? error.message : 'Payment processing error';
                if (this.options.onPaymentFailed) {
                    await this.options.onPaymentFailed(errorMessage);
                }
                throw new common_1.HttpException({
                    statusCode: 500,
                    message: 'Internal Server Error',
                    error: errorMessage,
                }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        getNetworkString(network) {
            if (network === 'mainnet-beta')
                return 'solana-mainnet';
            if (network === 'testnet')
                return 'solana-testnet';
            return 'solana-devnet';
        }
        generateNonce() {
            return Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);
        }
    };
    return X402Interceptor = _classThis;
})();
exports.X402Interceptor = X402Interceptor;
//# sourceMappingURL=x402.interceptor.js.map