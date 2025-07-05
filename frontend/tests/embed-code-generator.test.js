import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmbedCodeGenerator from '../components/embed-code-generator';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('EmbedCodeGenerator Component', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  // WHY: Ensures the component shows loading state while fetching chatbot data
  // Provides user feedback during data loading
  test('should show loading state initially', () => {
    const { supabase } = require('../lib/supabase');
    
    // Mock pending promise for loading state
    supabase.from().select().eq().eq().single.mockReturnValue(
      new Promise(() => {}) // Never resolves = loading state
    );

    render(
      <QueryClientProvider client={queryClient}>
        <EmbedCodeGenerator userId="test-user-id" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading your chatbot...')).toBeInTheDocument();
  });

  // WHY: Verifies the component handles the case when no chatbot exists
  // Guides users to create a chatbot before generating embed code
  test('should show no chatbot message when none exists', async () => {
    const { supabase } = require('../lib/supabase');
    supabase.from().select().eq().single.mockResolvedValue({
      data: null,
      error: { message: 'No rows found' }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <EmbedCodeGenerator userId="test-user-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Active Chatbot')).toBeInTheDocument();
    });
  });

  // WHY: Validates that valid chatbot data renders the embed code correctly
  // Ensures users can successfully get their integration code
  test('should display chatbot details and embed code when chatbot exists', async () => {
    const mockChatbot = {
      id: 'test-chatbot-id',
      name: 'Test Bot',
      website_url: 'https://test.com',
      is_active: true,
      settings: { color: '#667eea', position: 'bottom-right' }
    };

    const { supabase } = require('../lib/supabase');
    supabase.from().select().eq().single.mockResolvedValue({
      data: mockChatbot,
      error: null
    });

    render(
      <QueryClientProvider client={queryClient}>
        <EmbedCodeGenerator userId="test-user-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Bot')).toBeInTheDocument();
      expect(screen.getByText('https://test.com')).toBeInTheDocument();
    });
  });
}); 