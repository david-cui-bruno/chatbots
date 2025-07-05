const URLUtils = require('../utils/url_utils');

class SmartDiscovery {
  constructor(domain) {
    this.domain = domain;
    this.discoveredPatterns = new Set();
  }

  async discoverFromActualContent(fetchResult) {
    const { html, url } = fetchResult;
    const dom = new (require('jsdom')).JSDOM(html, { url });
    const document = dom.window.document;

    const discoveredUrls = new Set();

    // Method 1: Navigation-based discovery (most reliable)
    this._discoverFromNavigation(document, url, discoveredUrls);
    
    // Method 2: Content-based discovery
    this._discoverFromContentAreas(document, url, discoveredUrls);
    
    // Method 3: Footer links (often contain important pages)
    this._discoverFromFooter(document, url, discoveredUrls);
    
    // Method 4: Smart content filtering
    const prioritizedUrls = this._prioritizeByContent(Array.from(discoveredUrls), document);
    
    console.log(`🎯 Smart discovery found ${prioritizedUrls.length} prioritized URLs`);
    return prioritizedUrls.slice(0, 20); // Limit to top 20
  }

  _discoverFromNavigation(document, baseUrl, discoveredUrls) {
    // Cast wider net for navigation
    const navSelectors = [
      'nav a[href]',
      '.navigation a[href]', 
      '.navbar a[href]',
      '.menu a[href]',
      '.header a[href]',
      '[role="navigation"] a[href]',
      'header a[href]',  // Add direct header links
      '.nav a[href]'     // Add class-based nav
    ];

    let navCount = 0;
    navSelectors.forEach(selector => {
      const links = document.querySelectorAll(selector);
      console.log(`   🔍 Checking ${selector}: ${links.length} links found`);
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim().toLowerCase();
        
        console.log(`      Link: "${text}" → ${href}`);
        
        // Skip utility links
        if (this._isUtilityLink(text, href)) {
          console.log(`      ❌ Skipped utility link: ${text}`);
          return;
        }
        
        const fullUrl = this._resolveURL(href, baseUrl);
        if (fullUrl && URLUtils.isSameDomain(fullUrl, baseUrl)) {
          discoveredUrls.add(fullUrl);
          navCount++;
          console.log(`      ✅ Added: ${fullUrl}`);
        }
      });
    });

    console.log(`🧭 Navigation discovery: +${navCount} URLs`);
  }

  _discoverFromContentAreas(document, baseUrl, discoveredUrls) {
    const contentSelectors = [
      'main a[href]',
      '[role="main"] a[href]',
      '.content a[href]',
      '.main-content a[href]',
      'article a[href]'
    ];

    let contentCount = 0;
    contentSelectors.forEach(selector => {
      const links = document.querySelectorAll(selector);
      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        
        // Prioritize content-rich links
        if (text.length > 5 && text.length < 100) {
          const fullUrl = this._resolveURL(href, baseUrl);
          if (fullUrl && URLUtils.isSameDomain(fullUrl, baseUrl)) {
            discoveredUrls.add(fullUrl);
            contentCount++;
          }
        }
      });
    });

    console.log(`📄 Content area discovery: +${contentCount} URLs`);
  }

  _discoverFromFooter(document, baseUrl, discoveredUrls) {
    const footerLinks = document.querySelectorAll('footer a[href], .footer a[href]');
    
    let footerCount = 0;
    footerLinks.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim().toLowerCase();
      
      // Footer often has important business pages
      const importantFooterKeywords = [
        'about', 'contact', 'privacy', 'terms', 'help', 'support', 
        'careers', 'team', 'company', 'story', 'mission'
      ];
      
      if (importantFooterKeywords.some(keyword => text.includes(keyword))) {
        const fullUrl = this._resolveURL(href, baseUrl);
        if (fullUrl && URLUtils.isSameDomain(fullUrl, baseUrl)) {
          discoveredUrls.add(fullUrl);
          footerCount++;
        }
      }
    });

    console.log(`🦶 Footer discovery: +${footerCount} URLs`);
  }

  _prioritizeByContent(urls, document) {
    return urls
      .map(url => {
        const priority = this._calculateContentPriority(url, document);
        const path = new URL(url).pathname;
        return { url, priority, path };
      })
      .sort((a, b) => b.priority - a.priority)
      .map(item => {
        console.log(`   Priority ${item.priority}: ${item.path}`);
        return item.url;
      });
  }

  _calculateContentPriority(url, document) {
    const path = new URL(url).pathname.toLowerCase();
    let priority = 1;

    // Find the actual link element
    const possibleSelectors = [
      `a[href="${url}"]`,
      `a[href*="${path}"]`,
      `a[href$="${path}"]`
    ];

    let link = null;
    for (const selector of possibleSelectors) {
      link = document.querySelector(selector);
      if (link) break;
    }

    if (link) {
      const linkText = link.textContent.trim().toLowerCase();
      
      // High priority keywords (more specific matching)
      const highPriorityKeywords = [
        'about', 'who we are', 'our story', 'company',
        'contact', 'get in touch', 'reach us',
        'services', 'what we do', 'offerings',
        'products', 'solutions', 'portfolio',
        'team', 'our team', 'staff', 'people',
        'docs', 'documentation', 'guide',
        'pricing', 'plans', 'features'
      ];
      
      for (const keyword of highPriorityKeywords) {
        if (linkText.includes(keyword)) {
          priority += 50;
          console.log(`   🎯 High priority keyword "${keyword}" found in "${linkText}"`);
          break;
        }
      }

      // Check if link is in navigation
      let parent = link.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const tagName = parent.tagName?.toLowerCase();
        const className = parent.className?.toLowerCase() || '';
        
        if (tagName === 'nav' || 
            className.includes('nav') || 
            className.includes('menu') ||
            className.includes('header')) {
          priority += 30;
          console.log(`   🧭 Navigation link found: "${linkText}"`);
          break;
        }
        parent = parent.parentElement;
        depth++;
      }

      // Check path-based priority
      if (path.includes('doc') || path.includes('guide')) priority += 25;
      if (path.includes('pricing') || path.includes('plan')) priority += 25;
      if (path.includes('feature')) priority += 20;
    }

    // Penalize utility pages
    const utilityKeywords = ['login', 'register', 'cart', 'checkout', 'search', 'rss'];
    if (utilityKeywords.some(keyword => path.includes(keyword))) {
      priority -= 30;
    }

    console.log(`   📊 ${path} → Priority: ${priority} (${link ? 'link found' : 'no link'})`);
    return priority;
  }

  _isUtilityLink(text, href) {
    const utilityPatterns = [
      'login', 'sign in', 'register', 'cart', 'checkout',
      'search', 'rss', 'xml', 'api', 'admin'
    ];
    
    return utilityPatterns.some(pattern => 
      text.includes(pattern) || (href && href.includes(pattern))
    );
  }

  _resolveURL(href, baseUrl) {
    try {
      if (href.startsWith('http')) return href;
      if (href.startsWith('/')) return new URL(href, baseUrl).href;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }
}

module.exports = SmartDiscovery; 