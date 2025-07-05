const axios = require('axios');
const Bottleneck = require('bottleneck');

class PageFetcher {
  constructor(config = {}) {
    this.config = {
      requestDelay: config.requestDelay || 1000,
      maxConcurrent: config.maxConcurrent || 2,
      timeout: config.timeout || 15000,
      maxRedirects: config.maxRedirects || 5,
      userAgent: config.userAgent || 'ChatbotScraper/1.0 (+https://yoursite.com/bot)',
      ...config
    };

    this.limiter = new Bottleneck({
      minTime: this.config.requestDelay,
      maxConcurrent: this.config.maxConcurrent
    });

    this.stats = {
      successful: 0,
      failed: 0,
      total: 0,
      js_sites_detected: 0
    };

    console.log(`🌐 Page Fetcher initialized (${this.config.requestDelay}ms delay, ${this.config.maxConcurrent} concurrent)`);
  }

  async fetch(url) {
    return this.limiter.schedule(() => this._fetchWithRetry(url));
  }

  async _fetchWithRetry(url, attempt = 1) {
    const maxAttempts = 3;
    
    try {
      this.stats.total++;
      console.log(`📄 [${attempt}/${maxAttempts}] Fetching: ${url}`);
      
      const response = await axios.get(url, {
        timeout: this.config.timeout,
        maxRedirects: this.config.maxRedirects,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache'
        }
      });

      this.stats.successful++;
      
      // Check if this is a JavaScript-heavy site
      const isJsSite = this._detectJavaScriptSite(response.data);
      if (isJsSite) {
        this.stats.js_sites_detected++;
        console.log(`⚠️ JavaScript site detected: ${url}`);
      }
      
      const result = {
        url: response.request.res.responseUrl || url,
        originalUrl: url,
        html: response.data,
        status: response.status,
        headers: response.headers,
        contentLength: response.data.length,
        renderMethod: isJsSite ? 'javascript-detected' : 'static',
        fetchedAt: new Date().toISOString(),
        attempt,
        isJavaScriptSite: isJsSite
      };

      console.log(`✅ Success: ${url} (${result.contentLength} chars) ${isJsSite ? '[JS-SITE]' : ''}`);
      return result;

    } catch (error) {
      console.log(`❌ [${attempt}/${maxAttempts}] Failed: ${url} - ${error.message}`);
      
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, attempt + 1);
      }
      
      this.stats.failed++;
      throw new Error(`Failed to fetch ${url} after ${maxAttempts} attempts: ${error.message}`);
    }
  }

  _detectJavaScriptSite(html) {
    const jsIndicators = [
      'javascript must be enabled',
      'javascript is required',
      'please enable javascript',
      'noscript',
      'loading...',
      'react-root',
      'vue-app',
      'angular-app',
      'app-root',
      'spa-app'
    ];

    const htmlLower = html.toLowerCase();
    return jsIndicators.some(indicator => htmlLower.includes(indicator));
  }

  getStats() {
    return {
      ...this.stats,
      success_rate: this.stats.total > 0 ? Math.round((this.stats.successful / this.stats.total) * 100) : 0
    };
  }

  async close() {
    console.log(`🔒 Page Fetcher closed. Final stats:`, this.getStats());
  }
}

module.exports = PageFetcher; 