"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleController = void 0;
const common_1 = require("@nestjs/common");
const nestjs_1 = require("@x402-upl/core/nestjs");
let ExampleController = (() => {
    let _classDecorators = [(0, common_1.Controller)('api/example'), (0, common_1.UseInterceptors)(nestjs_1.X402Interceptor)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handlePost_decorators;
    let _handleGet_decorators;
    var ExampleController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handlePost_decorators = [(0, common_1.Post)(), (0, nestjs_1.X402Payment)({
                    price: 0.01,
                    asset: 'CASH',
                    description: 'Example x402-protected endpoint',
                    required: true,
                })];
            _handleGet_decorators = [(0, common_1.Get)(), (0, nestjs_1.X402Payment)({
                    price: 0.005,
                    asset: 'CASH',
                    description: 'Example GET endpoint',
                    required: true,
                })];
            __esDecorate(this, null, _handlePost_decorators, { kind: "method", name: "handlePost", static: false, private: false, access: { has: obj => "handlePost" in obj, get: obj => obj.handlePost }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleGet_decorators, { kind: "method", name: "handleGet", static: false, private: false, access: { has: obj => "handleGet" in obj, get: obj => obj.handleGet }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ExampleController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async handlePost(body, request) {
            return {
                success: true,
                message: 'Request processed successfully',
                data: {
                    input: body,
                    timestamp: new Date().toISOString(),
                    payment: request.x402,
                },
            };
        }
        async handleGet(request) {
            return {
                success: true,
                message: 'GET request processed',
                timestamp: new Date().toISOString(),
                payment: request.x402,
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
    return ExampleController = _classThis;
})();
exports.ExampleController = ExampleController;
//# sourceMappingURL=example.controller.js.map