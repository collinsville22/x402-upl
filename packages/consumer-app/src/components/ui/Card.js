"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
const clsx_1 = __importDefault(require("clsx"));
function Card({ variant = 'default', className, children, ...props }) {
    const variants = {
        default: 'rounded-lg border border-x402-border bg-x402-surface',
        hover: 'rounded-lg border border-x402-border bg-x402-surface transition-all hover:border-x402-accent/30 hover:bg-x402-surface-hover cursor-pointer',
        accent: 'rounded-lg border border-x402-accent/20 bg-x402-accent-muted',
    };
    return (<div className={(0, clsx_1.default)(variants[variant], className)} {...props}>
      {children}
    </div>);
}
//# sourceMappingURL=Card.js.map