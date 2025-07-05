import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

// Database types
export interface UserProfile {
  id: string
  email: string
  company_name?: string
  created_at: string
  updated_at: string
}

export interface Chatbot {
  id: string
  user_id: string
  name: string
  website_url: string
  title: string
  is_active: boolean
  last_scraped_at?: string
  scraped_content?: Record<string, unknown>
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  chatbot_id: string
  user_message: string
  bot_response: string
  user_rating?: 'good' | 'bad'
  created_at: string
}

// Dashboard Analytics Functions
export const dashboardAPI = {
  // Get conversation stats for current month
  getConversationStats: async (userId: string) => {
    // First get user's chatbot IDs
    const { data: userChatbots } = await supabase
      .from('chatbots')
      .select('id')
      .eq('user_id', userId);
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return { currentCount: 0, percentChange: 0, trend: "No chatbots yet" };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, created_at')
      .in('chatbot_id', chatbotIds)
      .gte('created_at', startOfMonth.toISOString());

    const currentCount = conversations?.length || 0;
    return {
      currentCount,
      percentChange: 0, // Simplified for now
      trend: `${currentCount} conversations this month`
    };
  },

  // Get most asked question
  getMostAskedQuestion: async (userId: string) => {
    const { data: userChatbots } = await supabase
      .from('chatbots')
      .select('id')
      .eq('user_id', userId);
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return { question: 'No questions yet', count: 0 };

    const { data: conversations } = await supabase
      .from('conversations')
      .select('user_message')
      .in('chatbot_id', chatbotIds)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!conversations?.length) return { question: 'No questions yet', count: 0 };

    return {
      question: conversations[0].user_message.substring(0, 30) + '...',
      count: conversations.length
    };
  },

  // Get chatbot status
  getChatbotStatus: async (userId: string) => {
    const { data: chatbots, error } = await supabase
      .from('chatbots')
      .select('is_active, last_scraped_at')
      .eq('user_id', userId);

    if (error) throw error;

    const activeChatbots = chatbots?.filter(bot => bot.is_active).length || 0;
    const totalChatbots = chatbots?.length || 0;

    return {
      status: activeChatbots > 0 ? 'Online' : 'Offline',
      activeCount: activeChatbots,
      totalCount: totalChatbots
    };
  },

  // Get last website scan
  getLastScan: async (userId: string) => {
    const { data: chatbot, error } = await supabase
      .from('chatbots')
      .select('last_scraped_at')
      .eq('user_id', userId)
      .order('last_scraped_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !chatbot?.last_scraped_at) {
      return {
        timeAgo: 'Never',
        status: 'No scans yet'
      };
    }

    const scanTime = new Date(chatbot.last_scraped_at);
    const now = new Date();
    const diffMs = now.getTime() - scanTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    const timeAgo = diffHours > 0 ? `${diffHours} hours ago` : 'Just now';

    return {
      timeAgo,
      status: 'Content up to date'
    };
  },

  // Get recent conversations
  getRecentConversations: async (userId: string, limit: number = 5) => {
    const { data: userChatbots } = await supabase
      .from('chatbots')
      .select('id, name')
      .eq('user_id', userId);
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return [];

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, user_message, bot_response, user_rating, created_at, chatbot_id')
      .in('chatbot_id', chatbotIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    return conversations?.map(conv => ({
      id: conv.id,
      customer: 'Website Visitor',
      question: conv.user_message,
      response: conv.bot_response,
      rating: conv.user_rating as 'good' | 'bad' | undefined,
      timestamp: new Date(conv.created_at).toLocaleString(),
      chatbotName: userChatbots?.find(bot => bot.id === conv.chatbot_id)?.name || 'Unknown'
    })) || [];
  }
};

// Quick Actions API
export const quickActions = {
  // Refresh website content for all user's chatbots
  refreshAllWebsiteContent: async (userId: string) => {
    const { data: chatbots, error } = await supabase
      .from('chatbots')
      .select('id, website_url, name')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    // For each chatbot, trigger the NEW comprehensive scrape
    const refreshPromises = chatbots?.map(async (chatbot) => {
      try {
        // Call the NEW comprehensive scraper
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: chatbot.website_url,
            options: {
              maxPages: 15,  // Good balance for refresh
              maxTime: 45000, // 45 seconds
              requestDelay: 1000
            }
          })
        });
        
        const data = await response.json();
        
        // Update the chatbot with new scraped content
        await supabase
          .from('chatbots')
          .update({
            scraped_content: data.data,
            last_scraped_at: new Date().toISOString()
          })
          .eq('id', chatbot.id);

        return { success: true, chatbot: chatbot.name };
      } catch (error) {
        return { success: false, chatbot: chatbot.name, error };
      }
    }) || [];

    const results = await Promise.all(refreshPromises);
    return results;
  },

  // Export chat history as CSV
  exportChatHistory: async (userId: string) => {
    const { data: userChatbots } = await supabase
      .from('chatbots')
      .select('id, name, website_url')
      .eq('user_id', userId);
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return 'No conversations to export';

    const { data: conversations } = await supabase
      .from('conversations')
      .select('user_message, bot_response, user_rating, created_at, chatbot_id')
      .in('chatbot_id', chatbotIds)
      .order('created_at', { ascending: false });

    const csvHeaders = ['Date', 'Chatbot', 'Website', 'User Question', 'Bot Response', 'Rating'];
    const csvRows = conversations?.map(conv => {
      const chatbot = userChatbots?.find(bot => bot.id === conv.chatbot_id);
      return [
        new Date(conv.created_at).toLocaleDateString(),
        chatbot?.name || 'Unknown',
        chatbot?.website_url || 'Unknown',
        `"${conv.user_message.replace(/"/g, '""')}"`,
        `"${conv.bot_response.replace(/"/g, '""')}"`,
        conv.user_rating || 'No rating'
      ];
    }) || [];

    return [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n');
  },

  // Toggle chatbot status
  toggleChatbotStatus: async (userId: string) => {
    // Get all user's chatbots
    const { data: chatbots, error } = await supabase
      .from('chatbots')
      .select('id, is_active')
      .eq('user_id', userId);

    if (error) throw error;

    if (!chatbots || chatbots.length === 0) {
      throw new Error('No chatbots found. Create a chatbot first.');
    }

    // Toggle all chatbots to the opposite state
    const hasActiveBot = chatbots.some(bot => bot.is_active);
    const newStatus = !hasActiveBot;

    const { error: updateError } = await supabase
      .from('chatbots')
      .update({ is_active: newStatus })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return { 
      newStatus, 
      message: newStatus ? 'All chatbots activated' : 'All chatbots deactivated',
      affectedCount: chatbots.length 
    };
  },

  // Create a sample chatbot for testing
  createSampleChatbot: async (userId: string) => {
    const { data: existingChatbots } = await supabase
      .from('chatbots')
      .select('id')
      .eq('user_id', userId);

    if (existingChatbots && existingChatbots.length > 0) {
      throw new Error('You already have chatbots. Use the Setup & Test tab to create more.');
    }

    const { data: newChatbot, error } = await supabase
      .from('chatbots')
      .insert({
        user_id: userId,
        name: 'Demo Chatbot',
        website_url: 'https://stripe.com',
        title: 'Demo Assistant',
        is_active: true,
        settings: {
          color: '#667eea',
          position: 'bottom-right'
        }
      })
      .select()
      .single();

    if (error) throw error;

    return newChatbot;
  }
};
