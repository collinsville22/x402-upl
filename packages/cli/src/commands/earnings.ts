import { Command } from 'commander';
import { table } from 'table';
import { X402Client } from '@x402-upl/sdk';
import { getConfig, getWallet, getNetwork } from '../utils/config.js';
import { apiRequest } from '../utils/api.js';
import { startSpinner, succeedSpinner, failSpinner } from '../utils/spinner.js';

interface ServiceEarnings {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  totalCalls: number;
  successRate: number;
  averageRating: number;
}

export function earningsCommand(): Command {
  const cmd = new Command('earnings');

  cmd
    .description('View your earnings and stats')
    .option('-s, --services', 'Show per-service breakdown')
    .option('-a, --agent', 'Show agent stats')
    .action(async (options) => {
      try {
        const wallet = getWallet();
        const config = getConfig();

        if (!wallet) {
          failSpinner('No wallet configured. Run "x402 register" first');
          process.exit(1);
        }

        if (options.agent || !options.services) {
          if (!config.agentId) {
            failSpinner('Agent not registered. Run "x402 register" first');
            process.exit(1);
          }

          const spinner = startSpinner('Fetching agent stats...');

          const client = new X402Client({
            network: getNetwork(),
            wallet,
          });

          const stats = await client.getAgentStats(config.agentId);

          succeedSpinner('Agent Statistics');

          const data = [
            ['Metric', 'Value'],
            ['Total Transactions', stats.totalTransactions.toString()],
            ['Successful Transactions', stats.successfulTransactions.toString()],
            ['Success Rate', `${stats.successRate.toFixed(2)}%`],
            ['Total Spent', `$${stats.totalSpent.toFixed(6)} USDC`],
            ['Reputation Score', `${stats.reputationScore}/10000`],
          ];
        }

        if (options.services) {
          const spinner = startSpinner('Fetching service earnings...');

          const response = await apiRequest<ServiceEarnings[]>(
            'GET',
            `/services/earnings/${wallet.publicKey.toBase58()}`
          );

          if (!response.success || !response.data) {
            failSpinner(`Failed to fetch earnings: ${response.error}`);
            process.exit(1);
          }

          succeedSpinner('Service Earnings');

          if (response.data.length === 0) {
            return;
          }

          const data = [['Service', 'Revenue', 'Calls', 'Success Rate', 'Rating']];

          for (const service of response.data) {
            data.push([
              service.serviceName,
              `$${service.totalRevenue.toFixed(6)}`,
              service.totalCalls.toString(),
              `${service.successRate.toFixed(2)}%`,
              service.averageRating.toFixed(1),
            ]);
          }

          const totalRevenue = response.data.reduce((sum, s) => sum + s.totalRevenue, 0);
          const totalCalls = response.data.reduce((sum, s) => sum + s.totalCalls, 0);

          data.push(['TOTAL', `$${totalRevenue.toFixed(6)}`, totalCalls.toString(), '', '']);
        }
      } catch (error) {
        failSpinner(`Failed to fetch earnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  return cmd;
}
