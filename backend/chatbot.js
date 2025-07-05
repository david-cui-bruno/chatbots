const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not set - chatbot will return fallback responses');
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

async function getChatResponse(userMessage, websiteUrl = null, contextData = null) {
  try {
    // If no OpenAI key, return helpful fallback
    if (!openai) {
      return "I'm a demo chatbot. To enable AI responses, please configure your OpenAI API key.";
    }

    let context = "";
    
    // Use provided context data (from database)
    if (contextData) {
      context = contextData;
      console.log(`📊 Using database context: ${context.length} chars`);
    } else {
      console.log(`⚠️ No context data provided for ${websiteUrl || 'unknown website'}`);
    }

    // Business-focused system message using context directly
    const systemMessage = context 
      ? `You are a customer service assistant for this business. Your ONLY job is to help customers with questions related to THIS business based on the provided information.

Business Information:
${context}

STRICT RULES:
1. ONLY answer questions about THIS business using the information provided above
2. For ANY question outside this business scope, respond with:
   "I'm here to help with questions about this business. For other topics, I'd recommend consulting appropriate specialists. What can I help you with about our services?"
3. Keep responses SHORT (1-2 sentences max)
4. Be friendly but stay focused on business matters
5. If you don't have specific information in the context, say "I don't have that information readily available. Please contact us directly for more details."

Stay professional and redirect back to business topics.`
      : `You are a customer service assistant. I can only help with questions about this business. For other topics, please consult appropriate specialists.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      max_tokens: 120,
      temperature: 0.1, // Low temperature for consistent, focused responses
    });

    const response = completion.choices[0].message.content.trim();
    console.log(`✅ Generated response: ${response.substring(0, 100)}...`);
    
    return response;

  } catch (error) {
    console.error('OpenAI API error:', error.message);
    
    if (error.message.includes('API key')) {
      return "I'm having trouble with my AI service. Please check back later.";
    }
    
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

module.exports = {
  getChatResponse
};