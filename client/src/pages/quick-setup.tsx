import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mic, ArrowRight, Bot, Sparkles, Zap, Target, Globe, Brain, Database } from "lucide-react";

interface QuickSetupData {
  business_name: string;
  business_type: string;
  primary_location: string;
  agent_name: string;
  agent_role: string;
  website_url?: string;
}

export default function QuickSetupPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    primary_location: "",
    agent_name: "",
    agent_role: "Receptionist",
    website_url: ""
  });

  // Fetch industries from database
  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ['/api/industries'],
    queryFn: async () => {
      const response = await fetch('/api/industries');
      if (!response.ok) throw new Error('Failed to fetch industries');
      return response.json();
    }
  });

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const quickSetupMutation = useMutation({
    mutationFn: async (data: QuickSetupData) => {
      // Step 1: Website scraping (if URL provided)
      let knowledgeBaseFileId = null;
      
      if (data.website_url) {
        setLoadingStep("Analyzing your website...");
        setProgress(25);
        
        const scrapeResponse = await fetch("/api/quick-setup/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            website_url: data.website_url,
            business_name: data.business_name 
          })
        });
        
        if (!scrapeResponse.ok) {
          throw new Error("Failed to analyze website content");
        }
        
        const scrapeResult = await scrapeResponse.json();
        knowledgeBaseFileId = scrapeResult.fileId;
        
        setProgress(50);
      }
      
      // Step 2: Create assistant with knowledge base
      setLoadingStep("Creating your AI assistant...");
      setProgress(75);
      
      const response = await fetch("/api/quick-setup/create-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          knowledgeBaseFileId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create assistant");
      }
      
      setProgress(100);
      return response.json();
    },
    onSuccess: (result) => {
      setLoadingStep(null);
      setProgress(0);
      toast({
        title: "Assistant Created Successfully!",
        description: `${result.agent_name} is now active and ready to help your customers.`,
      });
      
      // Navigate directly to dashboard
      setLocation('/dashboard');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create assistant",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    quickSetupMutation.mutate(formData);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-100/50"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)"
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25">
                <Mic className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
            Create Your AI Assistant
          </h1>
          <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Deploy a sophisticated voice assistant in under 2 minutes with enterprise-grade AI technology
          </p>
        </div>

        {/* Premium Quick Setup Form */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
              <CardHeader className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Assistant Configuration</CardTitle>
                    <CardDescription className="text-blue-100 text-lg font-medium">
                      Deploy enterprise-grade voice AI technology
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </div>
            
            <CardContent className="p-8 relative">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left Column - Business Details */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="business_name" className="text-sm font-semibold text-gray-700 flex items-center">
                        Business Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="business_name"
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                        placeholder="Enter your business name"
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="business_type" className="text-sm font-semibold text-gray-700 flex items-center">
                        Business Type
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Select value={formData.business_type} onValueChange={(value) => setFormData({...formData, business_type: value})}>
                        <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select your business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {industriesLoading ? (
                            <SelectItem value="loading" disabled>Loading industries...</SelectItem>
                          ) : industries ? (
                            industries.map((industry: {industry: string, display_name: string}) => (
                              <SelectItem key={industry.industry} value={industry.industry}>
                                {industry.display_name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="others">Other</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="primary_location" className="text-sm font-semibold text-gray-700 flex items-center">
                        Primary Location
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="primary_location"
                        type="text"
                        value={formData.primary_location}
                        onChange={(e) => setFormData({...formData, primary_location: e.target.value})}
                        placeholder="e.g., Manchester, UK"
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="website_url" className="text-sm font-semibold text-gray-700 flex items-center">
                        Website URL
                        <span className="text-gray-400 ml-1 text-xs">(Optional)</span>
                      </Label>
                      <Input
                        id="website_url"
                        type="url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                        placeholder="https://your-business-website.com"
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      />
                      <p className="text-xs text-gray-500">
                        We'll analyze your website to train your assistant with business-specific knowledge
                      </p>
                    </div>
                  </div>

                  {/* Right Column - Assistant Details */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="agent_name" className="text-sm font-semibold text-gray-700 flex items-center">
                        Assistant Voice & Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Select value={formData.agent_name} onValueChange={(value) => setFormData({...formData, agent_name: value})}>
                        <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Choose your assistant's voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Adam">Adam (Male)</SelectItem>
                          <SelectItem value="Josh">Josh (Male)</SelectItem>
                          <SelectItem value="Arnold">Arnold (Male)</SelectItem>
                          <SelectItem value="Sam">Sam (Male)</SelectItem>
                          <SelectItem value="Bella">Bella (Female)</SelectItem>
                          <SelectItem value="Rachel">Rachel (Female)</SelectItem>
                          <SelectItem value="Domi">Domi (Female)</SelectItem>
                          <SelectItem value="Elli">Elli (Female)</SelectItem>
                          <SelectItem value="Sarah">Sarah (Female)</SelectItem>
                          <SelectItem value="Charlie">Charlie (Female)</SelectItem>
                          <SelectItem value="Grace">Grace (Female)</SelectItem>
                          <SelectItem value="Lily">Lily (Female)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="agent_role" className="text-sm font-semibold text-gray-700 flex items-center">
                        Assistant Role
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Select value={formData.agent_role} onValueChange={(value) => setFormData({...formData, agent_role: value})}>
                        <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Receptionist">Receptionist</SelectItem>
                          <SelectItem value="Customer Service Representative">Customer Service Representative</SelectItem>
                          <SelectItem value="Appointment Coordinator">Appointment Coordinator</SelectItem>
                          <SelectItem value="Sales Assistant">Sales Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Premium Features Badge */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">Enterprise Features</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        Advanced conversation AI, real-time transcription, and intelligent call routing included
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-100">
                  <Button
                    type="submit"
                    disabled={quickSetupMutation.isPending || !formData.business_name || !formData.business_type || !formData.primary_location || !formData.agent_name}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                  >
                    {quickSetupMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        {loadingStep || "Creating Your AI Assistant..."}
                      </>
                    ) : (
                      <>
                        Deploy Assistant
                        <ArrowRight className="w-5 h-5 ml-3" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Feature Highlights */}
          <div className="mt-12">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Instant Deployment</h3>
                <p className="text-sm text-gray-600 text-center">Working voice assistant ready to take calls immediately</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Business Optimized</h3>
                <p className="text-sm text-gray-600 text-center">Customized for your industry and location</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Easy Integration</h3>
                <p className="text-sm text-gray-600 text-center">Get embed code to add to your website instantly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}