import { HTMLAttributes, ReactNode } from 'react';
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    children: ReactNode;
}
export declare function Badge({ variant, className, children, ...props }: BadgeProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Badge.d.ts.map