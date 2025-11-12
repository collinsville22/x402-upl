#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { registerCommand } from './commands/register.js';
import { enableCommand } from './commands/enable.js';
import { testCommand } from './commands/test.js';
import { earningsCommand } from './commands/earnings.js';
import { deployCommand } from './commands/deploy.js';
import { discoverCommand } from './commands/discover.js';
import { configCommand } from './commands/config.js';
import { walletCommand } from './commands/wallet.js';
import { payCommand } from './commands/pay.js';
import { verifyCommand } from './commands/verify.js';
import { tapCommand } from './commands/tap.js';

const program = new Command();

program
  .name('x402')
  .description('CLI for x402 Universal Payment Layer')
  .version('2.0.0');

program.addCommand(initCommand());
program.addCommand(walletCommand());
program.addCommand(tapCommand());
program.addCommand(registerCommand());
program.addCommand(enableCommand());
program.addCommand(testCommand());
program.addCommand(earningsCommand());
program.addCommand(deployCommand());
program.addCommand(discoverCommand());
program.addCommand(payCommand());
program.addCommand(verifyCommand());
program.addCommand(configCommand());

program.parse();
