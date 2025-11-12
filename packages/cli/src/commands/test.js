"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCommand = testCommand;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const sdk_1 = require("@x402-upl/sdk");
const config_js_1 = require("../utils/config.js");
const api_js_1 = require("../utils/api.js");
const spinner_js_1 = require("../utils/spinner.js");
function testCommand() {
    const cmd = new commander_1.Command('test');
    cmd
        .description('Test a service integration')
        .argument('<service>', 'Service ID or URL')
        .option('--params <json>', 'Test parameters as JSON')
        .option('--no-payment', 'Test without payment (check 402 response)')
        .action(async (service, options) => {
        try {
            const client = new sdk_1.X402Client({
                network: (0, config_js_1.getNetwork)(),
                wallet: options.payment ? (0, config_js_1.getWallet)() : undefined,
            });
            let serviceUrl;
            if (service.startsWith('http')) {
                serviceUrl = service;
            }
            else {
                const spinner = (0, spinner_js_1.startSpinner)('Fetching service details...');
                const serviceData = await client.getService(service);
                serviceUrl = serviceData.url;
                (0, spinner_js_1.succeedSpinner)(`Found service: ${serviceData.name}`);
            }
            let params = undefined;
            if (options.params) {
                try {
                    params = JSON.parse(options.params);
                }
                catch {
                    (0, spinner_js_1.failSpinner)('Invalid JSON parameters');
                    process.exit(1);
                }
            }
            else {
                const answer = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'hasParams',
                        message: 'Does this service require parameters?',
                        default: false,
                    },
                ]);
                if (answer.hasParams) {
                    const paramAnswer = await inquirer_1.default.prompt([
                        {
                            type: 'editor',
                            name: 'json',
                            message: 'Enter parameters as JSON:',
                        },
                    ]);
                    try {
                        params = JSON.parse(paramAnswer.json);
                    }
                    catch {
                        (0, spinner_js_1.failSpinner)('Invalid JSON parameters');
                        process.exit(1);
                    }
                }
            }
            if (!options.payment) {
                const spinner = (0, spinner_js_1.startSpinner)('Testing service endpoint...');
                const result = await (0, api_js_1.testServiceEndpoint)(serviceUrl, params);
                if (result.success) {
                    if (result.data &&
                        typeof result.data === 'object' &&
                        'status' in result.data &&
                        result.data.status === 402) {
                        (0, spinner_js_1.succeedSpinner)('Service correctly returns 402 Payment Required');
                    }
                    else {
                        (0, spinner_js_1.succeedSpinner)('Service responded successfully');
                    }
                }
                else {
                    (0, spinner_js_1.failSpinner)(`Test failed: ${result.error}`);
                    process.exit(1);
                }
            }
            else {
                const wallet = (0, config_js_1.getWallet)();
                if (!wallet) {
                    (0, spinner_js_1.failSpinner)('No wallet configured. Run "x402 register" first');
                    process.exit(1);
                }
                const spinner = (0, spinner_js_1.startSpinner)('Testing with payment...');
                const result = await client.payAndFetch(serviceUrl, params);
                (0, spinner_js_1.succeedSpinner)('Payment and service call successful');
            }
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    return cmd;
}
//# sourceMappingURL=test.js.map