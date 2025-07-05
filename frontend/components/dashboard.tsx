'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  MessageCircle, Globe, Clock, CheckCircle, XCircle, 
  RefreshCw, Download, Copy, Check 
} from "lucide-react";
import { chatbotAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Dashboard Overview (combines stats + quick actions)
export function DashboardOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Your existing dashboard stats logic
      return { conversations: 1247, responseTime: '2.3s', satisfaction: 94 };
    },
    refetchInterval: 30000,
  });

  const refreshContent = useMutation({
    mutationFn: async () => {
      // Your refresh logic
      return { message: 'Content refreshed successfully' };
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold">{stats?.conversations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{stats?.responseTime || '--'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold">{stats?.satisfaction || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={() => refreshContent.mutate()}
            disabled={refreshContent.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshContent.isPending ? 'animate-spin' : ''}`} />
            {refreshContent.isPending ? 'Refreshing...' : 'Refresh Website Content'}
          </Button>

          <Button className="w-full justify-start" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Chat History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Embed Code Panel (combines embed generator)
export function EmbedCodePanel() {
  const [copied, setCopied] = useState(false);
  const [chatbot, setChatbot] = useState<{id: string} | null>(null);

  // Your existing embed code logic...
  const generateEmbedCode = () => {
    if (!chatbot) return '';
    return `<script src="http://localhost:3000/widget.js?id=${chatbot.id}"></script>`;
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Website Integration Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{generateEmbedCode()}</code>
            </pre>
            <Button
              size="sm"
              className="absolute top-2 right-2"
              onClick={copyToClipboard}
              variant="secondary"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">✨ Super Simple Installation:</h4>
            <ol className="text-sm text-green-800 space-y-1">
              <li>1. Copy the ONE line of code above</li>
              <li>2. Paste it before the &lt;/body&gt; tag on your website</li>
              <li>3. Done! Your chatbot will appear automatically 🎉</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Setup & Test Panel (combines website scraper + chat tester)
export function SetupTestPanel() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scrapedData, setScrapedData] = useState<{pages_scraped: number} | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: string; message: string}>>([]);

  const scrapeMutation = useMutation({
    mutationFn: chatbotAPI.scrapeWebsiteEnhanced,
    onSuccess: (data) => setScrapedData(data.data),
  });

  const chatMutation = useMutation({
    mutationFn: (variables: { message: string; websiteUrl: string }) => {
      return chatbotAPI.sendMessage(variables.message, variables.websiteUrl);
    },
    onSuccess: (data) => {
      setChatHistory((prev: Array<{role: string; message: string}>) => [
        ...prev,
        { role: 'user', message: chatMessage },
        { role: 'bot', message: data.response }
      ]);
      setChatMessage('');
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Website Scraper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              placeholder="https://your-business.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={() => scrapeMutation.mutate(websiteUrl)}
            disabled={!websiteUrl || scrapeMutation.isPending}
            className="w-full"
          >
            {scrapeMutation.isPending ? 'Analyzing...' : 'Analyze Website'}
          </Button>

          {scrapedData && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Analyzed {scrapedData?.pages_scraped} pages successfully!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Tester */}
      <Card>
        <CardHeader>
          <CardTitle>Test Your Chatbot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && chatMutation.mutate({ message: chatMessage, websiteUrl })}
            />
            <Button 
              onClick={() => chatMutation.mutate({ message: chatMessage, websiteUrl })}
              disabled={!chatMessage.trim() || chatMutation.isPending}
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Account Panel (combines account + settings)
export function AccountPanel() {
  const [companyName, setCompanyName] = useState("Your Company Name");
  const [contactEmail, setContactEmail] = useState("you@company.com");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Panel
export function SettingsPanel() {
  const [chatbotName, setChatbotName] = useState("Assistant");
  const [greeting, setGreeting] = useState("Hello! How can I help you today?");
  const [bubbleColor, setBubbleColor] = useState("#3B82F6");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chatbot Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bot-name">Chatbot Name</Label>
            <Input
              id="bot-name"
              value={chatbotName}
              onChange={(e) => setChatbotName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="greeting">Welcome Message</Label>
            <Input
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="color">Theme Color</Label>
            <Input
              id="color"
              type="color"
              value={bubbleColor}
              onChange={(e) => setBubbleColor(e.target.value)}
            />
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}