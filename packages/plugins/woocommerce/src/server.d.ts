import express from 'express';
import { WooCommerceX402Plugin } from './index';
export declare class WooCommerceX402Server {
    private app;
    private plugin;
    private port;
    constructor(plugin: WooCommerceX402Plugin, port?: number);
    private setupMiddleware;
    private setupRoutes;
    start(): void;
    getApp(): express.Application;
}
//# sourceMappingURL=server.d.ts.map