require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getChatResponse } = require('./chatbot');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ComprehensiveScraper = require('./scraper/main');
const { 
  getChatbot, 
  saveConversation,
  getRecentConversations,
  getConversationStats,
  getMostAskedQuestions,
  getConversationTrends
} = require('./database');
console.log('DEBUG: API Key loaded?', process.env.OPENAI_API_KEY ? 'YES' : 'NO');

const app = express();
console.log('🚀 Starting server.js...');

// Add this RIGHT AFTER const app = express(); (before any middleware)
app.use((req, res, next) => {
  console.log(`🚨 REQUEST STARTED: ${req.method} ${req.path} at ${new Date().toISOString()}`);
  next();
});

// Add this BEFORE any other middleware (right after app creation)
app.use((req, res, next) => {
  console.log(`🔍 Incoming request: ${req.method} ${req.path}`);
  console.log(`🔍 Origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add this BEFORE your health endpoint
app.use((req, res, next) => {
  console.log(`🚨 REQUEST REACHED ROUTES: ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log('🚨 HEALTH ENDPOINT REACHED!');
  try {
    const response = { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      openai: !!process.env.OPENAI_API_KEY,
      environment: process.env.NODE_ENV || 'development'
    };
    console.log('🚨 SENDING HEALTH RESPONSE:', response);
    res.json(response);
    console.log('🚨 HEALTH RESPONSE SENT!');
  } catch (error) {
    console.error('🚨 HEALTH ENDPOINT ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scrape a website endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🚀 NEW Comprehensive scraping: ${url}`);
    
    const scraper = new ComprehensiveScraper(url, {
      maxPages: options.maxPages || 15,
      maxTime: options.maxTime || 45000,  // 45 seconds
      batchSize: options.batchSize || 3,
      requestDelay: options.requestDelay || 1000,
      maxConcurrent: options.maxConcurrent || 2
    });
    
    const results = await scraper.crawl();
    
    res.json({ 
      success: true,
      url,
      contentLength: results.contentLength,
      data: results  // Keep same format for backward compatibility
    });
  } catch (error) {
    console.error('Comprehensive scraping error:', error.message);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

// Replace /api/scrape-enhanced with comprehensive scraper
app.post('/api/scrape-enhanced', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🚀 NEW Enhanced scraping: ${url}`);
    
    const scraper = new ComprehensiveScraper(url, {
      maxPages: options.maxPages || 20,  // More pages for enhanced
      maxTime: options.maxTime || 60000, // 60 seconds for enhanced
      batchSize: options.batchSize || 3,
      requestDelay: options.requestDelay || 800,
      maxConcurrent: options.maxConcurrent || 3
    });
    
    const results = await scraper.crawl();
    
    res.json({ 
      success: true, 
      url: url,
      contentLength: results.contentLength,
      pagesScraped: results.pages_scraped,
      data: results  // Enhanced format
    });
  } catch (error) {
    console.error('Enhanced scraping error:', error.message);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

// Enhanced chat endpoint with conversation tracking
app.post('/api/chat', async (req, res) => {
  try {
    const { message, chatbotId, websiteUrl } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`💬 Chat request for chatbot ${chatbotId}: ${message}`);
    
    let contextData = null;
    
    // Load chatbot-specific data from DATABASE
    if (chatbotId) {
      const chatbotData = await getChatbot(chatbotId);
      
      if (chatbotData && chatbotData.scraped_content) {
        if (typeof chatbotData.scraped_content === 'string') {
          contextData = chatbotData.scraped_content;
        } else if (chatbotData.scraped_content.content) {
          contextData = chatbotData.scraped_content.content;
        }
      }
    }
    
    // Get AI response
    const response = await getChatResponse(message, websiteUrl, contextData);
    
    // Save conversation to database
    if (chatbotId) {
      const conversationData = {
        chatbot_id: chatbotId,
        user_message: message,
        bot_response: response
      };
      
      await saveConversation(conversationData);
    }
    
    res.json({ 
      success: true,
      response: response,
      chatbotId: chatbotId
    });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: 'Failed to get chat response' });
  }
});

// Get recent conversations for a user
app.get('/api/user/:userId/conversations/recent', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const conversations = await getRecentConversations(userId, parseInt(limit));
    
    res.json({
      success: true,
      conversations: conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Error fetching recent conversations:', error);
    res.status(500).json({ error: 'Failed to fetch recent conversations' });
  }
});

// Get conversation statistics for a user
app.get('/api/user/:userId/conversations/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const stats = await getConversationStats(userId, parseInt(days));
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    res.status(500).json({ error: 'Failed to fetch conversation statistics' });
  }
});

// Get most asked questions for a user
app.get('/api/user/:userId/conversations/popular-questions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;
    
    console.log(`❓ Fetching most asked questions for user: ${userId}`);
    
    const questions = await getMostAskedQuestions(userId, parseInt(limit));
    
    res.json({
      success: true,
      questions: questions
    });
  } catch (error) {
    console.error('Error fetching most asked questions:', error);
    res.status(500).json({ error: 'Failed to fetch popular questions' });
  }
});

// Get conversation trends for a user
app.get('/api/user/:userId/conversations/trends', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;
    
    console.log(`📈 Fetching conversation trends for user: ${userId}`);
    
    const trends = await getConversationTrends(userId, parseInt(days));
    
    res.json({
      success: true,
      trends: trends
    });
  } catch (error) {
    console.error('Error fetching conversation trends:', error);
    res.status(500).json({ error: 'Failed to fetch conversation trends' });
  }
});

// Rate a conversation
app.post('/api/conversations/:conversationId/rate', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { rating } = req.body; // 'good' or 'bad'
    
    if (!rating || !['good', 'bad'].includes(rating)) {
      return res.status(400).json({ error: 'Valid rating (good/bad) is required' });
    }
    
    console.log(`👍 Rating conversation ${conversationId}: ${rating}`);
    
    const { data, error } = await supabase
      .from('conversations')
      .update({ user_rating: rating })
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Rating saved successfully',
      conversation: data
    });
  } catch (error) {
    console.error('Error rating conversation:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Get dashboard analytics for a user
app.get('/api/user/:userId/dashboard/analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 Fetching dashboard analytics for user: ${userId}`);
    
    // Get all analytics data in parallel
    const [
      conversationStats,
      recentConversations,
      popularQuestions,
      trends
    ] = await Promise.all([
      getConversationStats(userId, 30),
      getRecentConversations(userId, 5),
      getMostAskedQuestions(userId, 3),
      getConversationTrends(userId, 7)
    ]);
    
    res.json({
      success: true,
      analytics: {
        stats: conversationStats,
        recentConversations,
        popularQuestions,
        trends,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Chatbot configuration endpoint with database integration
app.get('/api/chatbot/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔧 Fetching config for chatbot: ${id}`);
    
    // Use the database function that has SERVICE_ROLE_KEY
    const chatbot = await getChatbot(id);

    if (!chatbot) {
      console.error('❌ Chatbot not found:', id);
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    // Return actual chatbot settings from database
    const chatbotConfig = {
      id: chatbot.id,
      name: chatbot.name,
      greeting: chatbot.settings?.greeting || 'Hi! How can I help you today?',
      color: chatbot.settings?.color || '#667eea',
      position: chatbot.settings?.position || 'bottom-right',
      title: chatbot.title || chatbot.name,
      isActive: chatbot.is_active
    };
    
    console.log(`✅ Returning REAL config for chatbot ${id}:`, chatbotConfig);
    res.json({ success: true, config: chatbotConfig });
  } catch (error) {
    console.error('Error fetching chatbot config:', error);
    res.status(500).json({ error: 'Failed to fetch chatbot configuration' });
  }
});

// Enhanced conversation tracking endpoint
app.post('/api/chatbot/:id/conversation', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_message, bot_response, user_rating, session_id } = req.body;
    
    const conversationData = {
      chatbot_id: id,
      user_message,
      bot_response,
      user_rating,
      session_id,
      timestamp: new Date().toISOString(),
      user_ip: req.ip,
      user_agent: req.get('User-Agent')
    };
    
    console.log(`💬 Saving conversation for chatbot ${id}:`, conversationData);
    
    // TODO: Save to Supabase database
    // const { data, error } = await supabase
    //   .from('conversations')
    //   .insert(conversationData);
    
    res.json({ success: true, message: 'Conversation saved', id: `conv_${Date.now()}` });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ error: 'Failed to save conversation' });
  }
});

// Serve widget files with proper CORS headers
app.use('/widget', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'widget')));

// Add this right after your other setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test the connection
console.log('🔗 Supabase client initialized');

// Update /api/scrape-comprehensive 
app.post('/api/scrape-comprehensive', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🌐 NEW Comprehensive scraping: ${url}`);
    
    const scraper = new ComprehensiveScraper(url, {
      maxPages: options.maxPages || 25,  // Maximum pages for comprehensive
      maxTime: options.maxTime || 90000, // 90 seconds for comprehensive
      batchSize: options.batchSize || 4,
      requestDelay: options.requestDelay || 1200,
      maxConcurrent: options.maxConcurrent || 2
    });
    
    const results = await scraper.crawl();
    
    res.json({ 
      success: true, 
      url: url,
      ...results  // Full comprehensive format
    });
  } catch (error) {
    console.error('Comprehensive scraping error:', error.message);
    res.status(500).json({ error: 'Failed to scrape website comprehensively' });
  }
});

// Add this new endpoint (replace the old comprehensive one):
app.post('/api/scrape-professional', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🏢 Professional scraping: ${url}`);
    
    const ComprehensiveScraper = require('./scraper/main');
    const scraper = new ComprehensiveScraper(url, {
      maxPages: options.maxPages || 15,
      maxTime: options.maxTime || 45000,  // 45 seconds
      batchSize: options.batchSize || 3,
      requestDelay: options.requestDelay || 1000,
      maxConcurrent: options.maxConcurrent || 2
    });
    
    const results = await scraper.crawl();
    
    res.json({ 
      success: true,
      url,
      ...results
    });
  } catch (error) {
    console.error('Professional scraping error:', error.message);
    res.status(500).json({ error: 'Professional scraping failed' });
  }
});

console.log('✅ Routes configured');
console.log('🎯 About to start listening on port...');

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🔄 Server should stay running - waiting for requests...');
  
  // Heartbeat to confirm it's staying alive
  setInterval(() => {
    console.log(`💓 Server heartbeat - ${new Date().toISOString()}`);
  }, 10000);
});

console.log('✅ Listen command executed');