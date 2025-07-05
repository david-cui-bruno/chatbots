const SeedFinder = require('./core/seed_finder');
const URLFrontier = require('./core/url_frontier');
const PageFetcher = require('./core/page_fetcher');
const ContentExtractor = require('./core/content_extractor');
const config = require('./config/scraper_config');
const SmartDiscovery = require('./core/smart_discovery');

class ComprehensiveScraper {
  constructor(domain, options = {}) {
    this.domain = domain;
    this.config = { ...config, ...options };
    
    // Initialize components
    this.seedFinder = new SeedFinder(domain, this.config);
    this.frontier = new URLFrontier(domain, this.config);
    this.fetcher = new PageFetcher(this.config);
    this.extractor = new ContentExtractor(this.config);
    this.smartDiscovery = new SmartDiscovery(domain);
    
    // Track overall progress
    this.stats = {
      discovered: 0,
      crawled: 0,
      successful: 0,
      failed: 0,
      startTime: Date.now(),
      pages: []
    };
    
    console.log(`🚀 Comprehensive Scraper initialized for: ${domain}`);
  }

  async crawl() {
    try {
      console.log(`\n🌐 Starting comprehensive crawl of ${this.domain}`);
      console.log(`⚙️ Config: ${this.config.maxPages} pages, ${this.config.maxTime/1000}s timeout`);
      
      // Phase 1: Seed Discovery
      await this._seedDiscovery();
      
      // Phase 2: Main Crawling Loop
      await this._crawlLoop();
      
      // Phase 3: Finalization
      await this._finalize();
      
      return this._getResults();
      
    } catch (error) {
      console.error(`❌ Crawl failed: ${error.message}`);
      await this._cleanup();
      throw error;
    }
  }

  async _seedDiscovery() {
    console.log(`\n🌱 Phase 1: Seed Discovery`);
    
    const seeds = await this.seedFinder.findSeeds();
    const enqueued = await this.frontier.enqueue(seeds);
    
    this.stats.discovered += enqueued;
    console.log(`✅ Phase 1 complete: ${enqueued} seeds enqueued`);
  }

  async _crawlLoop() {
    console.log(`\n🔄 Phase 2: Main Crawling Loop`);
    
    const maxPages = this.config.maxPages;
    const startTime = Date.now();
    const maxTime = this.config.maxTime;
    
    while (this.stats.crawled < maxPages && !this.frontier.isEmpty()) {
      // Check time limit
      if (Date.now() - startTime > maxTime) {
        console.log(`⏰ Time limit reached (${maxTime/1000}s)`);
        break;
      }
      
      // Get batch of URLs to process
      const batch = await this.frontier.dequeue(this.config.batchSize);
      if (batch.length === 0) break;
      
      // Process batch
      const results = await this._processBatch(batch);
      
      // Update stats
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          this.stats.successful++;
          this.stats.pages.push(result.value);
          
          // Discover new URLs from this page
          if (result.value.links && result.value.links.length > 0) {
            const newUrls = await this.frontier.enqueue(result.value.links);
            this.stats.discovered += newUrls;
          }
        } else {
          this.stats.failed++;
          console.log(`❌ Page failed: ${result.reason?.message || 'Unknown error'}`);
        }
      }
      
      this.stats.crawled += batch.length;
      
      // Progress update
      if (this.stats.crawled % 5 === 0) {
        this._logProgress();
      }
      
      // Mark URLs as complete in frontier
      batch.forEach(url => this.frontier.markComplete(url));
    }
    
    console.log(`✅ Phase 2 complete: ${this.stats.successful}/${this.stats.crawled} pages successful`);
  }

  async _processBatch(urls) {
    console.log(`📦 Processing batch of ${urls.length} URLs`);
    
    const promises = urls.map(url => this._processPage(url));
    const results = await Promise.allSettled(promises);
    
    return results;
  }

  async _processPage(url) {
    try {
      console.log(`📄 Processing: ${url}`);
      
      // Step 1: Fetch page
      const fetchResult = await this.fetcher.fetch(url);
      
      // Step 2: Extract content
      const extractResult = await this.extractor.extract(fetchResult);
      
      // Step 3: SMART DISCOVERY - Use actual page content to find more URLs
      const smartUrls = await this.smartDiscovery.discoverFromActualContent(fetchResult);
      
      // Add discovered URLs to frontier
      if (smartUrls.length > 0) {
        const newUrls = await this.frontier.enqueue(smartUrls);
        this.stats.discovered += newUrls;
      }
      
      // Step 4: Combine results
      const pageResult = {
        ...extractResult,
        fetchedAt: fetchResult.fetchedAt,
        renderMethod: fetchResult.renderMethod,
        status: fetchResult.status,
        smartUrls: smartUrls.slice(0, 10) // Include top discoveries
      };
      
      return pageResult;
      
    } catch (error) {
      this.frontier.markFailed(url);
      throw new Error(`Failed to process ${url}: ${error.message}`);
    }
  }

  async _finalize() {
    console.log(`\n🏁 Phase 3: Finalization`);
    await this.fetcher.close();
    console.log(`✅ Phase 3 complete: Cleanup finished`);
  }

  async _cleanup() {
    try {
      await this.fetcher.close();
    } catch (error) {
      console.error(`⚠️ Cleanup error: ${error.message}`);
    }
  }

  _logProgress() {
    const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
    const rate = Math.round((this.stats.successful / duration) * 100) / 100;
    const frontierStats = this.frontier.getStats();
    
    console.log(`📊 Progress: ${this.stats.successful}/${this.stats.crawled} successful, ${frontierStats.queued} queued, ${rate} pages/sec`);
  }

  _getResults() {
    const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
    const totalContent = this.stats.pages.reduce((sum, page) => sum + (page.contentLength || 0), 0);
    
    // Combine all content
    const combinedContent = this.stats.pages
      .map(page => `=== ${page.title} ===\n${page.content}`)
      .join('\n\n---\n\n');
    
    return {
      url: this.domain,
      timestamp: new Date().toISOString(),
      content: combinedContent,
      contentLength: combinedContent.length,
      
      // Individual pages
      pages: this.stats.pages,
      
      // Statistics
      pages_scraped: this.stats.successful,
      total_content_length: totalContent,
      
      // Comprehensive stats
      comprehensive_stats: {
        total_discovered: this.stats.discovered,
        successfully_scraped: this.stats.successful,
        failed_pages: this.stats.failed,
        coverage_percentage: this.stats.discovered > 0 ? 
          Math.round((this.stats.successful / this.stats.discovered) * 100) : 0,
        scraping_efficiency: duration > 0 ? 
          Math.round((this.stats.successful / duration) * 100) / 100 : 0,
        average_page_size: this.stats.successful > 0 ? 
          Math.round(totalContent / this.stats.successful) : 0
      },
      
      // Performance stats
      scrapeStats: {
        totalPagesAttempted: this.stats.crawled,
        successfulPages: this.stats.successful,
        failedPages: this.stats.failed,
        scrapeDuration: duration
      }
    };
  }
}

module.exports = ComprehensiveScraper; 