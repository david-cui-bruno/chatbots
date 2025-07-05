"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Code, ArrowLeft, Zap, AlertCircle } from "lucide-react"
import Link from "next/link"
import AuthGuard from '@/components/auth-guard'
import { supabase } from '@/lib/supabase'

export default function CodePage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chatbot, setChatbot] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  // Load user and chatbot data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error('No user found')
        
        setUser(user)

        // Get user's chatbot
        const { data: chatbots, error: chatbotError } = await supabase
          .from('chatbots')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)

        if (chatbotError) throw chatbotError
        
        if (chatbots && chatbots.length > 0) {
          setChatbot(chatbots[0])
        } else {
          // No chatbot found - this means user hasn't completed onboarding
          setError('No chatbot found. Please complete the onboarding process first.')
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const embedCode = chatbot 
    ? `<script>
  window.chatbotConfig = {
    chatbotId: "${chatbot.id}",
    apiUrl: "${process.env.NEXT_PUBLIC_API_URL}",
    title: "${chatbot.name}",
    color: "${chatbot.settings?.color || '#667eea'}",
    position: "${chatbot.settings?.position || 'bottom-right'}"
  };
</script>
<script src="${process.env.NEXT_PUBLIC_API_URL}/widget/chatbot-widget.js"></script>
<link rel="stylesheet" href="${process.env.NEXT_PUBLIC_API_URL}/widget/chatbot-widget.css">
<script>
  ChatbotWidget.init(window.chatbotConfig);
</script>`
    : '<script>/* Please complete onboarding first */</script>'

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your chatbot...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/dashboard" className="flex items-center gap-3 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Get Embed Code</h1>
              <p className="text-gray-600">Add your chatbot to your website with one simple code snippet</p>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Setup Required</p>
                      <p className="text-sm">{error}</p>
                      <Link href="/dashboard" className="text-sm underline mt-1 inline-block">
                        Return to Dashboard
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {chatbot && (
              <>
                {/* Chatbot Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Chatbot: {chatbot.name}</CardTitle>
                    <CardDescription>
                      Website: {chatbot.website_url} • Created: {new Date(chatbot.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Installation Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">1</span>
                        </div>
                        <CardTitle className="text-lg">Copy Code</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">Copy the embed code below to your clipboard</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">2</span>
                        </div>
                        <CardTitle className="text-lg">Add to Website</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">Paste the code before the closing &lt;/body&gt; tag</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <CardTitle className="text-lg">You&apos;re Done!</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">Your chatbot will appear automatically on your site</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Embed Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Your Embed Code
                    </CardTitle>
                    <CardDescription>
                      Copy this code and paste it into your website&apos;s HTML, right before the closing &lt;/body&gt; tag
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto font-mono max-h-64">
                        <code>{embedCode}</code>
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
                      <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Super Simple Installation
                      </h4>
                      <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                        <li>Copy the code snippet above</li>
                        <li>Paste it before the &lt;/body&gt; tag on your website</li>
                        <li>Done! Your chatbot will appear automatically 🎉</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>Test your chatbot right here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-100 rounded-lg p-8 min-h-[200px] relative">
                      <p className="text-gray-600 text-center">Website Preview Area</p>
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Your chatbot will appear in the {chatbot.settings?.position?.replace('-', ' ') || 'bottom right'} corner
                      </p>
                      
                      {/* Mini chatbot preview */}
                      <div className={`absolute ${
                        chatbot.settings?.position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'
                      }`}>
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                          style={{ background: chatbot.settings?.color || '#667eea' }}
                        >
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chatbot Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge className={`${
                        chatbot.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        <div className={`h-2 w-2 rounded-full mr-2 ${
                          chatbot.is_active ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        {chatbot.is_active ? 'Online & Ready' : 'Setup Required'}
                      </Badge>
                      <span className="text-gray-600">
                        {chatbot.is_active 
                          ? 'Your chatbot is ready to handle customer inquiries'
                          : 'Complete setup to activate your chatbot'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
