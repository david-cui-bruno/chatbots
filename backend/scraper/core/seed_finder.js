const axios = require('axios');
const URLUtils = require('../utils/url_utils');

class SeedFinder {
  constructor(domain, config = {}) {
    this.domain = domain;
    this.config = config;
    this.baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  }

  async findSeeds() {
    console.log(`🌱 Finding seeds for: ${this.domain}`);
    
    const seeds = new Set([this.baseUrl]); // Only homepage as seed
    
    try {
      // Method 1: Try sitemap.xml
      const sitemapUrls = await this._findSitemapUrls();
      sitemapUrls.forEach(url => seeds.add(url));
      
      // Method 2: Try robots.txt
      const robotsUrls = await this._findRobotsUrls();
      robotsUrls.forEach(url => seeds.add(url));
      
      // Method 3: REMOVED - No more preset patterns!
      // Smart discovery will find actual pages from content
      
    } catch (error) {
      console.log(`⚠️ Seed discovery partially failed: ${error.message}`);
    }
    
    const seedArray = Array.from(seeds);
    console.log(`✅ Found ${seedArray.length} seed URLs (content-driven approach)`);
    
    return seedArray;
  }

  async _findSitemapUrls() {
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml',
      '/wp-sitemap.xml',
      '/sitemap/sitemap.xml'
    ];
    
    const urls = [];
    
    for (const path of sitemapPaths) {
      try {
        const sitemapUrl = new URL(path, this.baseUrl).href;
        const response = await axios.get(sitemapUrl, { 
          timeout: 5000,
          headers: { 'User-Agent': 'ChatbotScraper/1.0' }
        });
        
        // Simple XML parsing to extract URLs
        const urlMatches = response.data.match(/<loc>(.*?)<\/loc>/g) || [];
        const extractedUrls = urlMatches
          .map(match => match.replace(/<\/?loc>/g, ''))
          .filter(url => URLUtils.isSameDomain(url, this.baseUrl))
          .slice(0, 20); // Limit sitemap URLs
        
        urls.push(...extractedUrls);
        console.log(`📋 Sitemap ${path}: +${extractedUrls.length} URLs`);
        break; // Stop after first successful sitemap
        
      } catch (error) {
        // Continue to next sitemap
      }
    }
    
    return urls;
  }

  async _findRobotsUrls() {
    const urls = [];
    
    try {
      const robotsUrl = new URL('/robots.txt', this.baseUrl).href;
      const response = await axios.get(robotsUrl, { 
        timeout: 3000,
        headers: { 'User-Agent': 'ChatbotScraper/1.0' }
      });
      
      // Extract sitemap URLs from robots.txt
      const sitemapMatches = response.data.match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi) || [];
      for (const match of sitemapMatches) {
        const sitemapUrl = match.replace(/Sitemap:\s*/i, '');
        // Recursively get URLs from this sitemap
        // (simplified for now)
        console.log(`🤖 robots.txt found sitemap: ${sitemapUrl}`);
      }
      
    } catch (error) {
      // robots.txt not found - that's okay
    }
    
    return urls;
  }

  _getCommonBusinessPages() {
    const commonPaths = [
      '/about', '/about-us', '/about.html',
      '/contact', '/contact-us', '/contact.html',
      '/services', '/services.html',
      '/products', '/menu', '/menu.html',
      '/team', '/our-team',
      '/location', '/locations',
      '/hours', '/pricing'
    ];
    
    return commonPaths.map(path => new URL(path, this.baseUrl).href);
  }
}

module.exports = SeedFinder; 