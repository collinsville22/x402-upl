"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSpinner = startSpinner;
exports.succeedSpinner = succeedSpinner;
exports.failSpinner = failSpinner;
exports.stopSpinner = stopSpinner;
exports.logSuccess = logSuccess;
exports.logError = logError;
exports.logInfo = logInfo;
exports.logWarning = logWarning;
const ora_1 = __importDefault(require("ora"));
let currentSpinner = null;
function startSpinner(text) {
    if (currentSpinner) {
        currentSpinner.stop();
    }
    currentSpinner = (0, ora_1.default)({
        text,
        color: 'cyan',
    }).start();
    return currentSpinner;
}
function succeedSpinner(text) {
    if (currentSpinner) {
        currentSpinner.succeed(text);
        currentSpinner = null;
    }
}
function failSpinner(text) {
    if (currentSpinner) {
        currentSpinner.fail(text);
        currentSpinner = null;
    }
}
function stopSpinner() {
    if (currentSpinner) {
        currentSpinner.stop();
        currentSpinner = null;
    }
}
function logSuccess(message) {
    stopSpinner();
}
function logError(message) {
    stopSpinner();
}
function logInfo(message) {
    stopSpinner();
}
function logWarning(message) {
    stopSpinner();
}
//# sourceMappingURL=spinner.js.map