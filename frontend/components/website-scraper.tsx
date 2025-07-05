'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { chatbotAPI, type EnhancedScrapedData } from '@/lib/api';

export default function WebsiteScraper() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scrapedData, setScrapedData] = useState<EnhancedScrapedData | null>(null);
  const [scrapingStage, setScrapingStage] = useState<'idle' | 'analyzing' | 'scraping' | 'processing' | 'complete' | 'error'>('idle');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentPage, setCurrentPage] = useState('');
  const [pagesProcessed, setPagesProcessed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  // Health check query
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: chatbotAPI.healthCheck,
  });

  // Enhanced scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: chatbotAPI.scrapeWebsiteEnhanced,
    onMutate: () => {
      setScrapingStage('analyzing');
      setProgressPercentage(10);
      setCurrentPage('Initializing...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgressPercentage(prev => {
          if (prev < 80) {
            return prev + 5;
          }
          return prev;
        });
        
        setPagesProcessed(prev => prev + 1);
        setCurrentPage(`Processing page ${pagesProcessed + 1}...`);
      }, 2000);

      // Store interval for cleanup
      (scrapeMutation as any).progressInterval = progressInterval;
    },
    onSuccess: (data) => {
      // Clear progress interval
      if ((scrapeMutation as any).progressInterval) {
        clearInterval((scrapeMutation as any).progressInterval);
      }
      
      setScrapedData(data.data);
      setScrapingStage('complete');
      setProgressPercentage(100);
      setCurrentPage('Analysis complete!');
      setPagesProcessed(data.data.pages_scraped || 0);
    },
    onError: (error) => {
      // Clear progress interval
      if ((scrapeMutation as any).progressInterval) {
        clearInterval((scrapeMutation as any).progressInterval);
      }
      
      console.error('Enhanced scraping failed:', error);
      setScrapingStage('error');
      setProgressPercentage(0);
      setCurrentPage('Analysis failed');
    },
  });

  const handleScrape = () => {
    if (!websiteUrl) return;
    setScrapedData(null);
    setProgressPercentage(0);
    setPagesProcessed(0);
    setCurrentPage('');
    scrapeMutation.mutate(websiteUrl);
  };

  const getSuccessRate = (stats: any) => {
    if (!stats) return 0;
    return Math.round((stats.successfulPages / stats.totalPagesAttempted) * 100);
  };

  const ScrapeProgressIndicator = () => {
    if (scrapingStage === 'idle') return null;

    const getStageIcon = () => {
      switch (scrapingStage) {
        case 'analyzing':
        case 'scraping':
        case 'processing':
          return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
        case 'complete':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'error':
          return <AlertCircle className="h-5 w-5 text-red-600" />;
        default:
          return <Globe className="h-5 w-5 text-gray-600" />;
      }
    };

    const getStageMessage = () => {
      switch (scrapingStage) {
        case 'analyzing':
          return '🔍 Analyzing website structure...';
        case 'scraping':
          return '📄 Extracting content from pages...';
        case 'processing':
          return '⚙️ Processing and optimizing content...';
        case 'complete':
          return '✅ Website analysis complete!';
        case 'error':
          return '❌ Analysis failed. Please try again.';
        default:
          return 'Ready to analyze';
      }
    };

    return (
      <div className={`mt-4 p-4 rounded-lg border ${
        scrapingStage === 'complete' ? 'bg-green-50 border-green-200' :
        scrapingStage === 'error' ? 'bg-red-50 border-red-200' :
        'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {getStageIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{getStageMessage()}</p>
            {currentPage && (
              <p className="text-xs text-gray-500 mt-1">{currentPage}</p>
            )}
          </div>
        </div>
        
        {scrapingStage !== 'error' && (
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progressPercentage}% complete</span>
              {pagesProcessed > 0 && (
                <span>{pagesProcessed} pages processed</span>
              )}
            </div>
          </div>
        )}
        
        {scrapingStage === 'complete' && scrapedData && (
          <div className="mt-3 p-3 bg-green-100 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Successfully analyzed {scrapedData.pages_scraped} pages 
                ({scrapedData.contentLength?.toLocaleString()} characters)
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Backend Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <p>Checking connection...</p>
          ) : healthData ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Connected to backend: {healthData.status}</span>
              {healthData.openai && <Badge variant="secondary">OpenAI Ready</Badge>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span>Cannot connect to backend</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Website Scraper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Comprehensive Website Analysis
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Analyzes your entire website including all business pages, services, contact info, and more.
          </p>
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
            onClick={handleScrape}
            disabled={!websiteUrl || scrapeMutation.isPending}
            className="w-full"
          >
            {scrapeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Analyze
              </>
            )}
          </Button>

          <ScrapeProgressIndicator />

          {scrapeMutation.error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {scrapeMutation.error.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Scraped Data Display */}
      {scrapedData && (
        <>
          {/* Scraping Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{scrapedData.pages_scraped}</div>
                  <div className="text-sm text-gray-600">Pages Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {scrapedData.scrapeStats ? getSuccessRate(scrapedData.scrapeStats) : 100}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(scrapedData.contentLength / 1000)}K
                  </div>
                  <div className="text-sm text-gray-600">Content Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {scrapedData.scrapeStats?.scrapeDuration || 0}s
                  </div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
              </div>

              {scrapedData.scrapeStats && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    ✅ {scrapedData.scrapeStats.successfulPages} successful • 
                    ❌ {scrapedData.scrapeStats.failedPages} failed • 
                    ⏭️ {scrapedData.scrapeStats.skippedPages} skipped
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information Extracted */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information Extracted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Contact Information</h4>
                  
                  {scrapedData.structured.phone.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Phone Numbers</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scrapedData.structured.phone.slice(0, 3).map((phone, i) => (
                          <Badge key={i} variant="outline">{phone}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {scrapedData.structured.email.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Email Addresses</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scrapedData.structured.email.slice(0, 2).map((email, i) => (
                          <Badge key={i} variant="outline">{email}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {scrapedData.structured.hours.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Business Hours</Label>
                      <div className="text-sm text-gray-600 mt-1">
                        {scrapedData.structured.hours.slice(0, 2).join(' • ')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Offerings */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Business Offerings</h4>
                  
                  {scrapedData.structured.services.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Services ({scrapedData.structured.services.length})</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scrapedData.structured.services.slice(0, 5).map((service, i) => (
                          <Badge key={i} variant="secondary">{service}</Badge>
                        ))}
                        {scrapedData.structured.services.length > 5 && (
                          <Badge variant="outline">+{scrapedData.structured.services.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {scrapedData.structured.menu.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Menu/Products ({scrapedData.structured.menu.length})</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scrapedData.structured.menu.slice(0, 4).map((item, i) => (
                          <Badge key={i} variant="secondary">{item}</Badge>
                        ))}
                        {scrapedData.structured.menu.length > 4 && (
                          <Badge variant="outline">+{scrapedData.structured.menu.length - 4} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {scrapedData.structured.faqs.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">FAQs Found</Label>
                      <div className="text-sm text-gray-600 mt-1">
                        {scrapedData.structured.faqs.length} frequently asked questions extracted
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Description */}
              {scrapedData.structured.description && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Business Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{scrapedData.structured.description}</p>
                </div>
              )}

              {/* Content Preview */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">LLM-Optimized Content Preview</Label>
                <div className="bg-gray-50 p-3 rounded-md mt-2 max-h-32 overflow-y-auto text-xs font-mono">
                  {scrapedData.content.substring(0, 800)}...
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
