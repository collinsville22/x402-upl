import express from 'express';
import { ShopifyX402Plugin } from './index';
export declare class ShopifyX402Server {
    private app;
    private plugin;
    private port;
    constructor(plugin: ShopifyX402Plugin, port?: number);
    private setupMiddleware;
    private setupRoutes;
    start(): void;
    getApp(): express.Application;
}
//# sourceMappingURL=server.d.ts.map