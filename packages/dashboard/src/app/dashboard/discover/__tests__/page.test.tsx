import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiscoverPage from '../page';
import { facilitatorAPI } from '@/lib/api';

jest.mock('@/lib/api');

describe('DiscoverPage', () => {
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

    (facilitatorAPI.searchServices as jest.Mock).mockResolvedValue(mockResponse);
    (facilitatorAPI.getServiceCategories as jest.Mock).mockResolvedValue([
      { category: 'AI', count: 5 },
      { category: 'Image', count: 3 },
    ]);

    renderWithProviders(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText('Discover Services')).toBeInTheDocument();
    });

    expect(screen.getByText('AI Translation')).toBeInTheDocument();
    expect(screen.getByText('Image Processing')).toBeInTheDocument();
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

    (facilitatorAPI.searchServices as jest.Mock)
      .mockResolvedValueOnce(mockAllServices)
      .mockResolvedValueOnce(mockAIServices);

    (facilitatorAPI.getServiceCategories as jest.Mock).mockResolvedValue([
      { category: 'AI', count: 5 },
    ]);

    renderWithProviders(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Service')).toBeInTheDocument();
    });

    const categoryButton = screen.getByText('AI');
    fireEvent.click(categoryButton);

    await waitFor(() => {
      expect(facilitatorAPI.searchServices).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'AI' })
      );
    });
  });

  it('should search services by query', async () => {
    const mockResponse = {
      services: [],
      total: 0,
      limit: 50,
      offset: 0,
    };

    (facilitatorAPI.searchServices as jest.Mock).mockResolvedValue(mockResponse);
    (facilitatorAPI.getServiceCategories as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText('Discover Services')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search services...');
    fireEvent.change(searchInput, { target: { value: 'translation' } });

    await waitFor(
      () => {
        expect(facilitatorAPI.searchServices).toHaveBeenCalledWith(
          expect.objectContaining({ query: 'translation' })
        );
      },
      { timeout: 1000 }
    );
  });

  it('should sort services', async () => {
    const mockResponse = {
      services: [],
      total: 0,
      limit: 50,
      offset: 0,
    };

    (facilitatorAPI.searchServices as jest.Mock).mockResolvedValue(mockResponse);
    (facilitatorAPI.getServiceCategories as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText('Discover Services')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'price' } });

    await waitFor(() => {
      expect(facilitatorAPI.searchServices).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'price' })
      );
    });
  });

  it('should show empty state when no services found', async () => {
    const mockResponse = {
      services: [],
      total: 0,
      limit: 50,
      offset: 0,
    };

    (facilitatorAPI.searchServices as jest.Mock).mockResolvedValue(mockResponse);
    (facilitatorAPI.getServiceCategories as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText('No services found')).toBeInTheDocument();
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

    (facilitatorAPI.searchServices as jest.Mock).mockResolvedValue(mockResponse);
    (facilitatorAPI.getServiceCategories as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText(/99.99/)).toBeInTheDocument();
      expect(screen.getByText(/USDC/)).toBeInTheDocument();
    });
  });
});
