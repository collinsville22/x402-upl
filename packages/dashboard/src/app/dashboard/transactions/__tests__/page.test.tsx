import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TransactionsPage from '../page';
import { facilitatorAPI } from '@/lib/api';

jest.mock('@/lib/api');
jest.mock('@/store/wallet', () => ({
  useWalletStore: jest.fn((selector) =>
    selector({
      publicKey: 'test-wallet-123',
      getPublicKey: () => ({
        toString: () => 'test-wallet-123',
      }),
    })
  ),
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render transactions page with data', async () => {
    const mockTransactions = [
      {
        id: 'tx1',
        serviceId: 'Service A',
        amount: '100.50',
        status: 'confirmed',
        timestamp: '2025-11-12T10:00:00Z',
        signature: 'sig123456789',
      },
      {
        id: 'tx2',
        serviceId: 'Service B',
        amount: '200.75',
        status: 'confirmed',
        timestamp: '2025-11-12T11:00:00Z',
        signature: 'sig987654321',
      },
    ];

    (facilitatorAPI.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactions
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Transactions')).toBeInTheDocument();
    });

    expect(screen.getByText('Service A')).toBeInTheDocument();
    expect(screen.getByText('Service B')).toBeInTheDocument();
  });

  it('should filter transactions by status', async () => {
    const mockTransactions = [
      {
        id: 'tx1',
        serviceId: 'Service A',
        amount: '100',
        status: 'confirmed',
        timestamp: '2025-11-12T10:00:00Z',
        signature: 'sig1',
      },
      {
        id: 'tx2',
        serviceId: 'Service B',
        amount: '200',
        status: 'failed',
        timestamp: '2025-11-12T11:00:00Z',
        signature: 'sig2',
      },
    ];

    (facilitatorAPI.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactions
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Service A')).toBeInTheDocument();
    });

    const successButton = screen.getByText('Success');
    fireEvent.click(successButton);

    await waitFor(() => {
      expect(screen.getByText('Service A')).toBeInTheDocument();
      expect(screen.queryByText('Service B')).not.toBeInTheDocument();
    });
  });

  it('should search transactions', async () => {
    const mockTransactions = [
      {
        id: 'tx1',
        serviceId: 'Service A',
        amount: '100',
        status: 'confirmed',
        timestamp: '2025-11-12T10:00:00Z',
        signature: 'unique-sig-123',
      },
      {
        id: 'tx2',
        serviceId: 'Service B',
        amount: '200',
        status: 'confirmed',
        timestamp: '2025-11-12T11:00:00Z',
        signature: 'other-sig-456',
      },
    ];

    (facilitatorAPI.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactions
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Service A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Search by signature or service...'
    );
    fireEvent.change(searchInput, { target: { value: 'unique' } });

    await waitFor(() => {
      expect(screen.getByText('Service A')).toBeInTheDocument();
      expect(screen.queryByText('Service B')).not.toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    const mockTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `tx${i}`,
      serviceId: `Service ${i}`,
      amount: '100',
      status: 'confirmed',
      timestamp: '2025-11-12T10:00:00Z',
      signature: `sig${i}`,
    }));

    (facilitatorAPI.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactions
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Service 0')).toBeInTheDocument();
    });

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });
  });

  it('should render export buttons when transactions exist', async () => {
    const mockTransactions = [
      {
        id: 'tx1',
        serviceId: 'Service A',
        amount: '100',
        status: 'confirmed',
        timestamp: '2025-11-12T10:00:00Z',
        signature: 'sig1',
      },
    ];

    (facilitatorAPI.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactions
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    (facilitatorAPI.getTransactions as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );

    render(<TransactionsPage />);

    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('should show empty state when no transactions', async () => {
    (facilitatorAPI.getTransactions as jest.Mock).mockResolvedValue([]);

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
      expect(
        screen.getByText('Transactions will appear here as they occur')
      ).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (facilitatorAPI.getTransactions as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Service A')).not.toBeInTheDocument();
    });
  });
});
