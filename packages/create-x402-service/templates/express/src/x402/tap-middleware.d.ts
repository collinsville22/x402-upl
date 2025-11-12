import { Request, Response, NextFunction } from 'express';
export interface TAPConfig {
    enabled: boolean;
    registryUrl: string;
    cacheTimeout: number;
}
export declare function createTAPMiddleware(config: TAPConfig): (req: Request, res: Response, next: NextFunction) => any;
declare global {
    namespace Express {
        interface Request {
            tapVerified?: boolean;
            tapKeyId?: string;
            tapDID?: string;
        }
    }
}
//# sourceMappingURL=tap-middleware.d.ts.map