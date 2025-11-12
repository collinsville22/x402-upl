import { ConfigService } from '@nestjs/config';
export declare class HealthController {
    private config;
    constructor(config: ConfigService);
    check(): {
        status: string;
        timestamp: string;
        service: any;
    };
}
//# sourceMappingURL=health.controller.d.ts.map