import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Copy, ExternalLink, Settings, Mic, Code, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssistantDetails {
  id: string;
  vapi_assistant_id: string;
  name: string;
  voice: string;
  is_active: boolean;
  business_name: string;
  industry: string;
  location: string;
}

export default function QuickSetupSuccessPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [tenantId, setTenantId] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenant = params.get("tenant");
    if (tenant) {
      setTenantId(tenant);
    }
  }, []);

  const { data: assistant, isLoading, error } = useQuery({
    queryKey: ["/api/assistant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const response = await fetch(`/api/assistant/${tenantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch assistant details");
      }
      return response.json();
    },
    enabled: !!tenantId
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const embedCode = tenantId && assistant ? `<!-- Voice Assistant Widget - Secure Embed -->
<script src="${window.location.origin}/widget-production.js?v=${Date.now()}" 
        data-tenant-id="${tenantId}" 
        data-assistant-id="${assistant.vapi_assistant_id}"
        data-api-base="${window.location.origin}"></script>` : "";

  const testCallCode = `<!-- Test Call Button -->
<button onclick="startTestCall()" style="
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
">
  🎤 Test Call Assistant
</button>

<script>
function startTestCall() {
  // This would integrate with VAPI's test call functionality
  alert('Test call feature will be available once VAPI integration is complete');
}
</script>`;

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Invalid or missing tenant ID</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/quick-setup")}
            >
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your assistant...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !assistant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Failed to load assistant details</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/quick-setup")}
            >
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Assistant Created Successfully!
          </h1>
          <p className="text-lg text-gray-600">
            {assistant.name} is ready to help customers at {assistant.business_name}
          </p>
        </div>

        {/* Assistant Details */}
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Mic className="w-6 h-6" />
                Your AI Assistant
              </CardTitle>
              <CardDescription className="text-green-100">
                Ready to take calls and help your customers
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Assistant Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{assistant.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Business:</span>
                        <span className="font-medium">{assistant.business_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Industry:</span>
                        <span className="font-medium">{assistant.industry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{assistant.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">What Your Assistant Can Do</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Answer calls professionally
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Provide business information
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Help with basic inquiries
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Collect customer details
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Code */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Code className="w-6 h-6" />
                Integration & Testing
              </CardTitle>
              <CardDescription className="text-blue-100">
                Add your assistant to your website or test it now
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <Tabs defaultValue="embed" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="embed">Website Embed</TabsTrigger>
                  <TabsTrigger value="test">Test Call</TabsTrigger>
                </TabsList>
                
                <TabsContent value="embed" className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Embed Code</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Copy and paste this code into your website to add the voice assistant widget:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 relative">
                      <pre className="text-sm text-gray-800 overflow-x-auto">
                        <code>{embedCode}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(embedCode, "Embed code")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-2">⚠️ Important: Microphone Permissions</h4>
                    <div className="text-sm text-amber-800 space-y-2">
                      <p>For voice functionality to work properly on your website:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Use HTTPS:</strong> Voice features only work on secure websites</li>
                        <li><strong>Add to your website's HTML &lt;head&gt;:</strong></li>
                      </ul>
                      <div className="bg-white rounded border p-3 mt-2">
                        <code className="text-xs text-gray-800 break-all">
                          &lt;meta http-equiv="Permissions-Policy" content="microphone=*, camera=*, autoplay=*"&gt;
                        </code>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="test" className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Test Your Assistant</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Use this code to add a test call button to your website:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 relative">
                      <pre className="text-sm text-gray-800 overflow-x-auto">
                        <code>{testCallCode}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(testCallCode, "Test call code")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">VAPI Assistant ID</h4>
                          <p className="text-sm text-blue-700 font-mono">{assistant.vapi_assistant_id}</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Use this ID for direct VAPI integration or advanced testing
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                What's Next?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Advanced Configuration</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Add knowledge base, calendar integration, and custom tools
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setLocation(`/dashboard?tenant=${tenantId}`)}
                  >
                    Configure Now
                    <Settings className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Create Another Assistant</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Set up assistants for other businesses or locations
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => setLocation("/quick-setup")}
                  >
                    New Assistant
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}