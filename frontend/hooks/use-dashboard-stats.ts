import { useQuery } from '@tanstack/react-query';
import { conversationAPI } from '@/lib/api';

export function useDashboardStats(userId: string | null) {
  const dashboardAnalytics = useQuery({
    queryKey: ['dashboard-analytics', userId],
    queryFn: () => conversationAPI.getDashboardAnalytics(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });

  const recentConversations = useQuery({
    queryKey: ['recent-conversations', userId],
    queryFn: () => conversationAPI.getRecentConversations(userId!, 10),
    enabled: !!userId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const conversationStats = useQuery({
    queryKey: ['conversation-stats', userId],
    queryFn: () => conversationAPI.getConversationStats(userId!, 30),
    enabled: !!userId,
    refetchInterval: 60000, // Refresh every minute
  });

  const popularQuestions = useQuery({
    queryKey: ['popular-questions', userId],
    queryFn: () => conversationAPI.getPopularQuestions(userId!, 5),
    enabled: !!userId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  return {
    dashboardAnalytics,
    recentConversations,
    conversationStats,
    popularQuestions,
    isLoading: dashboardAnalytics.isLoading || recentConversations.isLoading,
    error: dashboardAnalytics.error || recentConversations.error,
    refetch: () => {
      dashboardAnalytics.refetch();
      recentConversations.refetch();
      conversationStats.refetch();
      popularQuestions.refetch();
    }
  };
}