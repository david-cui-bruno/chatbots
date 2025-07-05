const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Add this debug line temporarily
console.log('🔍 API_BASE_URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased to 60 seconds for comprehensive scraping
});

// Health check with better error handling
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend server is not running. Please start the backend server.');
    }
    throw error;
  }
);

// Add request interceptor for auth (we'll add this with Supabase later)
api.interceptors.request.use((config: any) => {
  // Will add auth token here later
  return config;
});

// API functions
export const chatbotAPI = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // NEW: Unified scraping (uses comprehensive scraper)
  scrapeWebsite: async (url: string, options = {}) => {
    const response = await api.post('/api/scrape', { url, options }, {
      timeout: 50000, // 50 second timeout
    });
    return response.data;
  },

  // NEW: Enhanced scraping (uses comprehensive scraper with more pages)
  scrapeWebsiteEnhanced: async (url: string, options = {}) => {
    const response = await api.post('/api/scrape-enhanced', { 
      url, 
      options: {
        maxPages: 20,
        maxTime: 60000,
        ...options
      }
    }, {
      timeout: 65000, // 65 second timeout
    });
    return response.data;
  },

  // NEW: Full comprehensive scraping
  scrapeWebsiteComprehensive: async (url: string, options = {}) => {
    const response = await api.post('/api/scrape-comprehensive', { 
      url, 
      options: {
        maxPages: 25,
        maxTime: 90000,
        ...options
      }
    }, {
      timeout: 95000, // 95 second timeout
    });
    return response.data;
  },

  // Send chat message
  sendMessage: async (message: string, websiteUrl?: string) => {
    const response = await api.post('/api/chat', { message, websiteUrl });
    return response.data;
  },
};

// Updated Types for Enhanced Scraper
export interface EnhancedScrapedData {
  url: string;
  timestamp: string;
  content: string;
  contentLength: number;
  pages_scraped: number;
  structured: {
    title: string;
    description: string;
    phone: string[];
    email: string[];
    address: string[];
    hours: string[];
    services: string[];
    products: string[];
    menu: string[];
    pricing: string[];
    about: string[];
    faqs: string[];
    policies: string[];
    location: string[];
  };
  scrapeStats?: {
    totalPagesAttempted: number;
    successfulPages: number;
    failedPages: number;
    skippedPages: number;
    scrapeDuration: number;
    failedUrls: string[];
  };
}

// Legacy type for backwards compatibility
export interface ScrapedData {
  url: string;
  timestamp: string;
  content: string;
  structured: {
    title: string;
    headings: Array<{ level: string; text: string }>;
    paragraphs: string[];
    faqs: string[];
    links: Array<{ text: string; url: string }>;
  };
}

export interface ChatResponse {
  success: boolean;
  response: string;
}

// Conversation Analytics API
export const conversationAPI = {
  // Get recent conversations
  getRecentConversations: async (userId: string, limit: number = 10) => {
    const response = await api.get(`/api/user/${userId}/conversations/recent?limit=${limit}`);
    return response.data;
  },

  // Get conversation statistics
  getConversationStats: async (userId: string, days: number = 30) => {
    const response = await api.get(`/api/user/${userId}/conversations/stats?days=${days}`);
    return response.data;
  },

  // Get most asked questions
  getPopularQuestions: async (userId: string, limit: number = 5) => {
    const response = await api.get(`/api/user/${userId}/conversations/popular-questions?limit=${limit}`);
    return response.data;
  },

  // Get conversation trends
  getConversationTrends: async (userId: string, days: number = 7) => {
    const response = await api.get(`/api/user/${userId}/conversations/trends?days=${days}`);
    return response.data;
  },

  // Rate a conversation
  rateConversation: async (conversationId: string, rating: 'good' | 'bad') => {
    const response = await api.post(`/api/conversations/${conversationId}/rate`, { rating });
    return response.data;
  },

  // Get dashboard analytics
  getDashboardAnalytics: async (userId: string) => {
    const response = await api.get(`/api/user/${userId}/dashboard/analytics`);
    return response.data;
  }
};

// Enhanced chat API with session tracking
export const chatAPI = {
  // Send message with session tracking
  sendMessage: async (message: string, chatbotId?: string, websiteUrl?: string, sessionId?: string) => {
    const response = await api.post('/api/chat', { 
      message, 
      chatbotId, 
      websiteUrl, 
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    return response.data;
  }
};
