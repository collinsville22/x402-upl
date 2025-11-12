import { Command } from 'commander';
import inquirer from 'inquirer';
import { X402Client } from '@x402-upl/sdk';
import { getWallet, getNetwork } from '../utils/config.js';
import { testServiceEndpoint } from '../utils/api.js';
import { startSpinner, succeedSpinner, failSpinner } from '../utils/spinner.js';

export function testCommand(): Command {
  const cmd = new Command('test');

  cmd
    .description('Test a service integration')
    .argument('<service>', 'Service ID or URL')
    .option('--params <json>', 'Test parameters as JSON')
    .option('--no-payment', 'Test without payment (check 402 response)')
    .action(async (service, options) => {
      try {
        const client = new X402Client({
          network: getNetwork(),
          wallet: options.payment ? getWallet() : undefined,
        });

        let serviceUrl: string;

        if (service.startsWith('http')) {
          serviceUrl = service;
        } else {
          const spinner = startSpinner('Fetching service details...');

          const serviceData = await client.getService(service);
          serviceUrl = serviceData.url;

          succeedSpinner(`Found service: ${serviceData.name}`);
        }

        let params: unknown = undefined;

        if (options.params) {
          try {
            params = JSON.parse(options.params);
          } catch {
            failSpinner('Invalid JSON parameters');
            process.exit(1);
          }
        } else {
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'hasParams',
              message: 'Does this service require parameters?',
              default: false,
            },
          ]);

          if (answer.hasParams) {
            const paramAnswer = await inquirer.prompt([
              {
                type: 'editor',
                name: 'json',
                message: 'Enter parameters as JSON:',
              },
            ]);

            try {
              params = JSON.parse(paramAnswer.json);
            } catch {
              failSpinner('Invalid JSON parameters');
              process.exit(1);
            }
          }
        }

        if (!options.payment) {
          const spinner = startSpinner('Testing service endpoint...');

          const result = await testServiceEndpoint(serviceUrl, params);

          if (result.success) {
            if (
              result.data &&
              typeof result.data === 'object' &&
              'status' in result.data &&
              result.data.status === 402
            ) {
              succeedSpinner('Service correctly returns 402 Payment Required');
            } else {
              succeedSpinner('Service responded successfully');
            }
          } else {
            failSpinner(`Test failed: ${result.error}`);
            process.exit(1);
          }
        } else {
          const wallet = getWallet();

          if (!wallet) {
            failSpinner('No wallet configured. Run "x402 register" first');
            process.exit(1);
          }

          const spinner = startSpinner('Testing with payment...');

          const result = await client.payAndFetch(serviceUrl, params);

          succeedSpinner('Payment and service call successful');
        }
      } catch (error) {
        failSpinner(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  return cmd;
}
