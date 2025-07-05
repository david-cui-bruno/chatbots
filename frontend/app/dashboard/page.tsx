"use client"

import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react"
import { useQuery } from '@tanstack/react-query'
import { conversationAPI } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useQuickActions } from '@/hooks/use-quick-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  Download,
  Users,
  User,
  Settings,
  Code,
  TestTube,
  ChevronDown,
  LogOut,
  Building,
  Globe,
  Mail,
  Phone
} from "lucide-react"
import AuthGuard from '@/components/auth-guard'
import Link from "next/link"

// Add this interface after imports
interface Conversation {
  id: string;
  question: string;
  response: string;
  rating?: 'good' | 'bad' | null;
  chatbotName: string;
  created_at: string;
}

export default function Dashboard() {
  const [showAllConversations, setShowAllConversations] = useState(false)
  const [businessInfo, setBusinessInfo] = useState({
    companyName: "Your Company Name",
    websiteUrl: "https://yourwebsite.com",
    contactEmail: "contact@yourcompany.com",
    businessHours: "Monday-Friday, 9 AM - 6 PM EST"
  })
  const [user, setUser] = useState<any>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Initialize quick actions
  const { refreshContent, exportHistory } = useQuickActions(user?.id)

  // Load real conversation data
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['recent-conversations', user?.id],
    queryFn: () => conversationAPI.getRecentConversations(user!.id, 10),
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['conversation-stats', user?.id], 
    queryFn: () => conversationAPI.getConversationStats(user!.id, 30),
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Use real data instead of mock data
  const conversations = conversationsData?.conversations || []
  const stats = statsData?.stats || {
    totalConversations: 0,
    satisfactionRate: 0,
    percentChange: 0
  }

  const handleSignOut = () => {
    // Implement sign out logic
    window.location.href = "/login"
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">ChatBot Pro</span>
              </div>
              
              {/* Account Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-red-600">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Monitor your chatbot&apos;s performance and customer interactions</p>
          </div>

          {/* Stats Cards - Replace with actual backend data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Total Conversations */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.totalConversations}
                    </p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {stats.percentChange > 0 ? '+' : ''}{stats.percentChange}% from last period
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Satisfaction */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : `${stats.satisfactionRate}%`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {stats.totalRated || 0} ratings
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Chatbots */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Chatbots</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {conversationsLoading ? '...' : '1'}
                    </p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Online and responding
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Recent Conversations */}
            <div className="lg:col-span-2">
              {/* Recent Conversations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Conversations</CardTitle>
                  <CardDescription>Latest customer interactions with your chatbot</CardDescription>
                </CardHeader>
                <CardContent>
                  {conversationsLoading ? (
                    <div className="text-center py-4">Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No conversations yet. Start promoting your chatbot!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversations.slice(0, showAllConversations ? conversations.length : 2).map((conversation: Conversation) => (
                        <div key={conversation.id} className="p-4 bg-gray-50 rounded-lg border">
                          {/* Question as the main focus */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageCircle className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">Question</span>
                                <Badge variant="outline" className="text-xs">
                                  {conversation.chatbotName}
                                </Badge>
                              </div>
                              <p className="text-gray-800 font-medium">{conversation.question}</p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                              {new Date(conversation.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          {/* Response */}
                          <div className="mt-3 pl-6 border-l-2 border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-700">Response</span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {conversation.response.length > 120 
                                ? conversation.response.substring(0, 120) + '...' 
                                : conversation.response
                              }
                            </p>
                          </div>
                          
                          {/* Optional: Rating or actions */}
                          {conversation.rating && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-xs text-gray-500">Rated:</span>
                              <Badge variant={conversation.rating === 'good' ? 'default' : 'destructive'} className="text-xs">
                                {conversation.rating === 'good' ? '👍 Helpful' : '👎 Not helpful'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {conversations.length > 5 && (
                    <div className="mt-6">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowAllConversations(!showAllConversations)}
                      >
                        {showAllConversations ? 'Show Less' : `Show All ${conversations.length} Conversations`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Access key features and settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/code">
                    <Button className="w-full justify-start">
                      <Code className="h-4 w-4 mr-2" />
                      Get Embed Code
                    </Button>
                  </Link>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline" 
                    onClick={() => refreshContent.mutate()}
                    disabled={refreshContent.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshContent.isPending ? 'animate-spin' : ''}`} />
                    {refreshContent.isPending ? 'Refreshing...' : 'Refresh Website Content'}
                  </Button>

                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => exportHistory.mutate()}
                    disabled={exportHistory.isPending}
                  >
                    <Download className={`h-4 w-4 mr-2 ${exportHistory.isPending ? 'animate-spin' : ''}`} />
                    {exportHistory.isPending ? 'Exporting...' : 'Export Chat History'}
                  </Button>

                  <Link href="/settings">
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Chatbot Settings
                    </Button>
                  </Link>

                  {process.env.NODE_ENV === 'development' && (
                    <Link href="/testing">
                      <Button className="w-full justify-start" variant="outline">
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Chatbot
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
