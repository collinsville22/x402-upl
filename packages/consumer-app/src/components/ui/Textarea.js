"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Textarea = void 0;
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
exports.Textarea = (0, react_1.forwardRef)(({ label, error, className, ...props }, ref) => {
    return (<div className="w-full">
        {label && (<label className="mb-2 block text-sm font-medium text-x402-text-secondary">
            {label}
          </label>)}
        <textarea ref={ref} className={(0, clsx_1.default)('w-full rounded-lg border border-x402-border bg-x402-surface px-4 py-3 font-mono text-sm text-x402-text-primary placeholder-x402-text-muted transition-colors', 'min-h-[120px] resize-y', 'focus:border-x402-accent focus:outline-none focus:ring-1 focus:ring-x402-accent', 'disabled:cursor-not-allowed disabled:opacity-50', error && 'border-x402-error focus:border-x402-error focus:ring-x402-error', className)} {...props}/>
        {error && (<p className="mt-2 text-sm text-x402-error">{error}</p>)}
      </div>);
});
exports.Textarea.displayName = 'Textarea';
//# sourceMappingURL=Textarea.js.map