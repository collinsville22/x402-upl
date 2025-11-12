import { Transaction, Settlement } from './api';
export declare function exportToCSV(data: any[], filename: string): void;
export declare function exportToJSON(data: any[], filename: string): void;
export declare function formatTransactionsForExport(transactions: Transaction[]): {
    'Transaction ID': string;
    Signature: string;
    'Amount (USDC)': string;
    Token: string;
    Sender: string;
    Recipient: string;
    'Service ID': string;
    Status: string;
    Timestamp: string;
    'Settled At': string;
}[];
export declare function formatSettlementsForExport(settlements: Settlement[]): {
    'Settlement ID': string;
    'Merchant Wallet': any;
    'Total Amount (USDC)': string;
    'Platform Fee (USDC)': string;
    'Merchant Amount (USDC)': string;
    'Transaction Count': number;
    Status: string;
    'Transaction Signature': string;
    'Requested At': string;
    'Completed At': string;
}[];
export declare function generateFilename(prefix: string, extension: 'csv' | 'json'): string;
//# sourceMappingURL=export.d.ts.map