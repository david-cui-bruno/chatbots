import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quickActions } from '@/lib/supabase';

export function useQuickActions(userId: string | null) {
  const queryClient = useQueryClient();

  const refreshContent = useMutation({
    mutationFn: () => quickActions.refreshAllWebsiteContent(userId!),
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show browser notification since we don't have toast setup yet
      if (successful > 0) {
        alert(`✅ Successfully refreshed ${successful} chatbot${successful > 1 ? 's' : ''}!${failed > 0 ? ` (${failed} failed)` : ''}`);
      }
      
      // Refetch dashboard stats
      queryClient.invalidateQueries({ queryKey: ['recent-conversations', userId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-stats', userId] });
    },
    onError: (error) => {
      console.error('Refresh error:', error);
      alert('❌ Failed to refresh content. Please try again.');
    }
  });

  const exportHistory = useMutation({
    mutationFn: () => quickActions.exportChatHistory(userId!),
    onSuccess: (csvContent) => {
      // Download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert('✅ Chat history exported successfully!');
    },
    onError: (error) => {
      console.error('Export error:', error);
      alert('❌ Failed to export chat history. Please try again.');
    }
  });

  const toggleStatus = useMutation({
    mutationFn: () => quickActions.toggleChatbotStatus(userId!),
    onSuccess: () => {
      // Refetch chatbot status
      queryClient.invalidateQueries({ queryKey: ['chatbot-status', userId] });
    },
  });

  const createSample = useMutation({
    mutationFn: () => quickActions.createSampleChatbot(userId!),
    onSuccess: () => {
      // Refetch all dashboard data
      queryClient.invalidateQueries({ queryKey: ['chatbot-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['last-scan', userId] });
    },
  });

  return {
    refreshContent,
    exportHistory,
    toggleStatus,
    createSample,
  };
}
