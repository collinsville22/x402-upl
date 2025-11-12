"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = Spinner;
exports.LoadingScreen = LoadingScreen;
const clsx_1 = __importDefault(require("clsx"));
function Spinner({ size = 'md', className }) {
    const sizes = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    };
    return (<div className={(0, clsx_1.default)('animate-spin rounded-full border-x402-border border-t-x402-accent', sizes[size], className)}/>);
}
function LoadingScreen({ message }) {
    return (<div className="flex min-h-screen items-center justify-center bg-x402-black">
      <div className="text-center">
        <Spinner size="lg"/>
        {message && <p className="mt-4 text-sm text-x402-text-tertiary">{message}</p>}
      </div>
    </div>);
}
//# sourceMappingURL=Spinner.js.map