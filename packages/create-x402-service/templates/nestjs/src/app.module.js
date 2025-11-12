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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nestjs_pino_1 = require("nestjs-pino");
const nestjs_1 = require("@x402-upl/core/nestjs");
const configuration_1 = __importDefault(require("./config/configuration"));
const example_module_1 = require("./example/example.module");
const health_module_1 = require("./health/health.module");
const registry_client_1 = require("./x402/registry-client");
let AppModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration_1.default],
                }),
                nestjs_pino_1.LoggerModule.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: (config) => ({
                        pinoHttp: {
                            level: config.get('logLevel'),
                            transport: config.get('nodeEnv') === 'development'
                                ? { target: 'pino-pretty', options: { colorize: true } }
                                : undefined,
                        },
                    }),
                }),
                nestjs_1.X402Module.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: (config) => ({
                        network: config.get('network'),
                        treasuryWallet: config.get('treasuryWallet'),
                        redisUrl: config.get('redisUrl'),
                        enableTAP: config.get('enableTAP'),
                        registryUrl: config.get('registryUrl'),
                        onPaymentVerified: async (payment) => {
                            console.log('Payment verified:', payment.signature);
                        },
                        onPaymentFailed: async (reason) => {
                            console.error('Payment failed:', reason);
                        },
                    }),
                }),
                example_module_1.ExampleModule,
                health_module_1.HealthModule,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AppModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AppModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        config;
        registryClient = null;
        heartbeatInterval = null;
        constructor(config) {
            this.config = config;
        }
        async onModuleInit() {
            const autoRegister = this.config.get('autoRegisterService');
            const serviceUrl = this.config.get('serviceUrl');
            const serviceName = this.config.get('serviceName');
            if (autoRegister && serviceUrl && serviceName) {
                this.registryClient = new registry_client_1.RegistryClient(this.config.get('registryUrl'));
                await this.registryClient.registerService({
                    name: serviceName,
                    description: this.config.get('serviceDescription') || '',
                    url: serviceUrl,
                    category: this.config.get('serviceCategory') || 'API',
                    pricing: {
                        amount: this.config.get('servicePrice'),
                        currency: 'CASH',
                    },
                    walletAddress: this.config.get('treasuryWallet'),
                    network: this.config.get('network'),
                    acceptedTokens: this.config.get('acceptedTokens'),
                    capabilities: this.config.get('serviceCapabilities'),
                    tags: this.config.get('serviceTags'),
                });
                console.log('Service registered with x402 registry:', this.registryClient.getServiceId());
                this.heartbeatInterval = setInterval(async () => {
                    if (this.registryClient) {
                        try {
                            await this.registryClient.heartbeat();
                        }
                        catch (error) {
                            console.warn('Failed to send heartbeat to registry:', error);
                        }
                    }
                }, 60000);
            }
        }
        async onModuleDestroy() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            if (this.registryClient) {
                try {
                    await this.registryClient.setServiceStatus('PAUSED');
                    console.log('Service status updated to PAUSED');
                }
                catch (error) {
                    console.warn('Failed to update service status:', error);
                }
            }
        }
    };
    return AppModule = _classThis;
})();
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map