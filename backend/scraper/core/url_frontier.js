const URLUtils = require('../utils/url_utils');

class URLFrontier {
  constructor(domain, config = {}) {
    this.domain = domain;
    this.config = config;
    
    // Priority queue: higher priority = processed first
    this.queue = new Map(); // url -> priority
    this.visited = new Set();
    this.processing = new Set();
    
    console.log(`🗃️ URL Frontier initialized for domain: ${domain}`);
  }

  async enqueue(urls) {
    if (!Array.isArray(urls)) urls = [urls];
    
    let addedCount = 0;
    
    for (const url of urls) {
      const canonical = URLUtils.canonicalize(url);
      
      if (!canonical || 
          !URLUtils.isValidURL(canonical) || 
          !URLUtils.isSameDomain(canonical, this.domain) ||
          this.visited.has(canonical) ||
          this.queue.has(canonical)) {
        continue;
      }
      
      const priority = this._calculatePriority(canonical);
      this.queue.set(canonical, priority);
      addedCount++;
    }
    
    if (addedCount > 0) {
      console.log(`➕ Enqueued ${addedCount} URLs (total: ${this.queue.size})`);
    }
    
    return addedCount;
  }

  async dequeue(count = 1) {
    const results = [];
    
    // Sort by priority (higher first)
    const sortedEntries = [...this.queue.entries()]
      .filter(([url]) => !this.processing.has(url))
      .sort(([,a], [,b]) => b - a)
      .slice(0, count);
    
    for (const [url, priority] of sortedEntries) {
      this.queue.delete(url);
      this.visited.add(url);
      this.processing.add(url);
      results.push(url);
    }
    
    if (results.length > 0) {
      console.log(`⬆️ Dequeued ${results.length} URLs for processing`);
    }
    
    return results;
  }

  markComplete(url) {
    this.processing.delete(url);
  }

  markFailed(url) {
    this.processing.delete(url);
    // Could implement retry logic here
  }

  getStats() {
    return {
      queued: this.queue.size,
      visited: this.visited.size,
      processing: this.processing.size,
      total_discovered: this.visited.size + this.queue.size
    };
  }

  isEmpty() {
    return this.queue.size === 0;
  }

  _calculatePriority(url) {
    const urlLower = url.toLowerCase();
    
    // Homepage gets highest priority
    const pathSegments = new URL(url).pathname.split('/').filter(s => s);
    if (pathSegments.length === 0) return 100;
    
    // Business pages get high priority
    const highPriorityKeywords = [
      'about', 'contact', 'services', 'menu', 'products'
    ];
    
    for (const keyword of highPriorityKeywords) {
      if (urlLower.includes(keyword)) return 90;
    }
    
    // Content pages get medium priority
    if (urlLower.includes('blog') || urlLower.includes('news')) return 50;
    
    // Everything else gets low priority
    return 10;
  }
}

module.exports = URLFrontier; 