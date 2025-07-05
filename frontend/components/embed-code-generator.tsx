'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Eye, Code, Globe, Palette, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';

interface Chatbot {
  id: string;
  name: string;
  website_url: string;
  is_active: boolean;
  settings?: {
    greeting?: string;
    color?: string;
    position?: string;
  };
}

interface EmbedCodeGeneratorProps {
  userId: string;
}

export function useChatbot(userId: string) {
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChatbot = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔍 EmbedGen: Loading chatbot for user:', userId);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to load chatbot: ${error.message}`);
      }
      
      setChatbot(data);
    } catch (error) {
      console.error('Error loading chatbot:', error);
      // Don't crash - show user-friendly message
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChatbot();
  }, [loadChatbot]);

  return { chatbot, loading, error, refetch: loadChatbot };
}

export default function EmbedCodeGenerator({ userId }: EmbedCodeGeneratorProps) {
  const { chatbot, loading, error, refetch } = useChatbot(userId);
  
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!chatbot) {
    return <NoChatbotState />;
  }

  return <ChatbotDisplay chatbot={chatbot} refetch={refetch} />;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading your chatbot...</p>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">Error Loading Chatbot</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </CardContent>
    </Card>
  );
}

function NoChatbotState() {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">No Active Chatbot</h3>
        <p className="text-gray-600 mb-4">You need to create and activate a chatbot first.</p>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </CardContent>
    </Card>
  );
}

function ChatbotDisplay({ chatbot, refetch }: { chatbot: Chatbot; refetch: () => void }) {
  const [copied, setCopied] = useState(false);

  const generateEmbedCode = () => {
    if (!chatbot) return '';
    
    // Frontend serves widget.js, backend serves API endpoints
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com'  // Your production frontend URL
      : 'http://localhost:3000';   // Local frontend URL
    
    return `<script src="${frontendUrl}/widget.js?id=${chatbot.id}"></script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Add mutation for updating chatbot settings
  const updateChatbotMutation = useMutation({
    mutationFn: async (updates: Partial<Chatbot['settings']>) => {
      const { error } = await supabase
        .from('chatbots')
        .update({ settings: { ...chatbot.settings, ...updates } })
        .eq('id', chatbot.id);
      
      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      // Refetch chatbot data
      refetch();
    }
  });

  return (
    <div className="space-y-6">
      {/* Chatbot Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Your Chatbot Details
          </CardTitle>
          <CardDescription>
            Ready to embed on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Chatbot Name</Label>
              <p className="text-sm text-gray-600">{chatbot.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Website URL</Label>
              <p className="text-sm text-gray-600">{chatbot.website_url}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant={chatbot.is_active ? "default" : "secondary"}>
                {chatbot.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Theme Color</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: chatbot.settings?.color || '#667eea' }}
                ></div>
                <span className="text-sm text-gray-600">
                  {chatbot.settings?.color || '#667eea'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code Tabs */}
      <Tabs defaultValue="code" className="space-y-4">
        <TabsList>
          <TabsTrigger value="code">
            <Code className="h-4 w-4 mr-2" />
            Embed Code
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="customize">
            <Palette className="h-4 w-4 mr-2" />
            Customize
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Website Integration Code</CardTitle>
              <CardDescription>
                Copy and paste this code before the closing &lt;/body&gt; tag on your website
              </CardDescription>
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
                <p className="text-xs text-green-600 mt-2">
                  No configuration needed - it auto-detects your settings!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                See how your chatbot will look on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chatbot ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={`/api/preview/${chatbot.id}`}
                    className="w-full h-96"
                    title="Chatbot Preview"
                  />
                </div>
              ) : (
                <div className="border rounded-lg flex items-center justify-center h-96 bg-gray-50">
                  <p className="text-gray-500">Loading preview...</p>
                </div>
              )}
              <p className="text-sm text-gray-600 mt-2">
                This is a live preview of your chatbot. The chat widget will appear in the bottom-right corner.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize">
          <Card>
            <CardHeader>
              <CardTitle>Customize Appearance</CardTitle>
              <CardDescription>
                Modify your chatbot&apos;s look and feel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Theme Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={chatbot.settings?.color || '#667eea'}
                    onChange={(e) => {
                      updateChatbotMutation.mutate({ color: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <select
                    id="position"
                    className="w-full p-2 border rounded"
                    value={chatbot.settings?.position || 'bottom-right'}
                    onChange={(e) => {
                      updateChatbotMutation.mutate({ position: e.target.value });
                    }}
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="greeting">Welcome Message</Label>
                <Input
                  id="greeting"
                  value={chatbot.settings?.greeting || ''}
                  placeholder="Hi! How can I help you today?"
                  onChange={(e) => {
                    updateChatbotMutation.mutate({ greeting: e.target.value });
                  }}
                />
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => updateChatbotMutation.mutate({})}
                disabled={updateChatbotMutation.isPending}
              >
                {updateChatbotMutation.isPending ? 'Saving...' : 'Save Customizations'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
