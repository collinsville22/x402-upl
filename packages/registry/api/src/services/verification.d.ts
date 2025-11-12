import { VerificationType } from '@prisma/client';
export interface VerificationResult {
    passed: boolean;
    score: number;
    findings: string[];
    recommendations: string[];
}
export interface SecurityScanResult extends VerificationResult {
    vulnerabilities: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        type: string;
        description: string;
    }>;
}
export interface PerformanceTestResult extends VerificationResult {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    successRate: number;
    requestsPerSecond: number;
}
export interface ComplianceCheckResult extends VerificationResult {
    visa: any;
    TapCompliant: boolean;
    openApiValid: boolean;
    rateLimitingEnabled: boolean;
    authenticationRequired: boolean;
}
export declare class ServiceVerificationService {
    private connection;
    constructor(rpcUrl: string);
    initiateVerification(serviceId: string, verificationType: VerificationType): Promise<any>;
    private runVerification;
    private performSecurityScan;
    private performPerformanceTest;
    private performComplianceCheck;
    private verifyVisaTapCompliance;
    private updateServiceVerificationStatus;
    scheduleReverifications(): Promise<void>;
    getVerificationStatus(serviceId: string): Promise<any>;
}
//# sourceMappingURL=verification.d.ts.map