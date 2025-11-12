import { BaseTool } from './base.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../types/index.js';
import { SolanaX402Client } from '@x402-upl/sdk';
export declare class WalletInfoTool extends BaseTool {
    private client;
    constructor(client: SolanaX402Client);
    execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
//# sourceMappingURL=x402-wallet-info.d.ts.map