'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { chatbotAPI } from '@/lib/api';

export default function ChatTester() {
  const [message, setMessage] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'bot', message: string}>>([]);

  const chatMutation = useMutation({
    mutationFn: ({ message, websiteUrl }: { message: string; websiteUrl?: string }) => 
      chatbotAPI.sendMessage(message, websiteUrl),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', message },
        { role: 'bot', message: data.response }
      ]);
      setMessage('');
    },
    onError: (error) => {
      console.error('Chat failed:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'user', message },
        { role: 'bot', message: 'Sorry, I encountered an error. Please try again.' }
      ]);
      setMessage('');
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    chatMutation.mutate({ message, websiteUrl: websiteUrl || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Your Chatbot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="test-website-url">Website URL (optional)</Label>
          <Input
            id="test-website-url"
            placeholder="https://stripe.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </div>

        {/* Chat History */}
        <div className="bg-gray-50 p-4 rounded-md h-64 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <p className="text-gray-500">Start a conversation...</p>
          ) : (
            chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded ${
                  chat.role === 'user' 
                    ? 'bg-blue-100 ml-8' 
                    : 'bg-white mr-8'
                }`}
              >
                <strong>{chat.role === 'user' ? 'You:' : 'Bot:'}</strong> {chat.message}
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
