"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402Payment = void 0;
const common_1 = require("@nestjs/common");
const x402_constants_js_1 = require("./x402.constants.js");
const X402Payment = (config) => (0, common_1.SetMetadata)(x402_constants_js_1.X402_PAYMENT_METADATA, config);
exports.X402Payment = X402Payment;
//# sourceMappingURL=x402.decorator.js.map