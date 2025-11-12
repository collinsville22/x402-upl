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
exports.apiRequest = apiRequest;
exports.testServiceEndpoint = testServiceEndpoint;
const axios_1 = __importStar(require("axios"));
const config_js_1 = require("./config.js");
async function apiRequest(method, path, data) {
    const baseUrl = (0, config_js_1.getRegistryApiUrl)();
    const url = `${baseUrl}${path}`;
    try {
        const response = await (0, axios_1.default)({
            method,
            url,
            data,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        return {
            success: true,
            data: response.data,
        };
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
async function testServiceEndpoint(url, params) {
    try {
        const response = await axios_1.default.post(url, params, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
        return {
            success: true,
            data: response.data,
        };
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            if (error.response?.status === 402) {
                return {
                    success: true,
                    data: {
                        status: 402,
                        paymentRequired: true,
                        paymentInfo: error.response.data,
                    },
                };
            }
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
//# sourceMappingURL=api.js.map