class ChatbotWidget {
  constructor(config) {
    this.config = {
      chatbotId: config.chatbotId,
      apiUrl: config.apiUrl || 'http://localhost:3001',
      title: config.title || 'Chat Support',
      color: config.color || '#667eea',
      position: config.position || 'bottom-right',
      greeting: config.greeting || 'Hi! How can I help you today?',
      ...config
    };
    
    this.isOpen = false;
    this.messages = [];
    this.sessionId = this.generateSessionId();
    
    console.log('🤖 ChatbotWidget initializing with config:', this.config);
    
    // Load chatbot configuration first, then create widget
    this.loadConfig().then(() => {
      this.createWidget();
      this.addEventListeners();
      this.addWelcomeMessage();
    }).catch(error => {
      console.error('Failed to initialize chatbot:', error);
      // Create widget anyway with default config
      this.createWidget();
      this.addEventListeners();
      this.addWelcomeMessage();
    });
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async loadConfig() {
    if (!this.config.chatbotId) {
      console.warn('No chatbotId provided, using default config');
      return;
    }
    
    try {
      console.log(`🔧 Loading config for chatbot: ${this.config.chatbotId}`);
      const response = await fetch(`${this.config.apiUrl}/api/chatbot/${this.config.chatbotId}/config`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.config) {
        // Merge loaded config with initial config
        this.config = { ...this.config, ...data.config };
        console.log('✅ Chatbot config loaded:', this.config);
      } else {
        console.warn('Invalid config response:', data);
      }
    } catch (error) {
      console.error('Failed to load chatbot config:', error);
      // Continue with default config
    }
  }

  createWidget() {
    console.log('🎨 Creating widget with position:', this.config.position);
    
    // Create main widget container
    this.widget = document.createElement('div');
    this.widget.className = `chatbot-widget chatbot-${this.config.position}`;
    
    // Apply custom color
    const style = document.createElement('style');
    style.textContent = `
      .chatbot-widget .chatbot-toggle {
        background: ${this.config.color} !important;
      }
      .chatbot-widget .chatbot-header {
        background: ${this.config.color} !important;
      }
      .chatbot-widget .chatbot-send {
        background: ${this.config.color} !important;
      }
      .chatbot-widget .message.user {
        background: ${this.config.color} !important;
      }
    `;
    document.head.appendChild(style);
    
    this.widget.innerHTML = `
      <button class="chatbot-toggle" id="chatbot-toggle" title="Open chat">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>
      
      <div class="chatbot-window" id="chatbot-window">
        <div class="chatbot-header">
          <h3>${this.config.title}</h3>
          <button class="chatbot-close" id="chatbot-close" title="Close chat">×</button>
        </div>
        
        <div class="chatbot-messages" id="chatbot-messages"></div>
        
        <div class="chatbot-input-area">
          <input 
            type="text" 
            class="chatbot-input" 
            id="chatbot-input" 
            placeholder="Type your message..."
            maxlength="500"
          >
          <button class="chatbot-send" id="chatbot-send">Send</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.widget);
    
    // Get references to elements
    this.toggleBtn = document.getElementById('chatbot-toggle');
    this.window = document.getElementById('chatbot-window');
    this.closeBtn = document.getElementById('chatbot-close');
    this.messagesContainer = document.getElementById('chatbot-messages');
    this.input = document.getElementById('chatbot-input');
    this.sendBtn = document.getElementById('chatbot-send');
    
    console.log('✅ Widget created successfully');
  }

  addEventListeners() {
    this.toggleBtn.addEventListener('click', () => this.toggleWidget());
    this.closeBtn.addEventListener('click', () => this.closeWidget());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    console.log('✅ Event listeners added');
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    this.window.classList.toggle('open', this.isOpen);
    
    if (this.isOpen) {
      this.input.focus();
      console.log('💬 Chat widget opened');
    } else {
      console.log('💬 Chat widget closed');
    }
  }

  closeWidget() {
    this.isOpen = false;
    this.window.classList.remove('open');
    console.log('💬 Chat widget closed');
  }

  addWelcomeMessage() {
    const greeting = this.config.greeting || "👋 Hi! I'm here to help you with any questions. What can I help you with today?";
    this.addMessage('bot', greeting);
    console.log('👋 Welcome message added');
  }

  addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    const messageData = { sender, text, timestamp: Date.now() };
    this.messages.push(messageData);
    
    console.log(`📝 Message added:`, messageData);
  }

  addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.textContent = 'Thinking...';
    
    this.messagesContainer.appendChild(typingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    return typingDiv;
  }

  removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;
    
    console.log(`📤 Sending message: ${message}`);
    
    // Add user message
    this.addMessage('user', message);
    this.input.value = '';
    
    // Disable send button and input
    this.sendBtn.disabled = true;
    this.input.disabled = true;
    
    // Show typing indicator
    const typingIndicator = this.addTypingIndicator();
    
    try {
      // Prepare request payload
      const payload = {
        message: message,
        chatbotId: this.config.chatbotId,
        sessionId: this.sessionId,
        websiteUrl: window.location.origin
      };
      
      console.log('📡 Sending request to:', `${this.config.apiUrl}/api/chat`);
      console.log('📡 Payload:', payload);
      
      // Call chatbot API
      const response = await fetch(`${this.config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📡 Response data:', data);
      
      this.removeTypingIndicator();
      
      if (data.success && data.response) {
        this.addMessage('bot', data.response);
        
        // Track the conversation
        this.trackConversation(message, data.response);
      } else {
        this.addMessage('bot', "I'm sorry, I'm having trouble right now. Please try again later.");
      }
      
    } catch (error) {
      console.error('💥 Chat error:', error);
      this.removeTypingIndicator();
      this.addMessage('bot', "I'm sorry, I'm having trouble connecting right now. Please try again later.");
    }
    
    // Re-enable send button and input
    this.sendBtn.disabled = false;
    this.input.disabled = false;
    this.input.focus();
  }

  async trackConversation(userMessage, botResponse) {
    if (!this.config.chatbotId) return;
    
    try {
      await fetch(`${this.config.apiUrl}/api/chatbot/${this.config.chatbotId}/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          bot_response: botResponse,
          session_id: this.sessionId
        })
      });
    } catch (error) {
      console.error('Failed to track conversation:', error);
    }
  }

  // Static method to initialize the widget
  static init(config) {
    console.log('🚀 ChatbotWidget.init called with config:', config);
    
    if (!config) {
      console.error('❌ No config provided to ChatbotWidget.init');
      return;
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, creating ChatbotWidget');
        new ChatbotWidget(config);
      });
    } else {
      console.log('📄 DOM already loaded, creating ChatbotWidget immediately');
      new ChatbotWidget(config);
    }
  }
}

// Make it available globally
window.ChatbotWidget = ChatbotWidget;

console.log('✅ ChatbotWidget script loaded');
