'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, CheckCircle, Globe, MessageCircle, Settings, Mail, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface OnboardingData {
  businessName: string;
  websiteUrl: string;
  industry: string;
  chatbotName: string;
  greeting: string;
  businessHours: string;
  contactEmail: string;
  tone: 'professional' | 'friendly' | 'casual';
}

interface OnboardingQuestionnaireProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingQuestionnaire({ userId, onComplete }: OnboardingQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    businessName: '',
    websiteUrl: '',
    industry: '',
    chatbotName: '',
    greeting: '',
    businessHours: '',
    contactEmail: '',
    tone: 'friendly'
  });
  
  // Enhanced progress tracking
  const [scrapingProgress, setScrapingProgress] = useState('');
  const [scrapingStage, setScrapingStage] = useState<'idle' | 'starting' | 'discovering' | 'scraping' | 'processing' | 'complete' | 'error'>('idle');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [pagesFound, setPagesFound] = useState(0);
  const [pagesProcessed, setPagesProcessed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Pre-populate email if user has one
      if (user?.email) {
        setFormData(prev => ({ 
          ...prev, 
          contactEmail: user.email || ''
        }));
      }
    };
    getUser();
  }, []);

  const createChatbotMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      try {
        console.log('🔥 MUTATION START: createChatbotMutation triggered');
        
        // Stage 1: Starting
        setScrapingStage('starting');
        setScrapingProgress('🚀 Initializing website scanner...');
        setProgressPercentage(5);
        
        // Stage 2: Discovering
        setScrapingStage('discovering');
        setScrapingProgress('🔍 Discovering website structure...');
        setProgressPercentage(15);
        
        const startTime = Date.now();
        const scrapedData = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scrape-professional`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: data.websiteUrl,
            options: {
              maxPages: 15,
              maxTime: 60000,
              requestDelay: 1000
            }
          })
        });

        // Stage 3: Scraping
        setScrapingStage('scraping');
        setScrapingProgress('📄 Analyzing website content...');
        setProgressPercentage(30);
        
        // Simulate progressive updates while waiting
        const progressInterval = setInterval(() => {
          setProgressPercentage(prev => {
            if (prev < 75) {
              return prev + 5;
            }
            return prev;
          });
          
          // Update estimated time
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
          setEstimatedTime(remaining);
        }, 2000);

        if (!scrapedData.ok) {
          clearInterval(progressInterval);
          throw new Error('Failed to scrape website');
        }

        const scrapeData = await scrapedData.json();
        clearInterval(progressInterval);
        
        // Stage 4: Processing
        setScrapingStage('processing');
        setScrapingProgress('⚙️ Processing website content...');
        setProgressPercentage(85);
        setPagesFound(scrapeData.comprehensive_stats?.total_discovered || 0);
        setPagesProcessed(scrapeData.pages_scraped || 0);
        
        console.log('🎯 Scraping completed:', scrapeData);
        
        // Stage 5: Creating chatbot
        setScrapingProgress('💾 Creating your intelligent chatbot...');
        setProgressPercentage(95);
        
        const { data: chatbot, error } = await supabase
          .from('chatbots')
          .insert({
            user_id: userId,
            name: data.chatbotName,
            website_url: data.websiteUrl,
            title: data.chatbotName,
            is_active: true,
            scraped_content: {
              content: scrapeData.content,
              pages: scrapeData.pages,
              stats: scrapeData.comprehensive_stats,
              contentLength: scrapeData.contentLength,
              pagesScraped: scrapeData.pages_scraped,
              scrapedAt: new Date().toISOString()
            },
            last_scraped_at: new Date().toISOString(),
            settings: {
              greeting: data.greeting,
              color: '#667eea',
              position: 'bottom-right',
              tone: data.tone,
              business_hours: data.businessHours,
              contact_email: data.contactEmail,
              industry: data.industry
            }
          })
          .select()
          .single();

        if (error) {
          console.error('💥 Database error:', error);
          throw new Error(`Failed to create chatbot: ${error.message}`);
        }

        // Stage 6: Complete
        setScrapingStage('complete');
        setScrapingProgress('🎉 Chatbot created successfully!');
        setProgressPercentage(100);
        
        // Call onComplete after a short delay
        setTimeout(() => {
          onComplete();
        }, 1500);

        return chatbot;
        
      } catch (error) {
        setScrapingStage('error');
        setScrapingProgress('❌ Setup failed. Please try again.');
        setProgressPercentage(0);
        console.error('💥 Onboarding error:', error);
        throw error;
      }
    },
    onError: (error) => {
      setScrapingStage('error');
      setScrapingProgress('❌ Setup failed. Please try again.');
      setProgressPercentage(0);
    }
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    console.log('🔘 Submit button clicked!');
    console.log('🔘 Current step:', step);
    console.log('🔘 Form valid?', isStepValid());
    console.log('🔘 Mutation pending?', createChatbotMutation.isPending);
    console.log('🔘 About to call mutate with:', formData);
    
    createChatbotMutation.mutate(formData);
    console.log('🔘 Mutate called successfully');
  };

  const updateFormData = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.businessName && formData.websiteUrl;
      case 2:
        return formData.industry && formData.chatbotName;
      case 3:
        return formData.greeting && formData.tone;
      case 4:
        return formData.businessHours && formData.contactEmail;
      default:
        return false;
    }
  };

  const stepIcons = [Globe, MessageCircle, Settings, Mail];
  const stepTitles = [
    'Business Information',
    'Chatbot Setup',
    'Personality & Tone',
    'Contact Details'
  ];

  useEffect(() => {
    console.log('📊 OnboardingQuestionnaire state update:', {
      step,
      isPending: createChatbotMutation.isPending,
      isError: createChatbotMutation.isError,
      isSuccess: createChatbotMutation.isSuccess,
      error: createChatbotMutation.error?.message,
      scrapingProgress,
      scrapingStage,
      progressPercentage,
      pagesFound,
      pagesProcessed,
      estimatedTime,
      timestamp: new Date().toISOString()
    });
  }, [step, createChatbotMutation.isPending, createChatbotMutation.isError, createChatbotMutation.isSuccess, createChatbotMutation.error, scrapingProgress, scrapingStage, progressPercentage, pagesFound, pagesProcessed, estimatedTime]);

  // Enhanced progress indicator component
  const ProgressIndicator = () => {
    if (scrapingStage === 'idle') return null;

    const getStageIcon = () => {
      switch (scrapingStage) {
        case 'starting':
        case 'discovering':
        case 'scraping':
        case 'processing':
          return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
        case 'complete':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'error':
          return <AlertCircle className="h-5 w-5 text-red-600" />;
        default:
          return <Clock className="h-5 w-5 text-gray-600" />;
      }
    };

    const getStageColor = () => {
      switch (scrapingStage) {
        case 'complete':
          return 'bg-green-50 border-green-200';
        case 'error':
          return 'bg-red-50 border-red-200';
        default:
          return 'bg-blue-50 border-blue-200';
      }
    };

    return (
      <div className={`mt-4 p-4 rounded-lg border ${getStageColor()}`}>
        <div className="flex items-center gap-3 mb-3">
          {getStageIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{scrapingProgress}</p>
            {estimatedTime > 0 && scrapingStage === 'scraping' && (
              <p className="text-xs text-gray-500 mt-1">
                Estimated time remaining: {estimatedTime}s
              </p>
            )}
          </div>
        </div>
        
        {scrapingStage !== 'error' && (
          <div className="space-y-2">
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progressPercentage}% complete</span>
              {pagesProcessed > 0 && (
                <span>
                  {pagesProcessed} pages processed
                  {pagesFound > 0 && ` of ${pagesFound} found`}
                </span>
              )}
            </div>
          </div>
        )}
        
        {scrapingStage === 'complete' && (
          <div className="mt-3 p-3 bg-green-100 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Successfully analyzed {pagesProcessed} pages!
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome to ChatBot Pro</h1>
          <p className="text-gray-600">Let&apos;s create your first AI chatbot in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((i) => {
              const Icon = stepIcons[i - 1];
              const isActive = i === step;
              const isCompleted = i < step;
              
              return (
                <div key={i} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isActive 
                      ? 'border-blue-500 bg-blue-500 text-white' 
                      : isCompleted 
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {i < 4 && (
                    <div className={`w-16 h-0.5 ml-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="text-center">
          <Badge variant="outline" className="text-sm">
            Step {step} of 4: {stepTitles[step - 1]}
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {stepTitles[step - 1]}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessName" className="text-sm font-medium">
                      Business Name *
                    </Label>
                    <Input
                      id="businessName"
                      placeholder="e.g., Acme Corporation"
                      value={formData.businessName}
                      onChange={(e) => updateFormData('businessName', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="websiteUrl" className="text-sm font-medium">
                      Website URL *
                    </Label>
                    <Input
                      id="websiteUrl"
                      placeholder="https://your-website.com"
                      value={formData.websiteUrl}
                      onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      We&apos;ll analyze your website content to train your chatbot with relevant information
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="industry" className="text-sm font-medium">
                      Industry *
                    </Label>
                    <Select onValueChange={(value) => updateFormData('industry', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail & E-commerce</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="technology">Technology & Software</SelectItem>
                        <SelectItem value="finance">Finance & Banking</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="real-estate">Real Estate</SelectItem>
                        <SelectItem value="hospitality">Hospitality & Travel</SelectItem>
                        <SelectItem value="professional-services">Professional Services</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="chatbotName" className="text-sm font-medium">
                      Chatbot Name *
                    </Label>
                    <Input
                      id="chatbotName"
                      placeholder="e.g., Sales Assistant, Support Helper, Customer Guide"
                      value={formData.chatbotName}
                      onChange={(e) => updateFormData('chatbotName', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This will appear in the chat header when customers interact with your bot
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="greeting" className="text-sm font-medium">
                      Welcome Message *
                    </Label>
                    <Textarea
                      id="greeting"
                      placeholder="Hi! I&apos;m here to help you with any questions about our products and services. What can I help you with today?"
                      value={formData.greeting}
                      onChange={(e) => updateFormData('greeting', e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This message will greet visitors when they first open the chat
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Response Tone *</Label>
                    <Select onValueChange={(value: 'professional' | 'friendly' | 'casual') => updateFormData('tone', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose your chatbot&apos;s communication style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          <div className="space-y-1">
                            <div className="font-medium">Professional</div>
                            <div className="text-xs text-gray-500">Formal, business-focused communication</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="friendly">
                          <div className="space-y-1">
                            <div className="font-medium">Friendly</div>
                            <div className="text-xs text-gray-500">Warm, approachable, and helpful</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="casual">
                          <div className="space-y-1">
                            <div className="font-medium">Casual</div>
                            <div className="text-xs text-gray-500">Relaxed and conversational</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessHours" className="text-sm font-medium">
                      Business Hours *
                    </Label>
                    <Input
                      id="businessHours"
                      placeholder="e.g., Monday-Friday 9AM-5PM EST"
                      value={formData.businessHours}
                      onChange={(e) => updateFormData('businessHours', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Your chatbot will mention these hours when customers ask about availability
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="contactEmail" className="text-sm font-medium">
                      Contact Email *
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="support@yourbusiness.com"
                      value={formData.contactEmail}
                      onChange={(e) => updateFormData('contactEmail', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      For complex questions your chatbot can&apos;t answer, it will direct customers here
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">🎉 Almost done!</h4>
                  <p className="text-sm text-blue-700">
                    We&apos;ll create your chatbot, analyze your website content, and generate the embed code. 
                    This usually takes less than a minute.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || createChatbotMutation.isPending}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="flex items-center"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStepValid() || createChatbotMutation.isPending}
                  className="flex items-center"
                >
                  {createChatbotMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create My Chatbot
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Enhanced Progress Indicator */}
            <ProgressIndicator />

            {/* Error Display */}
            {createChatbotMutation.error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <strong>Error creating chatbot:</strong>
                </div>
                <p className="mt-1">{createChatbotMutation.error.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
