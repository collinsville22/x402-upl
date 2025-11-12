"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceVerificationService = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const web3_js_1 = require("@solana/web3.js");
const prisma = new client_1.PrismaClient();
class ServiceVerificationService {
    connection;
    constructor(rpcUrl) {
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    }
    async initiateVerification(serviceId, verificationType) {
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
        });
        if (!service) {
            throw new Error('Service not found');
        }
        const verification = await prisma.serviceVerification.create({
            data: {
                serviceId,
                verificationType,
                status: client_1.VerificationStatus.IN_PROGRESS,
                automatedChecks: JSON.stringify({}),
            },
        });
        this.runVerification(verification.id, service.url, verificationType);
        return verification;
    }
    async runVerification(verificationId, serviceUrl, verificationType) {
        try {
            let result;
            switch (verificationType) {
                case client_1.VerificationType.SECURITY_AUDIT:
                    result = await this.performSecurityScan(serviceUrl);
                    await prisma.serviceVerification.update({
                        where: { id: verificationId },
                        data: {
                            securityScan: JSON.stringify(result),
                            status: result.passed ? client_1.VerificationStatus.PASSED : client_1.VerificationStatus.FAILED,
                        },
                    });
                    break;
                case client_1.VerificationType.PERFORMANCE_TEST:
                    result = await this.performPerformanceTest(serviceUrl);
                    await prisma.serviceVerification.update({
                        where: { id: verificationId },
                        data: {
                            performanceTest: JSON.stringify(result),
                            status: result.passed ? client_1.VerificationStatus.PASSED : client_1.VerificationStatus.FAILED,
                        },
                    });
                    break;
                case client_1.VerificationType.COMPLIANCE_CHECK:
                    result = await this.performComplianceCheck(serviceUrl);
                    await prisma.serviceVerification.update({
                        where: { id: verificationId },
                        data: {
                            complianceCheck: JSON.stringify(result),
                            status: result.passed ? client_1.VerificationStatus.PASSED : client_1.VerificationStatus.FAILED,
                        },
                    });
                    break;
                case client_1.VerificationType.VISA_TAP:
                    result = await this.verifyVisaTapCompliance(serviceUrl);
                    await prisma.serviceVerification.update({
                        where: { id: verificationId },
                        data: {
                            automatedChecks: JSON.stringify(result),
                            status: result.passed ? client_1.VerificationStatus.PASSED : client_1.VerificationStatus.FAILED,
                            verifiedAt: new Date(),
                        },
                    });
                    break;
                default:
                    throw new Error(`Unknown verification type: ${verificationType}`);
            }
            if (result.passed) {
                await this.updateServiceVerificationStatus(verificationId);
            }
        }
        catch (error) {
            await prisma.serviceVerification.update({
                where: { id: verificationId },
                data: {
                    status: client_1.VerificationStatus.FAILED,
                    automatedChecks: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
                },
            });
        }
    }
    async performSecurityScan(serviceUrl) {
        const findings = [];
        const recommendations = [];
        const vulnerabilities = [];
        try {
            const response = await axios_1.default.get(serviceUrl, {
                timeout: 5000,
                validateStatus: () => true,
            });
            if (!response.headers['content-type']?.includes('application/json')) {
                vulnerabilities.push({
                    severity: 'low',
                    type: 'CONTENT_TYPE',
                    description: 'Service does not return JSON content type',
                });
            }
            if (!response.headers['x-frame-options']) {
                vulnerabilities.push({
                    severity: 'low',
                    type: 'MISSING_HEADER',
                    description: 'Missing X-Frame-Options header',
                });
                recommendations.push('Add X-Frame-Options header to prevent clickjacking');
            }
            if (!response.headers['content-security-policy']) {
                vulnerabilities.push({
                    severity: 'medium',
                    type: 'MISSING_HEADER',
                    description: 'Missing Content-Security-Policy header',
                });
                recommendations.push('Implement Content-Security-Policy');
            }
            if (!response.headers['strict-transport-security'] && serviceUrl.startsWith('https://')) {
                vulnerabilities.push({
                    severity: 'medium',
                    type: 'MISSING_HEADER',
                    description: 'Missing Strict-Transport-Security header',
                });
                recommendations.push('Enable HSTS for HTTPS endpoints');
            }
            if (response.headers['server']) {
                vulnerabilities.push({
                    severity: 'low',
                    type: 'INFORMATION_DISCLOSURE',
                    description: 'Server header exposes software version',
                });
                recommendations.push('Remove or obfuscate Server header');
            }
            const testPayload = '<script>alert("xss")</script>';
            try {
                const xssTest = await axios_1.default.post(serviceUrl, { test: testPayload }, {
                    timeout: 5000,
                    validateStatus: () => true,
                });
                if (xssTest.data && JSON.stringify(xssTest.data).includes(testPayload)) {
                    vulnerabilities.push({
                        severity: 'high',
                        type: 'XSS',
                        description: 'Potential XSS vulnerability detected',
                    });
                    recommendations.push('Sanitize all user inputs');
                }
            }
            catch (e) {
            }
            const sqlPayload = "' OR '1'='1";
            try {
                const sqlTest = await axios_1.default.get(`${serviceUrl}?id=${encodeURIComponent(sqlPayload)}`, {
                    timeout: 5000,
                    validateStatus: () => true,
                });
                if (sqlTest.data && JSON.stringify(sqlTest.data).toLowerCase().includes('sql')) {
                    vulnerabilities.push({
                        severity: 'critical',
                        type: 'SQL_INJECTION',
                        description: 'Potential SQL injection vulnerability detected',
                    });
                    recommendations.push('Use parameterized queries');
                }
            }
            catch (e) {
            }
            findings.push(`Scanned ${serviceUrl}`);
            findings.push(`Found ${vulnerabilities.length} potential vulnerabilities`);
            const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
            const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
            const passed = criticalCount === 0 && highCount === 0;
            const score = 100 - (criticalCount * 40 + highCount * 20 + vulnerabilities.filter(v => v.severity === 'medium').length * 10 + vulnerabilities.filter(v => v.severity === 'low').length * 5);
            return {
                passed,
                score: Math.max(0, score),
                findings,
                recommendations,
                vulnerabilities,
            };
        }
        catch (error) {
            return {
                passed: false,
                score: 0,
                findings: ['Security scan failed'],
                recommendations: ['Service unreachable or returned errors'],
                vulnerabilities: [{
                        severity: 'high',
                        type: 'UNREACHABLE',
                        description: error instanceof Error ? error.message : 'Service unreachable',
                    }],
            };
        }
    }
    async performPerformanceTest(serviceUrl) {
        const findings = [];
        const recommendations = [];
        const responseTimes = [];
        let successCount = 0;
        const totalRequests = 50;
        const startTime = Date.now();
        for (let i = 0; i < totalRequests; i++) {
            const reqStart = Date.now();
            try {
                await axios_1.default.get(serviceUrl, {
                    timeout: 10000,
                    validateStatus: () => true,
                });
                const responseTime = Date.now() - reqStart;
                responseTimes.push(responseTime);
                successCount++;
            }
            catch (error) {
                responseTimes.push(10000);
            }
        }
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        responseTimes.sort((a, b) => a - b);
        const averageResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
        const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
        const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
        const successRate = (successCount / totalRequests) * 100;
        const requestsPerSecond = (totalRequests / totalTime) * 1000;
        findings.push(`Completed ${totalRequests} requests in ${totalTime}ms`);
        findings.push(`Success rate: ${successRate.toFixed(2)}%`);
        findings.push(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
        findings.push(`P95 response time: ${p95ResponseTime}ms`);
        findings.push(`P99 response time: ${p99ResponseTime}ms`);
        findings.push(`Requests per second: ${requestsPerSecond.toFixed(2)}`);
        if (averageResponseTime > 1000) {
            recommendations.push('Average response time exceeds 1 second');
        }
        if (p95ResponseTime > 2000) {
            recommendations.push('P95 response time exceeds 2 seconds');
        }
        if (successRate < 95) {
            recommendations.push('Success rate below 95%');
        }
        const passed = averageResponseTime < 1000 && p95ResponseTime < 2000 && successRate >= 95;
        const score = Math.min(100, (successRate * 0.5) + ((2000 - Math.min(2000, averageResponseTime)) / 2000 * 50));
        return {
            passed,
            score,
            findings,
            recommendations,
            averageResponseTime,
            p95ResponseTime,
            p99ResponseTime,
            successRate,
            requestsPerSecond,
        };
    }
    async performComplianceCheck(serviceUrl) {
        const findings = [];
        const recommendations = [];
        let visaTapCompliant = false;
        let openApiValid = false;
        let rateLimitingEnabled = false;
        let authenticationRequired = false;
        try {
            const testResponse = await axios_1.default.get(serviceUrl, {
                timeout: 5000,
                validateStatus: () => true,
            });
            if (testResponse.status === 402) {
                visaTapCompliant = true;
                findings.push('Service returns 402 Payment Required');
                const paymentRequirements = testResponse.data;
                if (paymentRequirements.scheme && paymentRequirements.network && paymentRequirements.asset) {
                    findings.push('Payment requirements properly structured');
                }
                else {
                    recommendations.push('Payment requirements incomplete');
                    visaTapCompliant = false;
                }
            }
            else {
                findings.push('Service does not return 402 status');
                recommendations.push('Implement x402 payment protocol');
            }
            if (testResponse.headers['x-ratelimit-limit']) {
                rateLimitingEnabled = true;
                findings.push('Rate limiting headers present');
            }
            else {
                recommendations.push('Implement rate limiting');
            }
            if (testResponse.headers['www-authenticate'] || testResponse.status === 401) {
                authenticationRequired = true;
                findings.push('Authentication required');
            }
            try {
                const openapiUrl = `${serviceUrl.replace(/\/$/, '')}/openapi.json`;
                const openapiResponse = await axios_1.default.get(openapiUrl, {
                    timeout: 5000,
                    validateStatus: () => true,
                });
                if (openapiResponse.status === 200 && openapiResponse.data.openapi) {
                    openApiValid = true;
                    findings.push('OpenAPI specification available');
                }
            }
            catch (e) {
                recommendations.push('Provide OpenAPI specification');
            }
            const complianceScore = [visaTapCompliant, openApiValid, rateLimitingEnabled, authenticationRequired].filter(Boolean).length;
            const passed = visaTapCompliant && complianceScore >= 2;
            return {
                passed,
                score: (complianceScore / 4) * 100,
                findings,
                recommendations,
                visaTapCompliant,
                openApiValid,
                rateLimitingEnabled,
                authenticationRequired,
            };
        }
        catch (error) {
            return {
                passed: false,
                score: 0,
                findings: ['Compliance check failed'],
                recommendations: ['Service unreachable'],
                visaTapCompliant: false,
                openApiValid: false,
                rateLimitingEnabled: false,
                authenticationRequired: false,
            };
        }
    }
    async verifyVisaTapCompliance(serviceUrl) {
        const findings = [];
        const recommendations = [];
        try {
            const response = await axios_1.default.get(serviceUrl, {
                timeout: 5000,
                validateStatus: () => true,
            });
            if (response.status !== 402) {
                findings.push('Service does not return 402 status');
                recommendations.push('Implement HTTP 402 Payment Required');
                return { passed: false, score: 0, findings, recommendations };
            }
            const requirements = response.data;
            const requiredFields = ['scheme', 'network', 'asset', 'payTo', 'amount', 'timeout'];
            const missingFields = requiredFields.filter(field => !requirements[field]);
            if (missingFields.length > 0) {
                findings.push(`Missing required fields: ${missingFields.join(', ')}`);
                recommendations.push('Include all required payment fields');
                return { passed: false, score: 30, findings, recommendations };
            }
            if (!['exact', 'estimate'].includes(requirements.scheme)) {
                findings.push('Invalid payment scheme');
                recommendations.push('Use "exact" or "estimate" for scheme');
                return { passed: false, score: 40, findings, recommendations };
            }
            if (!requirements.network.startsWith('solana-')) {
                findings.push('Invalid network specification');
                recommendations.push('Use solana-mainnet, solana-devnet, or solana-testnet');
                return { passed: false, score: 40, findings, recommendations };
            }
            try {
                new web3_js_1.PublicKey(requirements.payTo);
                findings.push('Valid Solana payment address');
            }
            catch (e) {
                findings.push('Invalid Solana payment address');
                recommendations.push('Provide valid Solana public key for payTo');
                return { passed: false, score: 50, findings, recommendations };
            }
            const amount = parseFloat(requirements.amount);
            if (isNaN(amount) || amount <= 0) {
                findings.push('Invalid payment amount');
                recommendations.push('Provide positive numeric amount');
                return { passed: false, score: 60, findings, recommendations };
            }
            findings.push('All required fields present and valid');
            findings.push('VisaTAP protocol compliant');
            return { passed: true, score: 100, findings, recommendations };
        }
        catch (error) {
            findings.push('Failed to verify VisaTAP compliance');
            recommendations.push('Ensure service is reachable');
            return { passed: false, score: 0, findings, recommendations };
        }
    }
    async updateServiceVerificationStatus(verificationId) {
        const verification = await prisma.serviceVerification.findUnique({
            where: { id: verificationId },
        });
        if (!verification || verification.status !== client_1.VerificationStatus.PASSED) {
            return;
        }
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        await prisma.serviceVerification.update({
            where: { id: verificationId },
            data: {
                verifiedAt: new Date(),
                expiresAt,
            },
        });
        if (verification.verificationType === client_1.VerificationType.VISA_TAP) {
            await prisma.service.update({
                where: { id: verification.serviceId },
                data: { visaTapVerified: true },
            });
        }
    }
    async scheduleReverifications() {
        const expiredVerifications = await prisma.serviceVerification.findMany({
            where: {
                status: client_1.VerificationStatus.PASSED,
                expiresAt: { lte: new Date() },
            },
        });
        for (const verification of expiredVerifications) {
            await this.initiateVerification(verification.serviceId, verification.verificationType);
        }
    }
    async getVerificationStatus(serviceId) {
        return await prisma.serviceVerification.findMany({
            where: { serviceId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.ServiceVerificationService = ServiceVerificationService;
//# sourceMappingURL=verification.js.map