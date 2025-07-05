const { URL } = require('url');

class URLUtils {
  static canonicalize(url) {
    try {
      const parsed = new URL(url);
      
      // Remove fragment
      parsed.hash = '';
      
      // Normalize query parameters (sort them)
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams();
      
      // Sort parameters for consistency
      [...params.keys()].sort().forEach(key => {
        sortedParams.append(key, params.get(key));
      });
      
      parsed.search = sortedParams.toString();
      
      // Convert to lowercase for consistency
      return parsed.toString().toLowerCase();
    } catch (error) {
      return null;
    }
  }

  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isSameDomain(url1, url2) {
    try {
      const domain1 = new URL(url1).hostname.replace(/^www\./, '');
      const domain2 = new URL(url2).hostname.replace(/^www\./, '');
      return domain1 === domain2;
    } catch {
      return false;
    }
  }

  static extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  static isInternalLink(href, baseUrl) {
    if (!href) return false;
    
    try {
      // Handle relative URLs
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      return this.isSameDomain(fullUrl, baseUrl);
    } catch {
      return false;
    }
  }
}

module.exports = URLUtils; 