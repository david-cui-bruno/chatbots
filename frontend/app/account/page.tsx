"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  User, 
  CreditCard, 
  TrendingUp, 
  Crown, 
  ArrowUp, 
  Shield,
  Mail,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import AuthGuard from '@/components/auth-guard'
import { supabase } from '@/lib/supabase'

export default function AccountPage() {
  const [companyName, setCompanyName] = useState("Your Company Name")
  const [contactEmail, setContactEmail] = useState("you@company.com")
  const [currentPlan] = useState("Starter")
  const [conversationsUsed] = useState(1247)
  const [conversationsLimit] = useState(2000)
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  
  // Profile update states
  const [profileMessage, setProfileMessage] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)

  const usagePercentage = (conversationsUsed / conversationsLimit) * 100

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setContactEmail(user.email)
      }
    }
    loadUserData()
  }, [])

  const handleProfileSave = async () => {
    setProfileLoading(true)
    setProfileMessage("")
    
    try {
      // Update user metadata if needed
      const { error } = await supabase.auth.updateUser({
        data: { 
          company_name: companyName 
        }
      })
      
      if (error) throw error
      
      setProfileMessage("Profile updated successfully!")
      setTimeout(() => setProfileMessage(""), 3000)
    } catch (error) {
      console.error('Profile update error:', error)
      setProfileMessage(`Error: ${error instanceof Error ? error.message : 'Failed to update profile'}`)
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordLoading(true)
    setPasswordMessage("")
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("All password fields are required")
      setPasswordLoading(false)
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords don&apos;t match")
      setPasswordLoading(false)
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordMessage("New password must be at least 6 characters")
      setPasswordLoading(false)
      return
    }
    
    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        throw new Error("User email not found")
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })
      
      if (signInError) {
        throw new Error("Current password is incorrect")
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      
      setPasswordMessage("Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordMessage(""), 3000)
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordMessage(`Error: ${error instanceof Error ? error.message : 'Failed to change password'}`)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleEmailChange = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: contactEmail
      })
      
      if (error) throw error
      
      setProfileMessage("Email update sent! Check your new email to confirm the change.")
      setTimeout(() => setProfileMessage(""), 5000)
    } catch (error) {
      console.error('Email change error:', error)
      setProfileMessage(`Error: ${error instanceof Error ? error.message : 'Failed to update email'}`)
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-gray-600">Manage your account information, security, and billing</p>
            </div>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your company details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleEmailChange}
                        size="sm"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Change
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Changing your email will require verification
                    </p>
                  </div>
                </div>

                {profileMessage && (
                  <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                    profileMessage.includes('Error') 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {profileMessage.includes('Error') ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {profileMessage}
                  </div>
                )}

                <Button 
                  onClick={handleProfileSave}
                  disabled={profileLoading}
                >
                  {profileLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage your password and account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Password requirements:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>At least 6 characters long</li>
                      <li>Should include numbers and special characters</li>
                      <li>Avoid using common words or personal information</li>
                    </ul>
                  </div>
                </div>

                {passwordMessage && (
                  <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                    passwordMessage.includes('Error') || passwordMessage.includes("don&apos;t match") || passwordMessage.includes('incorrect') || passwordMessage.includes('required')
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {passwordMessage.includes('Error') || passwordMessage.includes("don&apos;t match") || passwordMessage.includes('incorrect') || passwordMessage.includes('required') ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {passwordMessage}
                  </div>
                )}

                <Button 
                  onClick={handlePasswordChange}
                  disabled={passwordLoading}
                  className="w-full md:w-auto"
                >
                  {passwordLoading ? "Changing Password..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Plan & Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Plan & Usage
                </CardTitle>
                <CardDescription>Monitor your current plan and usage statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Current Plan</h4>
                    <p className="text-gray-600">You&apos;re on the {currentPlan} plan</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {currentPlan}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Conversations This Month</h4>
                    <span className="text-sm text-gray-600">
                      {conversationsUsed.toLocaleString()} / {conversationsLimit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                  <p className="text-sm text-gray-600">{Math.round(100 - usagePercentage)}% remaining this month</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">Upgrade to Pro</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Get unlimited conversations, advanced analytics, and priority support.
                      </p>
                      <Button className="mt-3" size="sm">
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>Manage your payment method and billing details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Payment Method</h4>
                      <p className="text-sm text-gray-600">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-600">Expires 12/25</p>
                    </div>
                    <Button variant="outline">Update Card</Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline">Update Billing Info</Button>
                  <Button variant="outline">Download All Invoices</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
