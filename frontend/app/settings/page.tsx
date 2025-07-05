"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MessageCircle, Palette, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import AuthGuard from '@/components/auth-guard'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [chatbot, setChatbot] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  // Form states
  const [isEnabled, setIsEnabled] = useState(true)
  const [chatbotName, setChatbotName] = useState("Assistant")
  const [greeting, setGreeting] = useState("Hello! How can I help you today?")
  const [tone, setTone] = useState("friendly")
  const [bubbleColor, setBubbleColor] = useState("#3B82F6")
  const [position, setPosition] = useState("bottom-right")

  // Load chatbot settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError('')

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
          const chatbotData = chatbots[0]
          setChatbot(chatbotData)

          // Populate form with existing settings
          setIsEnabled(chatbotData.is_active || true)
          setChatbotName(chatbotData.name || 'Assistant')
          setGreeting(chatbotData.settings?.greeting || 'Hello! How can I help you today?')
          setTone(chatbotData.settings?.tone || 'friendly')
          setBubbleColor(chatbotData.settings?.color || '#3B82F6')
          setPosition(chatbotData.settings?.position || 'bottom-right')

          console.log('✅ Loaded chatbot settings:', chatbotData)
        } else {
          setError('No chatbot found. Please complete onboarding first.')
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings function
  const handleSave = async () => {
    if (!chatbot) {
      setError('No chatbot to update')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      console.log('💾 Saving chatbot settings...')

      // Update chatbot in database
      const { data, error } = await supabase
        .from('chatbots')
        .update({
          name: chatbotName,
          title: chatbotName, // Also update title
          is_active: isEnabled,
          settings: {
            ...chatbot.settings, // Keep existing settings
            greeting: greeting,
            tone: tone,
            color: bubbleColor,
            position: position
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', chatbot.id)
        .select()

      if (error) {
        console.error('💥 Save error:', error)
        throw error
      }

      console.log('✅ Settings saved successfully:', data)
      setSuccess('Settings saved successfully!')

      // Update local chatbot state
      setChatbot({
        ...chatbot,
        name: chatbotName,
        title: chatbotName,
        is_active: isEnabled,
        settings: {
          ...chatbot.settings,
          greeting,
          tone,
          color: bubbleColor,
          position
        }
      })

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      console.error('💥 Error saving settings:', error)
      setError(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your chatbot settings...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Chatbot Settings</h1>
              <p className="text-gray-600">Configure your chatbot&apos;s behavior and appearance</p>
              {chatbot && (
                <p className="text-sm text-gray-500 mt-1">
                  Editing: {chatbot.name} • Website: {chatbot.website_url}
                </p>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {success && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">{success}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {chatbot && (
              <>
                {/* Basic Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Basic Configuration
                    </CardTitle>
                    <CardDescription>Control your chatbot&apos;s basic settings and behavior</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Enable Chatbot</Label>
                        <p className="text-sm text-gray-600">Turn your chatbot on or off</p>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="chatbot-name">Chatbot Name</Label>
                        <Input
                          id="chatbot-name"
                          value={chatbotName}
                          onChange={(e) => setChatbotName(e.target.value)}
                          placeholder="Assistant"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tone">Response Tone</Label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="greeting">Welcome Message</Label>
                      <Textarea
                        id="greeting"
                        value={greeting}
                        onChange={(e) => setGreeting(e.target.value)}
                        placeholder="Hello! How can I help you today?"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Appearance
                    </CardTitle>
                    <CardDescription>Customize how your chatbot looks on your website</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="bubble-color">Chat Bubble Color</Label>
                        <div className="flex gap-3">
                          <Input
                            id="bubble-color"
                            type="color"
                            value={bubbleColor}
                            onChange={(e) => setBubbleColor(e.target.value)}
                            className="w-16 h-10 p-1 border rounded"
                          />
                          <Input
                            value={bubbleColor}
                            onChange={(e) => setBubbleColor(e.target.value)}
                            placeholder="#3B82F6"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="position">Position on Website</Label>
                        <Select value={position} onValueChange={setPosition}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-100 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
                      <div className="bg-white rounded-lg p-4 min-h-[100px] relative">
                        <p className="text-gray-600 text-sm">Your website preview</p>
                        <div className={`absolute ${
                          position === 'bottom-left' ? 'bottom-2 left-2' : 'bottom-2 right-2'
                        }`}>
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: bubbleColor }}
                          >
                            <MessageCircle className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button size="lg" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save All Settings'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
