"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const clsx_1 = __importDefault(require("clsx"));
function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }) {
    const baseStyles = 'rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-x402-accent focus:ring-offset-2 focus:ring-offset-x402-black disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
    const variants = {
        primary: 'bg-x402-accent text-x402-black hover:bg-x402-accent-hover',
        secondary: 'border border-x402-border bg-x402-surface text-x402-text-primary hover:bg-x402-surface-hover',
        ghost: 'text-x402-text-secondary hover:bg-x402-surface-hover hover:text-x402-text-primary',
    };
    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };
    return (<button className={(0, clsx_1.default)(baseStyles, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && (<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>)}
      {children}
    </button>);
}
//# sourceMappingURL=Button.js.map