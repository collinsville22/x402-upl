#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_js_1 = require("./commands/init.js");
const register_js_1 = require("./commands/register.js");
const enable_js_1 = require("./commands/enable.js");
const test_js_1 = require("./commands/test.js");
const earnings_js_1 = require("./commands/earnings.js");
const deploy_js_1 = require("./commands/deploy.js");
const discover_js_1 = require("./commands/discover.js");
const config_js_1 = require("./commands/config.js");
const wallet_js_1 = require("./commands/wallet.js");
const pay_js_1 = require("./commands/pay.js");
const verify_js_1 = require("./commands/verify.js");
const tap_js_1 = require("./commands/tap.js");
const program = new commander_1.Command();
program
    .name('x402')
    .description('CLI for x402 Universal Payment Layer')
    .version('2.0.0');
program.addCommand((0, init_js_1.initCommand)());
program.addCommand((0, wallet_js_1.walletCommand)());
program.addCommand((0, tap_js_1.tapCommand)());
program.addCommand((0, register_js_1.registerCommand)());
program.addCommand((0, enable_js_1.enableCommand)());
program.addCommand((0, test_js_1.testCommand)());
program.addCommand((0, earnings_js_1.earningsCommand)());
program.addCommand((0, deploy_js_1.deployCommand)());
program.addCommand((0, discover_js_1.discoverCommand)());
program.addCommand((0, pay_js_1.payCommand)());
program.addCommand((0, verify_js_1.verifyCommand)());
program.addCommand((0, config_js_1.configCommand)());
program.parse();
//# sourceMappingURL=index.js.map