"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const react_query_1 = require("@tanstack/react-query");
const page_1 = __importDefault(require("../page"));
const api_1 = require("@/lib/api");
jest.mock('@/lib/api');
jest.mock('@/store/wallet', () => ({
    useWalletStore: jest.fn((selector) => selector({
        publicKey: 'test-wallet-123',
        getPublicKey: () => 'test-wallet-123',
    })),
}));
describe('SettlementsPage', () => {
    let queryClient;
    beforeEach(() => {
        queryClient = new react_query_1.QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
        jest.clearAllMocks();
    });
    const renderWithProviders = (component) => {
        return (0, react_1.render)(<react_query_1.QueryClientProvider client={queryClient}>{component}</react_query_1.QueryClientProvider>);
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
        api_1.facilitatorAPI.getPendingSettlement.mockResolvedValue(mockPendingSettlement);
        api_1.facilitatorAPI.getSettlementHistory.mockResolvedValue(mockHistory);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Pending Settlement')).toBeInTheDocument();
        });
        expect(react_1.screen.getByText('5')).toBeInTheDocument();
        expect(react_1.screen.getByText('$1000.00')).toBeInTheDocument();
        expect(react_1.screen.getByText('$20.00')).toBeInTheDocument();
        expect(react_1.screen.getByText('$980.00')).toBeInTheDocument();
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
        api_1.facilitatorAPI.getPendingSettlement.mockResolvedValue(mockPendingSettlement);
        api_1.facilitatorAPI.getSettlementHistory.mockResolvedValue(mockHistory);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Settlement History')).toBeInTheDocument();
        });
        expect(react_1.screen.getByText('3')).toBeInTheDocument();
        expect(react_1.screen.getByText('$500.00')).toBeInTheDocument();
        expect(react_1.screen.getByText('$490.00')).toBeInTheDocument();
        expect(react_1.screen.getByText('completed')).toBeInTheDocument();
    });
    it('should handle settlement request', async () => {
        const mockPendingSettlement = {
            totalAmount: 1000,
            platformFee: 20,
            merchantAmount: 980,
            transactionCount: 5,
            transactions: [],
        };
        api_1.facilitatorAPI.getPendingSettlement.mockResolvedValue(mockPendingSettlement);
        api_1.facilitatorAPI.getSettlementHistory.mockResolvedValue([]);
        api_1.facilitatorAPI.requestSettlement.mockResolvedValue({
            id: 'settle1',
            status: 'pending',
        });
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Request Settlement')).toBeInTheDocument();
        });
        const requestButton = react_1.screen.getByText('Request Settlement');
        react_1.fireEvent.click(requestButton);
        await (0, react_1.waitFor)(() => {
            expect(api_1.facilitatorAPI.requestSettlement).toHaveBeenCalledWith({
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
        api_1.facilitatorAPI.getPendingSettlement.mockResolvedValue(mockPendingSettlement);
        api_1.facilitatorAPI.getSettlementHistory.mockResolvedValue([]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            const button = react_1.screen.getByText('Request Settlement');
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
        api_1.facilitatorAPI.getPendingSettlement.mockResolvedValue(mockPendingSettlement);
        api_1.facilitatorAPI.getSettlementHistory.mockResolvedValue(mockHistory);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Export CSV')).toBeInTheDocument();
            expect(react_1.screen.getByText('Export JSON')).toBeInTheDocument();
        });
    });
    it('should show no wallet message when wallet not connected', async () => {
        const useWalletStore = require('@/store/wallet').useWalletStore;
        useWalletStore.mockImplementation((selector) => selector({
            publicKey: null,
            getPublicKey: () => null,
        }));
        renderWithProviders(<page_1.default />);
        expect(react_1.screen.getByText('No Wallet Connected')).toBeInTheDocument();
        expect(react_1.screen.getByText('Connect your wallet to view settlements')).toBeInTheDocument();
    });
});
//# sourceMappingURL=page.test.js.map