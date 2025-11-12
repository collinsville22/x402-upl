"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const page_1 = __importDefault(require("../page"));
const api_1 = require("@/lib/api");
jest.mock('@/lib/api');
jest.mock('@/store/wallet', () => ({
    useWalletStore: jest.fn((selector) => selector({
        publicKey: 'test-wallet-123',
        getPublicKey: () => ({
            toString: () => 'test-wallet-123',
        }),
    })),
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
        api_1.facilitatorAPI.getTransactions.mockResolvedValue(mockTransactions);
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Transactions')).toBeInTheDocument();
        });
        expect(react_1.screen.getByText('Service A')).toBeInTheDocument();
        expect(react_1.screen.getByText('Service B')).toBeInTheDocument();
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
        api_1.facilitatorAPI.getTransactions.mockResolvedValue(mockTransactions);
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Service A')).toBeInTheDocument();
        });
        const successButton = react_1.screen.getByText('Success');
        react_1.fireEvent.click(successButton);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Service A')).toBeInTheDocument();
            expect(react_1.screen.queryByText('Service B')).not.toBeInTheDocument();
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
        api_1.facilitatorAPI.getTransactions.mockResolvedValue(mockTransactions);
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Service A')).toBeInTheDocument();
        });
        const searchInput = react_1.screen.getByPlaceholderText('Search by signature or service...');
        react_1.fireEvent.change(searchInput, { target: { value: 'unique' } });
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Service A')).toBeInTheDocument();
            expect(react_1.screen.queryByText('Service B')).not.toBeInTheDocument();
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
        api_1.facilitatorAPI.getTransactions.mockResolvedValue(mockTransactions);
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Service 0')).toBeInTheDocument();
        });
        expect(react_1.screen.getByText('Page 1 of 2')).toBeInTheDocument();
        const nextButton = react_1.screen.getByText('Next');
        react_1.fireEvent.click(nextButton);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Page 2 of 2')).toBeInTheDocument();
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
        api_1.facilitatorAPI.getTransactions.mockResolvedValue(mockTransactions);
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Export CSV')).toBeInTheDocument();
            expect(react_1.screen.getByText('Export JSON')).toBeInTheDocument();
        });
    });
    it('should show loading state', async () => {
        api_1.facilitatorAPI.getTransactions.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 1000)));
        (0, react_1.render)(<page_1.default />);
        expect(react_1.screen.getByText('Loading transactions...')).toBeInTheDocument();
    });
    it('should show empty state when no transactions', async () => {
        api_1.facilitatorAPI.getTransactions.mockResolvedValue([]);
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('No transactions yet')).toBeInTheDocument();
            expect(react_1.screen.getByText('Transactions will appear here as they occur')).toBeInTheDocument();
        });
    });
    it('should handle API errors gracefully', async () => {
        api_1.facilitatorAPI.getTransactions.mockRejectedValue(new Error('API Error'));
        (0, react_1.render)(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.queryByText('Service A')).not.toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map