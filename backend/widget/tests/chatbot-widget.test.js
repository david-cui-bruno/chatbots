/**
 * @jest-environment jsdom
 */
const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Load the widget
require('../chatbot-widget.js');

describe('ChatbotWidget', () => {
  
  // WHY: Ensures the widget initializes without errors in browser environment
  // Critical for successful website integration
  test('should initialize widget with default configuration', () => {
    const config = {
      chatbotId: 'test-id',
      apiUrl: 'https://test.com',
      websiteUrl: 'https://client.com'
    };

    const widget = new window.ChatbotWidget(config);
    
    expect(widget).toBeDefined();
    expect(widget.config.chatbotId).toBe('test-id');
    expect(widget.isOpen).toBe(false);
  });

  // WHY: Validates that the widget creates necessary DOM elements
  // Ensures the chat interface renders correctly on websites
  test('should create widget DOM elements', () => {
    const config = { chatbotId: 'test-id' };
    const widget = new window.ChatbotWidget(config);

    // Should create the main widget container
    const widgetElement = document.querySelector('.chatbot-widget');
    expect(widgetElement).toBeTruthy();

    // Should create toggle button
    const toggleButton = document.querySelector('.chatbot-toggle');
    expect(toggleButton).toBeTruthy();

    // Should create chat window (initially hidden)
    const chatWindow = document.querySelector('.chatbot-window');
    expect(chatWindow).toBeTruthy();
  });

  // WHY: Tests the core interaction mechanism for opening/closing chat
  // Essential for user experience and widget functionality
  test('should toggle chat window visibility', () => {
    const config = { chatbotId: 'test-id' };
    const widget = new window.ChatbotWidget(config);

    const chatWindow = document.querySelector('.chatbot-window');
    
    // Initially closed
    expect(widget.isOpen).toBe(false);
    expect(chatWindow.classList.contains('open')).toBe(false);

    // Toggle open
    widget.toggleWidget();
    expect(widget.isOpen).toBe(true);
    expect(chatWindow.classList.contains('open')).toBe(true);

    // Toggle closed
    widget.toggleWidget();
    expect(widget.isOpen).toBe(false);
    expect(chatWindow.classList.contains('open')).toBe(false);
  });

  // WHY: Ensures messages are properly added to the chat interface
  // Core functionality for displaying conversation history
  test('should add messages to chat interface', () => {
    const config = { chatbotId: 'test-id' };
    const widget = new window.ChatbotWidget(config);

    widget.addMessage('user', 'Hello');
    widget.addMessage('bot', 'Hi there!');

    const messages = document.querySelectorAll('.message');
    expect(messages.length).toBe(3); // Including welcome message

    const userMessage = document.querySelector('.message.user');
    const botMessage = document.querySelector('.message.bot');
    
    expect(userMessage.textContent).toBe('Hello');
    expect(botMessage.textContent).toContain('Hi there!');
  });

  // WHY: Validates the typing indicator provides visual feedback
  // Improves user experience during API response delays
  test('should show and remove typing indicator', () => {
    const config = { chatbotId: 'test-id' };
    const widget = new window.ChatbotWidget(config);

    // Add typing indicator
    widget.addTypingIndicator();
    let typingElement = document.querySelector('.message.typing');
    expect(typingElement).toBeTruthy();
    expect(typingElement.textContent).toBe('Thinking...');

    // Remove typing indicator
    widget.removeTypingIndicator();
    typingElement = document.querySelector('.message.typing');
    expect(typingElement).toBeFalsy();
  });

  // WHY: Tests custom styling configuration applies correctly
  // Ensures brand consistency when embedded on different websites
  test('should apply custom colors and positioning', () => {
    const config = {
      chatbotId: 'test-id',
      color: '#ff0000',
      position: 'bottom-left'
    };

    const widget = new window.ChatbotWidget(config);
    
    expect(widget.config.color).toBe('#ff0000');
    expect(widget.config.position).toBe('bottom-left');

    const widgetElement = document.querySelector('.chatbot-widget');
    expect(widgetElement.classList.contains('chatbot-bottom-left')).toBe(true);
  });
}); 