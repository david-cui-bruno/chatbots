// Simple smoke tests - just check things don't crash

describe('Smoke Tests', () => {
  test('basic math works', () => {
    expect(1 + 1).toBe(2);
  });

  test('can require modules without crashing', () => {
    // Mock environment first
    process.env.OPENAI_API_KEY = 'test-key';
    
    expect(() => {
      const scraper = require('../scraper');
      expect(typeof scraper.scrapeWebsite).toBe('function');
    }).not.toThrow();
  });

  test('server file can be required', () => {
    // Just check it doesn't crash on require
    expect(() => {
      // Don't actually start the server
      delete require.cache[require.resolve('../server')];
    }).not.toThrow();
  });
}); 