const { JSDOM } = require('jsdom');
const URLUtils = require('../utils/url_utils');

class ContentExtractor {
  constructor(config = {}) {
    this.config = config;
  }

  async extract(fetchResult) {
    const { html, url } = fetchResult;
    
    try {
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Remove noise elements
      this._removeNoiseElements(document);

      // Extract metadata
      const metadata = this._extractMetadata(document, url);

      // ENHANCED: Extract business-specific content
      const content = this._extractBusinessContent(document);
      
      // ENHANCED: Extract structured business data
      const businessData = this._extractStructuredBusinessData(document);

      // Extract internal links
      const links = this._extractInternalLinks(document, url);

      const result = {
        url,
        title: metadata.title,
        content: content.text,
        contentLength: content.text.length,
        metadata: {
          ...metadata,
          businessData,
          contentQuality: content.quality,
          extractionMethod: content.method
        },
        links: links.slice(0, 50),
        extractedAt: new Date().toISOString(),
        contentHash: this._hashContent(content.text)
      };

      console.log(`📝 Extracted: ${result.title} (${result.contentLength} chars, ${result.links.length} links) [${content.method}]`);
      return result;

    } catch (error) {
      console.error(`❌ Content extraction failed for ${url}:`, error.message);
      throw error;
    }
  }

  _removeNoiseElements(document) {
    const noisySelectors = [
      'script', 'style', 'nav', 'footer', 'header',
      '.advertisement', '.ad', '.popup', '.modal',
      '.cookie-banner', '.newsletter-signup',
      '[class*="social"]', '[class*="share"]',
      '.sidebar', '.widget', '.comment', '.comments',
      '.breadcrumb', '.pagination', '.tags'
    ];

    noisySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  _extractBusinessContent(document) {
    let extractedText = '';
    const seenText = new Set();
    let extractionMethod = 'basic';

    // 1. ENHANCED: Extract from structured data first
    const structuredContent = this._extractFromStructuredData(document);
    if (structuredContent) {
      extractedText += `${structuredContent}\n\n`;
      seenText.add(structuredContent);
      extractionMethod = 'structured';
    }

    // 2. Extract meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    if (metaDescription && metaDescription.length > 20) {
      extractedText += `${metaDescription}\n\n`;
      seenText.add(metaDescription);
    }

    // 3. Extract title
    const title = document.querySelector('title')?.textContent?.trim();
    if (title && !seenText.has(title)) {
      extractedText += `${title}\n\n`;
      seenText.add(title);
    }

    // 4. ENHANCED: Business-specific content extraction
    const businessContent = this._extractBusinessSpecificContent(document, seenText);
    if (businessContent.length > 0) {
      extractedText += businessContent;
      extractionMethod = 'business-enhanced';
    }

    // 5. Enhanced content selectors (WordPress/CMS patterns)
    const enhancedSelectors = [
      // WordPress/CMS patterns
      '.entry-content', '.post-content', '.page-content',
      '.content-area', '.site-content', '.main-content',
      '.article-content', '.single-content',
      
      // Business-specific areas
      '.services', '.products', '.about-us', '.company-info',
      '.team', '.staff', '.leadership', '.bio',
      '.contact', '.contact-info', '.location',
      '.hours', '.business-hours', '.schedule',
      '.pricing', '.plans', '.packages',
      '.testimonials', '.reviews', '.feedback',
      
      // Common business page patterns
      '.hero-content', '.intro-text', '.description',
      '.feature-list', '.service-list', '.benefit-list',
      
      // Generic content areas
      'main', '[role="main"]', '.container .content',
      'article', '.page-wrapper'
    ];

    enhancedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = this._extractCleanText(element);
        if (text && text.length > 30 && !seenText.has(text)) {
          seenText.add(text);
          extractedText += `${text}\n\n`;
          if (extractionMethod === 'basic') extractionMethod = 'enhanced';
        }
      });
    });

    // 6. Extract headings with context
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const text = heading.textContent?.trim();
      if (text && text.length > 2 && !seenText.has(text)) {
        seenText.add(text);
        extractedText += `\n=== ${text} ===\n`;
      }
    });

    // 7. Extract paragraphs
    document.querySelectorAll('p').forEach(p => {
      const text = this._extractCleanText(p);
      if (text && text.length > 30 && !seenText.has(text)) {
        seenText.add(text);
        extractedText += `${text}\n\n`;
      }
    });

    // 8. Extract business information blocks
    const businessInfoContent = this._extractBusinessInformation(document, seenText);
    if (businessInfoContent) {
      extractedText += businessInfoContent;
      extractionMethod = 'business-comprehensive';
    }

    // 9. If still too short, be more aggressive
    if (extractedText.length < 500) {
      const fallbackContent = this._extractFallbackContent(document, seenText);
      if (fallbackContent) {
        extractedText += fallbackContent;
        extractionMethod = 'fallback';
      }
    }

    const quality = this._assessContentQuality(extractedText);

    return {
      text: extractedText,
      wordCount: extractedText.split(/\s+/).length,
      quality,
      method: extractionMethod
    };
  }

  _extractFromStructuredData(document) {
    let structuredContent = '';
    
    // Extract from JSON-LD structured data
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        
        // Handle different schema types
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Organization') {
          if (data.name) structuredContent += `Business: ${data.name}\n`;
          if (data.description) structuredContent += `Description: ${data.description}\n`;
          if (data.address) structuredContent += `Address: ${this._formatAddress(data.address)}\n`;
          if (data.telephone) structuredContent += `Phone: ${data.telephone}\n`;
          if (data.email) structuredContent += `Email: ${data.email}\n`;
          if (data.openingHours) structuredContent += `Hours: ${data.openingHours.join(', ')}\n`;
        }
        
        // Handle reviews/ratings
        if (data.aggregateRating) {
          structuredContent += `Rating: ${data.aggregateRating.ratingValue}/5 (${data.aggregateRating.reviewCount} reviews)\n`;
        }
        
        // Handle services
        if (data.hasOfferCatalog && data.hasOfferCatalog.itemListElement) {
          const services = data.hasOfferCatalog.itemListElement.map(item => item.name).join(', ');
          structuredContent += `Services: ${services}\n`;
        }
        
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    return structuredContent;
  }

  _extractBusinessSpecificContent(document, seenText) {
    let businessContent = '';
    
    // Extract contact information
    const contactInfo = this._extractContactInfo(document);
    if (contactInfo) {
      businessContent += `Contact Information:\n${contactInfo}\n\n`;
    }
    
    // Extract business hours
    const hours = this._extractBusinessHours(document);
    if (hours) {
      businessContent += `Business Hours:\n${hours}\n\n`;
    }
    
    // Extract services/products
    const services = this._extractServices(document);
    if (services) {
      businessContent += `Services:\n${services}\n\n`;
    }
    
    return businessContent;
  }

  _extractContactInfo(document) {
    const contactSelectors = [
      '.contact', '.contact-info', '.contact-details',
      '.address', '.location', '.phone', '.email'
    ];
    
    let contactInfo = '';
    
    contactSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = this._extractCleanText(element);
        if (text && text.length > 10) {
          // Check if it contains contact patterns
          const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
          const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
          const hasAddress = /\d+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard)/i.test(text);
          
          if (hasPhone || hasEmail || hasAddress) {
            contactInfo += `${text}\n`;
          }
        }
      });
    });
    
    return contactInfo.trim();
  }

  _extractBusinessHours(document) {
    const hourSelectors = [
      '.hours', '.business-hours', '.operating-hours',
      '.schedule', '.open-hours', '.store-hours'
    ];
    
    let hours = '';
    
    hourSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = this._extractCleanText(element);
        if (text && text.length > 10) {
          // Check if it contains day/time patterns
          const hasTimePattern = /\d{1,2}:\d{2}\s?(am|pm)/i.test(text);
          const hasDayPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i.test(text);
          
          if (hasTimePattern || hasDayPattern) {
            hours += `${text}\n`;
          }
        }
      });
    });
    
    return hours.trim();
  }

  _extractServices(document) {
    const serviceSelectors = [
      '.services', '.service-list', '.products', '.product-list',
      '.offerings', '.what-we-do', '.specialties'
    ];
    
    let services = '';
    
    serviceSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = this._extractCleanText(element);
        if (text && text.length > 20) {
          services += `${text}\n`;
        }
      });
    });
    
    return services.trim();
  }

  _extractBusinessInformation(document, seenText) {
    let businessInfo = '';
    
    // Extract from microdata
    const microdataElements = document.querySelectorAll('[itemtype*="LocalBusiness"], [itemtype*="Organization"]');
    microdataElements.forEach(element => {
      const name = element.querySelector('[itemprop="name"]')?.textContent;
      const phone = element.querySelector('[itemprop="telephone"]')?.textContent;
      const address = element.querySelector('[itemprop="address"]')?.textContent;
      const description = element.querySelector('[itemprop="description"]')?.textContent;
      
      if (name && !seenText.has(name)) {
        businessInfo += `Business Name: ${name}\n`;
        seenText.add(name);
      }
      if (phone && !seenText.has(phone)) {
        businessInfo += `Phone: ${phone}\n`;
        seenText.add(phone);
      }
      if (address && !seenText.has(address)) {
        businessInfo += `Address: ${address}\n`;
        seenText.add(address);
      }
      if (description && !seenText.has(description)) {
        businessInfo += `Description: ${description}\n`;
        seenText.add(description);
      }
    });
    
    return businessInfo;
  }

  _extractStructuredBusinessData(document) {
    const businessData = {
      name: null,
      description: null,
      address: null,
      phone: null,
      email: null,
      hours: null,
      services: [],
      type: null
    };
    
    // Extract from JSON-LD
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Organization') {
          businessData.name = data.name || businessData.name;
          businessData.description = data.description || businessData.description;
          businessData.address = data.address || businessData.address;
          businessData.phone = data.telephone || businessData.phone;
          businessData.email = data.email || businessData.email;
          businessData.hours = data.openingHours || businessData.hours;
          businessData.type = data['@type'];
          
          if (data.hasOfferCatalog && data.hasOfferCatalog.itemListElement) {
            businessData.services = data.hasOfferCatalog.itemListElement.map(item => item.name);
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    return businessData;
  }

  _extractFallbackContent(document, seenText) {
    const allText = document.body?.textContent?.trim() || '';
    if (allText.length > 200) {
      const cleanText = allText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      if (!seenText.has(cleanText)) {
        return cleanText;
      }
    }
    return null;
  }

  _extractCleanText(element) {
    if (!element) return '';
    
    const text = element.textContent?.trim() || '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  _formatAddress(address) {
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      return `${address.streetAddress || ''} ${address.addressLocality || ''} ${address.addressRegion || ''} ${address.postalCode || ''}`.trim();
    }
    return '';
  }

  _assessContentQuality(text) {
    const wordCount = text.split(/\s+/).length;
    const hasContactInfo = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) || 
                          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
    const hasBusinessKeywords = /(service|product|hour|contact|about|team|staff|price|location)/i.test(text);
    
    if (wordCount > 500 && hasContactInfo && hasBusinessKeywords) return 'high';
    if (wordCount > 200 && (hasContactInfo || hasBusinessKeywords)) return 'medium';
    if (wordCount > 100) return 'low';
    return 'poor';
  }

  _extractMetadata(document, url) {
    return {
      title: this._getTitle(document),
      description: this._getMetaContent(document, 'description'),
      author: this._getMetaContent(document, 'author'),
      language: document.documentElement.lang || 'en',
      canonicalUrl: this._getCanonicalUrl(document, url),
      headings: this._extractHeadings(document),
      businessType: this._detectBusinessType(document)
    };
  }

  _detectBusinessType(document) {
    const businessKeywords = {
      'restaurant': ['menu', 'food', 'dining', 'restaurant', 'cuisine'],
      'retail': ['shop', 'store', 'product', 'buy', 'sale'],
      'service': ['service', 'consultation', 'appointment', 'professional'],
      'healthcare': ['doctor', 'medical', 'health', 'clinic', 'hospital'],
      'legal': ['lawyer', 'attorney', 'legal', 'law', 'counsel'],
      'real-estate': ['realtor', 'property', 'real estate', 'homes', 'listing']
    };
    
    const pageText = document.body?.textContent?.toLowerCase() || '';
    
    for (const [type, keywords] of Object.entries(businessKeywords)) {
      if (keywords.some(keyword => pageText.includes(keyword))) {
        return type;
      }
    }
    
    return 'general';
  }

  _extractInternalLinks(document, baseUrl) {
    const links = [];
    const linkElements = document.querySelectorAll('a[href]');

    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      if (href && URLUtils.isInternalLink(href, baseUrl)) {
        try {
          const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
          const canonical = URLUtils.canonicalize(fullUrl);
          if (canonical && !links.includes(canonical)) {
            links.push(canonical);
          }
        } catch (error) {
          // Skip invalid URLs
        }
      }
    });

    return links;
  }

  _getTitle(document) {
    return document.querySelector('title')?.textContent?.trim() ||
           document.querySelector('h1')?.textContent?.trim() ||
           'Untitled';
  }

  _getMetaContent(document, name) {
    const meta = document.querySelector(`meta[name="${name}"]`) ||
                 document.querySelector(`meta[property="og:${name}"]`);
    return meta?.getAttribute('content') || '';
  }

  _getCanonicalUrl(document, fallbackUrl) {
    const canonical = document.querySelector('link[rel="canonical"]');
    return canonical?.getAttribute('href') || fallbackUrl;
  }

  _extractHeadings(document) {
    const headings = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headingElements.forEach(heading => {
      const text = heading.textContent.trim();
      if (text) {
        headings.push({
          level: parseInt(heading.tagName.charAt(1)),
          text: text
        });
      }
    });

    return headings.slice(0, 10); // Limit headings
  }

  _hashContent(content) {
    return require('crypto').createHash('sha256').update(content).digest('hex').substring(0, 12);
  }
}

module.exports = ContentExtractor; 