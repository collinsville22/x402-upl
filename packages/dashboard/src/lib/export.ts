import { Transaction, Settlement } from './api';

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      const escaped = ('' + value).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  downloadFile(csvString, filename, 'text/csv');
}

export function exportToJSON(data: any[], filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatTransactionsForExport(transactions: Transaction[]) {
  return transactions.map(tx => ({
    'Transaction ID': tx.id,
    'Signature': tx.signature,
    'Amount (USDC)': parseFloat(tx.amount).toFixed(6),
    'Token': tx.token,
    'Sender': tx.senderAddress,
    'Recipient': tx.recipientAddress,
    'Service ID': tx.serviceId || 'N/A',
    'Status': tx.status,
    'Timestamp': new Date(tx.timestamp).toISOString(),
    'Settled At': tx.settledAt ? new Date(tx.settledAt).toISOString() : 'Not settled'
  }));
}

export function formatSettlementsForExport(settlements: Settlement[]) {
  return settlements.map(s => ({
    'Settlement ID': s.id,
    'Merchant Wallet': s.merchantWallet,
    'Total Amount (USDC)': parseFloat(s.totalAmount).toFixed(6),
    'Platform Fee (USDC)': parseFloat(s.platformFee).toFixed(6),
    'Merchant Amount (USDC)': parseFloat(s.merchantAmount).toFixed(6),
    'Transaction Count': s.transactionCount,
    'Status': s.status,
    'Transaction Signature': s.transactionSignature || 'N/A',
    'Requested At': new Date(s.requestedAt).toISOString(),
    'Completed At': s.completedAt ? new Date(s.completedAt).toISOString() : 'Not completed'
  }));
}

export function generateFilename(prefix: string, extension: 'csv' | 'json'): string {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefix}_${date}_${time}.${extension}`;
}
