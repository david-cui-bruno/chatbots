import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatbotId = searchParams.get('id');
  
  if (!chatbotId) {
    return new NextResponse('Missing chatbot ID', { status: 400 });
  }

  try {
    // Get chatbot config
    const { data: chatbot } = await supabaseAdmin
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .eq('is_active', true)
      .single();

    if (!chatbot) {
      return new NextResponse('// Chatbot not found', { 
        headers: { 'Content-Type': 'application/javascript' }
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Generate self-configuring widget script
    const widgetScript = `
(function() {
  // Auto-load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '${baseUrl}/widget/chatbot-widget.css';
  document.head.appendChild(link);
  
  // Auto-load and init widget
  const script = document.createElement('script');
  script.src = '${baseUrl}/widget/chatbot-widget.js';
  script.onload = function() {
    ChatbotWidget.init({
      chatbotId: '${chatbot.id}',
      apiUrl: '${baseUrl}',
      websiteUrl: '${chatbot.website_url}',
      title: '${chatbot.settings?.greeting || 'Chat Support'}',
      color: '${chatbot.settings?.color || '#667eea'}',
      position: '${chatbot.settings?.position || 'bottom-right'}'
    });
  };
  document.head.appendChild(script);
})();
`;

    return new NextResponse(widgetScript, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache
      }
    });

  } catch (error) {
    console.error('Widget generation error:', error);
    return new NextResponse('// Error loading widget', { 
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
} 