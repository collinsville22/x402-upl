import express from 'express';
import { WordPressX402Plugin } from './index';
export declare class WordPressX402Server {
    private app;
    private plugin;
    private port;
    constructor(plugin: WordPressX402Plugin, port?: number);
    private setupMiddleware;
    private setupRoutes;
    start(): void;
    getApp(): express.Application;
}
//# sourceMappingURL=server.d.ts.map