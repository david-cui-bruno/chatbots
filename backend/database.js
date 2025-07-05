const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Use SERVICE ROLE KEY for backend operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get chatbot by ID
async function getChatbot(chatbotId) {
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chatbot:', error);
    return null;
  }
}

// Save conversation (simplified for your schema)
async function saveConversation(conversationData) {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        chatbot_id: conversationData.chatbot_id,
        user_message: conversationData.user_message,
        bot_response: conversationData.bot_response,
        user_rating: conversationData.user_rating || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    console.log('💾 Conversation saved:', data.id);
    return data;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return null;
  }
}

// Get recent conversations for a user
async function getRecentConversations(userId, limit = 10) {
  try {
    console.log(`📋 Fetching recent conversations for user: ${userId}`);
    
    // First get user's chatbot IDs
    const { data: userChatbots, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, name, website_url')
      .eq('user_id', userId);
    
    if (chatbotError) throw chatbotError;
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    console.log(`📋 Found ${chatbotIds.length} chatbots for user`);
    
    if (chatbotIds.length === 0) return [];

    // Get recent conversations for these chatbots
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, chatbot_id, user_message, bot_response, user_rating, created_at')
      .in('chatbot_id', chatbotIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (convError) throw convError;

    // Join with chatbot data
    const enrichedConversations = conversations?.map(conv => {
      const chatbot = userChatbots?.find(bot => bot.id === conv.chatbot_id);
      return {
        id: conv.id,
        customer: 'Website Visitor',
        question: conv.user_message,
        response: conv.bot_response,
        rating: conv.user_rating,
        timestamp: new Date(conv.created_at).toLocaleString(),
        chatbotName: chatbot?.name || 'Unknown',
        chatbotWebsite: chatbot?.website_url || '',
        created_at: conv.created_at
      };
    }) || [];

    console.log(`📋 Returning ${enrichedConversations.length} conversations`);
    return enrichedConversations;
  } catch (error) {
    console.error('Error fetching recent conversations:', error);
    return [];
  }
}

// Get conversation statistics for a user
async function getConversationStats(userId, days = 30) {
  try {
    console.log(`📊 Fetching conversation stats for user: ${userId}`);
    
    // Get user's chatbot IDs
    const { data: userChatbots, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('user_id', userId);
    
    if (chatbotError) throw chatbotError;
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return getEmptyStats();

    // Get date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    // Get conversations in date range
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, created_at, user_rating')
      .in('chatbot_id', chatbotIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (convError) throw convError;

    // Calculate statistics
    const totalConversations = conversations?.length || 0;
    const ratedConversations = conversations?.filter(c => c.user_rating) || [];
    const positiveRatings = ratedConversations.filter(c => c.user_rating === 'good').length;
    
    const satisfactionRate = ratedConversations.length > 0 
      ? Math.round((positiveRatings / ratedConversations.length) * 100)
      : 0;

    // Get previous period for comparison
    const prevStartDate = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000));
    const { data: prevConversations } = await supabase
      .from('conversations')
      .select('id')
      .in('chatbot_id', chatbotIds)
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());

    const prevTotal = prevConversations?.length || 0;
    const percentChange = prevTotal > 0 
      ? Math.round(((totalConversations - prevTotal) / prevTotal) * 100)
      : totalConversations > 0 ? 100 : 0;

    console.log(`📊 Stats: ${totalConversations} conversations, ${satisfactionRate}% satisfaction`);

    return {
      totalConversations,
      satisfactionRate,
      percentChange,
      positiveRatings,
      totalRated: ratedConversations.length,
      period: `${days} days`
    };
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    return getEmptyStats();
  }
}

// Get most asked questions
async function getMostAskedQuestions(userId, limit = 5) {
  try {
    // Get user's chatbot IDs
    const { data: userChatbots, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('user_id', userId);
    
    if (chatbotError) throw chatbotError;
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return [];

    // Get recent conversations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('user_message')
      .in('chatbot_id', chatbotIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(500); // Limit to avoid too much data

    if (convError) throw convError;

    // Count similar questions (simple grouping by first 50 characters)
    const questionGroups = {};
    conversations?.forEach(conv => {
      const question = conv.user_message.trim();
      const key = question.substring(0, 50).toLowerCase();
      
      if (!questionGroups[key]) {
        questionGroups[key] = {
          question: question,
          count: 0
        };
      }
      
      questionGroups[key].count++;
    });

    // Sort by frequency and return top questions
    const topQuestions = Object.values(questionGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topQuestions;
  } catch (error) {
    console.error('Error fetching most asked questions:', error);
    return [];
  }
}

function getEmptyStats() {
  return {
    totalConversations: 0,
    satisfactionRate: 0,
    percentChange: 0,
    positiveRatings: 0,
    totalRated: 0,
    period: '30 days'
  };
}

module.exports = {
  supabase,
  getChatbot,
  saveConversation,
  getRecentConversations,
  getConversationStats,
  getMostAskedQuestions
}; 
// Get conversation trends (daily counts)
async function getConversationTrends(userId, days = 7) {
  try {
    // Get user's chatbot IDs
    const { data: userChatbots, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('user_id', userId);
    
    if (chatbotError) throw chatbotError;
    
    const chatbotIds = userChatbots?.map(bot => bot.id) || [];
    if (chatbotIds.length === 0) return [];

    // Get conversations for the period
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('created_at')
      .in('chatbot_id', chatbotIds)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (convError) throw convError;

    // Group by day
    const dailyCounts = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyCounts[dateKey] = 0;
    }

    conversations?.forEach(conv => {
      const dateKey = conv.created_at.split('T')[0];
      if (dailyCounts[dateKey] !== undefined) {
        dailyCounts[dateKey]++;
      }
    });

    // Convert to array format
    const trends = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
      label: new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));

    return trends;
  } catch (error) {
    console.error('Error fetching conversation trends:', error);
    return [];
  }
}

function getEmptyStats() {
  return {
    totalConversations: 0,
    satisfactionRate: 0,
    avgResponseTime: 0,
    percentChange: 0,
    positiveRatings: 0,
    negativeRatings: 0,
    totalRated: 0,
    period: '30 days'
  };
}

module.exports = {
  supabase,
  getChatbot,
  saveConversation,
  getRecentConversations,
  getConversationStats,
  getMostAskedQuestions,
  getConversationTrends
}; 