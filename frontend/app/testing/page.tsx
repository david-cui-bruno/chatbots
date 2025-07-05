"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TestTube, MessageCircle, Send } from "lucide-react"
import Link from "next/link"
import AuthGuard from '@/components/auth-guard'

export default function TestingPage() {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([
    { role: "bot", message: "Hello! I&apos;m your chatbot. Ask me anything about your business!" }
  ])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return
    
    const userMessage = message
    setMessage("")
    setChatHistory(prev => [...prev, { role: "user", message: userMessage }])
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        role: "bot", 
        message: "This is a test response to your message: &apos;" + userMessage + "&apos;" 
      }])
      setIsLoading(false)
    }, 1000)
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
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Chatbot Testing</h1>
                <Badge variant="destructive">Development Only</Badge>
              </div>
              <p className="text-gray-600">Test your chatbot&apos;s responses in a safe environment</p>
            </div>

            {/* Chat Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Chat Interface
                </CardTitle>
                <CardDescription>Send test messages to see how your chatbot responds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <div className="h-96 border rounded-lg p-4 overflow-y-auto bg-gray-50">
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`mb-4 flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            chat.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              {chat.role === 'user' ? 'You' : 'Bot'}
                            </span>
                          </div>
                          <p className="text-sm">{chat.message}</p>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start mb-4">
                        <div className="bg-white text-gray-900 border max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">Bot</span>
                          </div>
                          <p className="text-sm">Typing...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a test message..."
                      disabled={isLoading}
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>Suggested Test Messages</CardTitle>
                <CardDescription>Try these common questions to test your chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "What are your business hours?",
                    "How can I contact support?",
                    "What services do you offer?",
                    "Do you offer free trials?",
                    "What are your pricing plans?",
                    "How do I get started?"
                  ].map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setMessage(suggestion)}
                      className="justify-start text-left"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 