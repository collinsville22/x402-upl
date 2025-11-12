import { HTMLAttributes, ReactNode } from 'react';
interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'hover' | 'accent';
    children: ReactNode;
}
export declare function Card({ variant, className, children, ...props }: CardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Card.d.ts.map