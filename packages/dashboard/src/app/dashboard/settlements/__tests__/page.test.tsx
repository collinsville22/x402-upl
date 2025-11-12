import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettlementsPage from '../page';
import { facilitatorAPI } from '@/lib/api';

jest.mock('@/lib/api');
jest.mock('@/store/wallet', () => ({
  useWalletStore: jest.fn((selector) =>
    selector({
      publicKey: 'test-wallet-123',
      getPublicKey: () => 'test-wallet-123',
    })
  ),
}));

describe('SettlementsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    );
  };

  it('should render settlements page with pending settlement', async () => {
    const mockPendingSettlement = {
      totalAmount: 1000,
      platformFee: 20,
      merchantAmount: 980,
      transactionCount: 5,
      transactions: [
        {
          id: 'tx1',
          amount: '200',
          signature: 'sig1',
          timestamp: '2025-11-12T10:00:00Z',
        },
      ],
    };

    const mockHistory = [];

    (facilitatorAPI.getPendingSettlement as jest.Mock).mockResolvedValue(
      mockPendingSettlement
    );
    (facilitatorAPI.getSettlementHistory as jest.Mock).mockResolvedValue(
      mockHistory
    );

    renderWithProviders(<SettlementsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Settlement')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByText('$980.00')).toBeInTheDocument();
  });

  it('should render settlement history', async () => {
    const mockPendingSettlement = {
      totalAmount: 0,
      platformFee: 0,
      merchantAmount: 0,
      transactionCount: 0,
      transactions: [],
    };

    const mockHistory = [
      {
        id: 'settle1',
        merchantWallet: 'wallet1',
        totalAmount: '500',
        platformFee: '10',
        merchantAmount: '490',
        transactionCount: 3,
        status: 'completed',
        transactionSignature: 'sig123',
        requestedAt: '2025-11-12T10:00:00Z',
        completedAt: '2025-11-12T11:00:00Z',
      },
    ];

    (facilitatorAPI.getPendingSettlement as jest.Mock).mockResolvedValue(
      mockPendingSettlement
    );
    (facilitatorAPI.getSettlementHistory as jest.Mock).mockResolvedValue(
      mockHistory
    );

    renderWithProviders(<SettlementsPage />);

    await waitFor(() => {
      expect(screen.getByText('Settlement History')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$490.00')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should handle settlement request', async () => {
    const mockPendingSettlement = {
      totalAmount: 1000,
      platformFee: 20,
      merchantAmount: 980,
      transactionCount: 5,
      transactions: [],
    };

    (facilitatorAPI.getPendingSettlement as jest.Mock).mockResolvedValue(
      mockPendingSettlement
    );
    (facilitatorAPI.getSettlementHistory as jest.Mock).mockResolvedValue([]);
    (facilitatorAPI.requestSettlement as jest.Mock).mockResolvedValue({
      id: 'settle1',
      status: 'pending',
    });

    renderWithProviders(<SettlementsPage />);

    await waitFor(() => {
      expect(screen.getByText('Request Settlement')).toBeInTheDocument();
    });

    const requestButton = screen.getByText('Request Settlement');
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(facilitatorAPI.requestSettlement).toHaveBeenCalledWith({
        merchantWallet: 'test-wallet-123',
        serviceId: 'default',
        settlementType: 'manual',
      });
    });
  });

  it('should disable settlement button when no pending transactions', async () => {
    const mockPendingSettlement = {
      totalAmount: 0,
      platformFee: 0,
      merchantAmount: 0,
      transactionCount: 0,
      transactions: [],
    };

    (facilitatorAPI.getPendingSettlement as jest.Mock).mockResolvedValue(
      mockPendingSettlement
    );
    (facilitatorAPI.getSettlementHistory as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<SettlementsPage />);

    await waitFor(() => {
      const button = screen.getByText('Request Settlement');
      expect(button).toBeDisabled();
    });
  });

  it('should render export buttons when history exists', async () => {
    const mockPendingSettlement = {
      totalAmount: 0,
      platformFee: 0,
      merchantAmount: 0,
      transactionCount: 0,
      transactions: [],
    };

    const mockHistory = [
      {
        id: 'settle1',
        merchantWallet: 'wallet1',
        totalAmount: '500',
        platformFee: '10',
        merchantAmount: '490',
        transactionCount: 3,
        status: 'completed',
        transactionSignature: 'sig123',
        requestedAt: '2025-11-12T10:00:00Z',
        completedAt: '2025-11-12T11:00:00Z',
      },
    ];

    (facilitatorAPI.getPendingSettlement as jest.Mock).mockResolvedValue(
      mockPendingSettlement
    );
    (facilitatorAPI.getSettlementHistory as jest.Mock).mockResolvedValue(
      mockHistory
    );

    renderWithProviders(<SettlementsPage />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });

  it('should show no wallet message when wallet not connected', async () => {
    const useWalletStore = require('@/store/wallet').useWalletStore;
    useWalletStore.mockImplementation((selector: any) =>
      selector({
        publicKey: null,
        getPublicKey: () => null,
      })
    );

    renderWithProviders(<SettlementsPage />);

    expect(screen.getByText('No Wallet Connected')).toBeInTheDocument();
    expect(
      screen.getByText('Connect your wallet to view settlements')
    ).toBeInTheDocument();
  });
});
