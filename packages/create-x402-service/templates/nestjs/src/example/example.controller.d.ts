import { Request } from 'express';
interface X402Request extends Request {
    x402?: {
        verified: boolean;
        signature?: string;
        from?: string;
        to?: string;
        amount?: string;
        asset?: string;
    };
}
export declare class ExampleController {
    handlePost(body: any, request: X402Request): Promise<{
        success: boolean;
        message: string;
        data: {
            input: any;
            timestamp: string;
            payment: {
                verified: boolean;
                signature?: string;
                from?: string;
                to?: string;
                amount?: string;
                asset?: string;
            } | undefined;
        };
    }>;
    handleGet(request: X402Request): Promise<{
        success: boolean;
        message: string;
        timestamp: string;
        payment: {
            verified: boolean;
            signature?: string;
            from?: string;
            to?: string;
            amount?: string;
            asset?: string;
        } | undefined;
    }>;
}
export {};
//# sourceMappingURL=example.controller.d.ts.map