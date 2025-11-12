"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const nestjs_pino_1 = require("nestjs-pino");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    const config = app.get(config_1.ConfigService);
    const port = config.get('port');
    app.enableShutdownHooks();
    await app.listen(port);
    const logger = app.get(nestjs_pino_1.Logger);
    logger.log(`Service running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map