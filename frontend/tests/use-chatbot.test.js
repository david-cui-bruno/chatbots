import { renderHook, waitFor } from '@testing-library/react';
import { useChatbot } from '../components/embed-code-generator';

// Mock only what you need
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('useChatbot hook', () => {
  it('should return loading state initially', () => {
    const { supabase } = require('../lib/supabase');
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => new Promise(() => {}) // Pending
          })
        })
      })
    });

    const { result } = renderHook(() => useChatbot('test-user'));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.chatbot).toBe(null);
  });

  it('should handle successful data loading', async () => {
    const mockChatbot = { id: '1', name: 'Test Bot' };
    const { supabase } = require('../lib/supabase');
    
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockChatbot, error: null })
          })
        })
      })
    });

    const { result } = renderHook(() => useChatbot('test-user'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.chatbot).toEqual(mockChatbot);
    });
  });
}); 