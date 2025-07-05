module.exports = {
  // Queue settings
  maxPages: 50,
  maxTime: 300000, // 5 minutes
  batchSize: 3,
  
  // Politeness settings
  requestDelay: 1000, // 1 second between requests
  maxConcurrent: 2,   // Max 2 concurrent requests
  maxRedirects: 5,
  timeout: 15000,     // 15 second timeout
  
  // Content settings
  maxChunkTokens: 800,
  chunkOverlap: 50,
  
  // Storage settings
  outputDir: './scraper_data',
  
  // User agent
  userAgent: 'ChatbotScraper/1.0 (+https://yoursite.com/bot)'
}; 