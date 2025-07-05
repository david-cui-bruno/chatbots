import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    
    if (!chatbotId) {
      return new Response('Chatbot ID is required', { status: 400 });
    }

    const { data: chatbot, error } = await supabaseAdmin
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (error || !chatbot) {
      return new Response('Chatbot not found', { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Inline widget CSS and JS
    const widgetCSS = `
      /* Chatbot Widget Styles */
      .chatbot-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
      }

      .chatbot-toggle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${chatbot.settings?.color || '#667eea'} 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .chatbot-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .chatbot-toggle svg {
        width: 24px;
        height: 24px;
        fill: white;
      }

      .chatbot-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 520px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }

      .chatbot-window.open {
        display: flex;
      }

      .chatbot-header {
        background: linear-gradient(135deg, ${chatbot.settings?.color || '#667eea'} 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .chatbot-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .chatbot-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chatbot-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .message {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
      }

      .message.user {
        background: ${chatbot.settings?.color || '#667eea'};
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }

      .message.bot {
        background: #f1f3f5;
        color: #333;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
      }

      .message.typing {
        background: #f1f3f5;
        color: #666;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        font-style: italic;
      }

      .chatbot-input-area {
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 6px;
      }

      .chatbot-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #dee2e6;
        border-radius: 20px;
        outline: none;
        font-size: 13px;
        height: 36px;
      }

      .chatbot-input:focus {
        border-color: ${chatbot.settings?.color || '#667eea'};
      }

      .chatbot-send {
        padding: 8px 12px;
        background: ${chatbot.settings?.color || '#667eea'};
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.2s ease;
        height: 36px;
        min-width: 60px;
      }

      .chatbot-send:hover:not(:disabled) {
        background: #5a67d8;
      }

      .chatbot-send:disabled {
        background: #adb5bd;
        cursor: not-allowed;
      }

      @media (max-width: 480px) {
        .chatbot-window {
          width: calc(100vw - 40px);
          height: 70vh;
          bottom: 90px;
          right: 20px;
          left: 20px;
        }
      }
    `;

    const widgetJS = `
      class ChatbotWidget {
        constructor(config) {
          this.config = {
            chatbotId: config.chatbotId,
            apiUrl: config.apiUrl || '${baseUrl}',
            websiteUrl: config.websiteUrl || window.location.origin,
            title: config.title || '${chatbot.settings?.greeting || 'Chat Support'}',
            color: config.color || '${chatbot.settings?.color || '#667eea'}',
            position: config.position || '${chatbot.settings?.position || 'bottom-right'}',
            ...config
          };
          
          this.isOpen = false;
          this.messages = [];
          this.createWidget();
          this.addEventListeners();
          this.addWelcomeMessage();
        }

        createWidget() {
          this.widget = document.createElement('div');
          this.widget.className = 'chatbot-widget chatbot-' + this.config.position;
          
          this.widget.innerHTML = \`
            <button class="chatbot-toggle" id="chatbot-toggle">
              <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
            </button>
            
            <div class="chatbot-window" id="chatbot-window">
              <div class="chatbot-header">
                <h3>\${this.config.title}</h3>
                <button class="chatbot-close" id="chatbot-close">×</button>
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
          \`;
          
          document.body.appendChild(this.widget);
          
          this.toggleBtn = document.getElementById('chatbot-toggle');
          this.window = document.getElementById('chatbot-window');
          this.closeBtn = document.getElementById('chatbot-close');
          this.messagesContainer = document.getElementById('chatbot-messages');
          this.input = document.getElementById('chatbot-input');
          this.sendBtn = document.getElementById('chatbot-send');
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
        }

        toggleWidget() {
          this.isOpen = !this.isOpen;
          this.window.classList.toggle('open', this.isOpen);
          
          if (this.isOpen) {
            this.input.focus();
          }
        }

        closeWidget() {
          this.isOpen = false;
          this.window.classList.remove('open');
        }

        addWelcomeMessage() {
          this.addMessage('bot', "👋 Hi! I'm here to help you with any questions about our website. What can I help you with today?");
        }

        addMessage(sender, text) {
          const messageDiv = document.createElement('div');
          messageDiv.className = 'message ' + sender;
          messageDiv.textContent = text;
          
          this.messagesContainer.appendChild(messageDiv);
          this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
          
          this.messages.push({ sender, text, timestamp: Date.now() });
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
          
          this.addMessage('user', message);
          this.input.value = '';
          this.sendBtn.disabled = true;
          
          const typingIndicator = this.addTypingIndicator();
          
          try {
            // In preview mode, show a demo response
            setTimeout(() => {
              this.removeTypingIndicator();
              this.addMessage('bot', "This is a preview of your chatbot! In the live version, I'll provide helpful responses based on your website content.");
              this.sendBtn.disabled = false;
            }, 1500);
            
          } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator();
            this.addMessage('bot', "I'm sorry, I'm having trouble connecting right now. Please try again later.");
            this.sendBtn.disabled = false;
          }
        }

        static init(config) {
          if (typeof window !== 'undefined') {
            window.chatbotWidget = new ChatbotWidget(config);
          }
        }
      }

      // Auto-initialize for preview
      document.addEventListener('DOMContentLoaded', function() {
        ChatbotWidget.init({
          chatbotId: '${chatbot.id}',
          apiUrl: '${baseUrl}',
          websiteUrl: '${chatbot.website_url}',
          title: '${chatbot.settings?.greeting || 'Chat Support'}',
          color: '${chatbot.settings?.color || '#667eea'}',
          position: '${chatbot.settings?.position || 'bottom-right'}'
        });
      });
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chatbot Preview - ${chatbot.name}</title>
        <style>${widgetCSS}</style>
      </head>
      <body>
        <div class="preview-content" style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">Welcome to Our Website</h1>
          <p style="color: #666; line-height: 1.6;">
            This is a sample page showing how your chatbot will appear on your website. The 
            chat widget should appear in the bottom-right corner.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Try clicking on the chat icon to see your personalized chatbot in action!
          </p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Chatbot Details:</h3>
            <ul style="color: #6c757d;">
              <li><strong>Name:</strong> ${chatbot.name}</li>
              <li><strong>Website:</strong> ${chatbot.website_url}</li>
              <li><strong>Theme Color:</strong> ${chatbot.settings?.color || '#667eea'}</li>
              <li><strong>Position:</strong> ${chatbot.settings?.position || 'bottom-right'}</li>
            </ul>
          </div>
        </div>
        <script>${widgetJS}</script>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Preview error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 