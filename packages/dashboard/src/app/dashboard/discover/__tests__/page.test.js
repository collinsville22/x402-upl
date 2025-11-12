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
describe('DiscoverPage', () => {
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
    it('should render discover page with services', async () => {
        const mockResponse = {
            services: [
                {
                    id: 'service1',
                    name: 'AI Translation',
                    description: 'Translate text between languages',
                    category: 'AI',
                    pricing: { amount: '10', token: 'USDC' },
                    merchantWallet: 'wallet1',
                },
                {
                    id: 'service2',
                    name: 'Image Processing',
                    description: 'Process and enhance images',
                    category: 'Image',
                    pricing: { amount: '20', token: 'USDC' },
                    merchantWallet: 'wallet2',
                },
            ],
            total: 2,
            limit: 50,
            offset: 0,
        };
        api_1.facilitatorAPI.searchServices.mockResolvedValue(mockResponse);
        api_1.facilitatorAPI.getServiceCategories.mockResolvedValue([
            { category: 'AI', count: 5 },
            { category: 'Image', count: 3 },
        ]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Discover Services')).toBeInTheDocument();
        });
        expect(react_1.screen.getByText('AI Translation')).toBeInTheDocument();
        expect(react_1.screen.getByText('Image Processing')).toBeInTheDocument();
    });
    it('should filter services by category', async () => {
        const mockAllServices = {
            services: [
                {
                    id: 'service1',
                    name: 'AI Service',
                    category: 'AI',
                    pricing: { amount: '10', token: 'USDC' },
                },
            ],
            total: 1,
            limit: 50,
            offset: 0,
        };
        const mockAIServices = {
            services: [
                {
                    id: 'service1',
                    name: 'AI Service',
                    category: 'AI',
                    pricing: { amount: '10', token: 'USDC' },
                },
            ],
            total: 1,
            limit: 50,
            offset: 0,
        };
        api_1.facilitatorAPI.searchServices
            .mockResolvedValueOnce(mockAllServices)
            .mockResolvedValueOnce(mockAIServices);
        api_1.facilitatorAPI.getServiceCategories.mockResolvedValue([
            { category: 'AI', count: 5 },
        ]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('AI Service')).toBeInTheDocument();
        });
        const categoryButton = react_1.screen.getByText('AI');
        react_1.fireEvent.click(categoryButton);
        await (0, react_1.waitFor)(() => {
            expect(api_1.facilitatorAPI.searchServices).toHaveBeenCalledWith(expect.objectContaining({ category: 'AI' }));
        });
    });
    it('should search services by query', async () => {
        const mockResponse = {
            services: [],
            total: 0,
            limit: 50,
            offset: 0,
        };
        api_1.facilitatorAPI.searchServices.mockResolvedValue(mockResponse);
        api_1.facilitatorAPI.getServiceCategories.mockResolvedValue([]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Discover Services')).toBeInTheDocument();
        });
        const searchInput = react_1.screen.getByPlaceholderText('Search services...');
        react_1.fireEvent.change(searchInput, { target: { value: 'translation' } });
        await (0, react_1.waitFor)(() => {
            expect(api_1.facilitatorAPI.searchServices).toHaveBeenCalledWith(expect.objectContaining({ query: 'translation' }));
        }, { timeout: 1000 });
    });
    it('should sort services', async () => {
        const mockResponse = {
            services: [],
            total: 0,
            limit: 50,
            offset: 0,
        };
        api_1.facilitatorAPI.searchServices.mockResolvedValue(mockResponse);
        api_1.facilitatorAPI.getServiceCategories.mockResolvedValue([]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Discover Services')).toBeInTheDocument();
        });
        const sortSelect = react_1.screen.getByRole('combobox');
        react_1.fireEvent.change(sortSelect, { target: { value: 'price' } });
        await (0, react_1.waitFor)(() => {
            expect(api_1.facilitatorAPI.searchServices).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'price' }));
        });
    });
    it('should show empty state when no services found', async () => {
        const mockResponse = {
            services: [],
            total: 0,
            limit: 50,
            offset: 0,
        };
        api_1.facilitatorAPI.searchServices.mockResolvedValue(mockResponse);
        api_1.facilitatorAPI.getServiceCategories.mockResolvedValue([]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('No services found')).toBeInTheDocument();
        });
    });
    it('should display service pricing correctly', async () => {
        const mockResponse = {
            services: [
                {
                    id: 'service1',
                    name: 'Premium Service',
                    pricing: { amount: '99.99', token: 'USDC' },
                },
            ],
            total: 1,
            limit: 50,
            offset: 0,
        };
        api_1.facilitatorAPI.searchServices.mockResolvedValue(mockResponse);
        api_1.facilitatorAPI.getServiceCategories.mockResolvedValue([]);
        renderWithProviders(<page_1.default />);
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText(/99.99/)).toBeInTheDocument();
            expect(react_1.screen.getByText(/USDC/)).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=page.test.js.map