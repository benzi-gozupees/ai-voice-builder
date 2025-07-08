import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  Code, 
  Settings, 
  BookOpen, 
  AlertTriangle,
  CheckCircle,
  Copy,
  Phone,
  PhoneOff,
  Calendar
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Extend Window interface for VAPI SDK
declare global {
  interface Window {
    vapiSDK?: {
      run: (config: {
        apiKey: string;
        assistant: string;
        config: Record<string, any>;
      }) => void;
    };
  }
}

interface AssistantConfig {
  id: string;
  vapi_assistant_id: string;
  name: string;
  voice: string;
  instructions: string;
  is_active: boolean;
  business_name: string;
  industry: string;
  location: string;
  created_at: string;
  kb_configured: boolean;
  calendar_connected: boolean;
  prompt_updated: boolean;
}

export default function ConfigureAssistantPage() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/configure-assistant/:assistantId");
  const queryClient = useQueryClient();
  
  const vapiAssistantId = params?.assistantId || '';

  const [prompt, setPrompt] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [knowledgeEntries, setKnowledgeEntries] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [appointmentBookingEnabled, setAppointmentBookingEnabled] = useState<boolean | undefined>(undefined);
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);

  // Get current user data to find the assistant
  const { data: user } = useQuery<{ id: string; name: string; email: string }>({
    queryKey: ['/api/auth/user'],
  });

  // Fetch all assistants for the current user
  const { data: assistants, isLoading } = useQuery<any[]>({
    queryKey: ['/api/assistants'],
    enabled: !!user,
  });

  // Find the specific assistant by vapi_assistant_id
  const assistant = assistants?.find((a: any) => a.vapi_assistant_id === vapiAssistantId);

  // Fetch business info
  const { data: business } = useQuery({
    queryKey: ['/api/business'],
    enabled: !!user,
  });

  // Fetch existing knowledge base entries filtered by assistant's business
  const { data: knowledgeData, refetch: refetchKnowledge } = useQuery({
    queryKey: [`/api/knowledge-base/${user?.id}/${assistant?.business_name}`],
    enabled: !!user?.id && !!assistant?.business_name,
  });

  // Fetch calendar connection status
  const { data: calendarStatus } = useQuery<{
    google: { isConnected: boolean; userEmail?: string };
    outlook: { isConnected: boolean; userEmail?: string };
  }>({
    queryKey: ['/api/calendar/status'],
    enabled: !!user,
  });

  useEffect(() => {
    if (knowledgeData) {
      setKnowledgeEntries(Array.isArray(knowledgeData) ? knowledgeData : []);
    }
  }, [knowledgeData]);

  // Initialize appointment booking state from database
  useEffect(() => {
    if (assistant) {
      const assistantData = assistant as any;
      const bookingEnabled = Boolean(assistantData?.appointment_booking_enabled);
      setAppointmentBookingEnabled(bookingEnabled);
    }
  }, [assistant]);

  // VAPI call state management
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [vapiClient, setVapiClient] = useState<any>(null);

  // Initialize VAPI client with API key from backend
  useEffect(() => {
    const initVapi = async () => {
      try {
        // Get VAPI API key from backend configuration
        const response = await fetch('/api/public-widget-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: user?.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to get VAPI configuration');
        }

        const config = await response.json();
        const { default: Vapi } = await import('@vapi-ai/web');
        console.log('VAPI config received:', config);
        console.log('Creating VAPI client with API key:', config.apiKey);
        const client = new Vapi(config.apiKey);
        
        client.on('call-start', () => {
          console.log('Call started with assistant:', vapiAssistantId);
          setIsConnecting(false);
          setIsCallActive(true);
        });
        
        client.on('call-end', () => {
          console.log('Call ended');
          setIsCallActive(false);
        });
        
        client.on('error', (error: any) => {
          console.error('VAPI error event:', error);
          setIsConnecting(false);
          setIsCallActive(false);
        });
        
        client.on('message', (message: any) => {
          if (message.type === 'transcript') {
            console.log(`${message.role}: ${message.transcript}`);
          }
        });
        
        setVapiClient(client);
        console.log('VAPI client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize VAPI client:', error);
      }
    };

    if (user?.id) {
      initVapi();
    }
  }, [user?.id, vapiAssistantId]);

  // Start voice call with current assistant
  const startVoiceCall = async () => {
    if (!vapiClient || !vapiAssistantId) return;
    
    setIsConnecting(true);
    try {
      console.log('Starting call with assistant:', vapiAssistantId);
      console.log('VAPI client:', vapiClient);
      await vapiClient.start(vapiAssistantId);
    } catch (error) {
      console.error('Failed to start voice call:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsConnecting(false);
      toast({
        title: "Failed to start call",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Stop voice call
  const stopVoiceCall = () => {
    if (!vapiClient) return;
    
    try {
      vapiClient.stop();
    } catch (error) {
      console.error('Failed to stop voice call:', error);
    }
  };

  useEffect(() => {
    if (assistant) {
      const assistantData = assistant as any;
      setAssistantName(assistantData?.name || '');
      setFirstMessage(assistantData?.first_message || 'Hello! How can I help you today?');
      setSelectedVoice(assistantData?.voice || 'Rachel');
      
      // Use the stored system prompt from database (the actual prompt sent to VAPI)
      if (assistantData?.system_prompt) {
        setPrompt(assistantData.system_prompt);
      } else {
        // Fallback only if no system prompt is stored
        const businessName = assistantData?.business_name || 'your business';
        const industry = assistantData?.industry || 'your industry';
        const location = assistantData?.location || 'your location';
        const name = assistantData?.name || 'Assistant';
        
        setPrompt(`You are ${name}, the virtual receptionist for ${businessName}, a ${industry} business.

Identity & Purpose:
You are ${name}, the virtual receptionist for ${businessName}, a business specializing in ${industry}. Your primary role is to assist customers with inquiries, provide information about services, and help with appointment scheduling.

Personality & Communication Style:
- Be professional, friendly, and helpful
- Speak clearly and at a moderate pace
- Use a warm, welcoming tone
- Be patient and understanding with customers
- Ask clarifying questions when needed

Key Responsibilities:
1. Answer questions about ${businessName} services
2. Provide business hours and location information
3. Help customers schedule appointments
4. Transfer calls when necessary
5. Take messages for follow-up

Business Information:
- Business Name: ${businessName}
- Industry: ${industry}
- Location: ${location}

Important Guidelines:
- Always identify yourself as ${name} from ${businessName}
- If you don't know something, be honest and offer to take a message
- Keep conversations focused on business-related topics
- Be concise but thorough in your responses
- Always maintain a professional demeanor`);
      }
    }
  }, [assistant]);

  // Function to generate tool prompt chunk with actual IDs
  const generateToolPromptChunk = (tenantId: string, assistantId: string) => `

Tool Invocation Logic (insert after availability step)
When the user is ready to check available times:

Use the tool Google_Calendar_Availability to check open appointment slots.
Send the following in the request body:
if the user does not provide a preferred time use tomorrows date that you can calculate by using todays date and time that is {{now}}

{
  "tenantId": "${tenantId}",
  "assistantId": "${assistantId}",
  "preferredDate": "{{preferred_date}}"
}
Use the returned availability list to present 2–3 options conversationally:

"I've got {{slot_1}}, {{slot_2}}, or {{slot_3}}. Which one works best for you?"

🗓️ Tool to Book Appointment (after user selects a slot)
Once confirmed, call the tool Google_Calendar_Event with the following payload:

{
  "tenantId": "${tenantId}",
  "assistantId": "${assistantId}",
  "fullName": "{{user_name}}",
  "email": "{{user_email}}",
  "startDateTime": "{{confirmed_time}}",
  "timeZone": "{{user_timezone}}",
  "description": "{{user_type}} patient requesting {{service}} under {{department}}. {{notes}} Contact: {{phone_number}}"
}
Ensure that the assistant:

Asks for all required values one at a time (already handled in your flow)

Compiles the description naturally

Validates all key fields before calling the tool

Repeats the date/time and service before confirming booking`;

  const savePromptMutation = useMutation({
    mutationFn: async (data: { prompt: string; name: string; voice?: string; firstMessage?: string }) => {
      // Use our backend endpoint which updates both VAPI and database
      const response = await fetch(`/api/assistant/${vapiAssistantId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.name,
          voice: data.voice,
          first_message: data.firstMessage,
          system_prompt: data.prompt
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update assistant: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assistant updated successfully",
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assistants'] });
    },
    onError: () => {
      toast({
        title: "Error updating assistant",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling appointment booking
  const toggleAppointmentBookingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      setIsUpdatingBooking(true);
      
      console.log('Toggling appointment booking:', enabled);
      console.log('VAPI Assistant ID:', vapiAssistantId);
      console.log('VAPI Key available:', !!import.meta.env.VITE_VAPI_PRIVATE_KEY);
      
      // First, get current assistant config from VAPI
      const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!vapiResponse.ok) {
        const errorText = await vapiResponse.text();
        console.error('VAPI fetch error:', vapiResponse.status, errorText);
        throw new Error(`Failed to fetch assistant config: ${vapiResponse.status} ${errorText}`);
      }
      const currentConfig = await vapiResponse.json();
      console.log('Current config fetched:', currentConfig);
      
      let updatedInstructions = currentConfig.model?.messages?.[0]?.content || prompt;
      let updatedToolIds = [...(currentConfig.model?.toolIds || [])];
      
      // Tool IDs from the requirements
      const calendarToolIds = [
        'b0620a2a-b996-4120-a797-cec3035a6119', // Google_Calendar_Availability
        'd1107698-f804-4d9a-89a2-e3b35d009e6e'  // Google_Calendar_Event
      ];
      
      if (enabled) {
        // Generate tool prompt chunk with actual tenant and assistant IDs
        const toolPromptChunk = generateToolPromptChunk(user?.id || '', vapiAssistantId);
        
        // Check if tool prompt chunk is already included
        if (!updatedInstructions.includes('Tool Invocation Logic')) {
          updatedInstructions += toolPromptChunk;
        }
        
        // Add tool IDs if not already present
        calendarToolIds.forEach(toolId => {
          if (!updatedToolIds.includes(toolId)) {
            updatedToolIds.push(toolId);
          }
        });
      } else {
        // Remove tool prompt chunk by finding and removing the Tool Invocation Logic section
        const toolLogicStart = updatedInstructions.indexOf('Tool Invocation Logic');
        if (toolLogicStart !== -1) {
          const toolLogicEnd = updatedInstructions.indexOf('Repeats the date/time and service before confirming booking');
          if (toolLogicEnd !== -1) {
            // Remove from start of "Tool Invocation Logic" to end of booking section
            const endPos = toolLogicEnd + 'Repeats the date/time and service before confirming booking'.length;
            updatedInstructions = updatedInstructions.substring(0, toolLogicStart) + 
                                 updatedInstructions.substring(endPos);
          }
        }
        
        // Remove calendar tool IDs
        updatedToolIds = updatedToolIds.filter(toolId => 
          !calendarToolIds.includes(toolId)
        );
      }
      
      // Update assistant with new config - use correct VAPI format with toolIds
      const updatePayload = {
        name: currentConfig.name,
        voice: currentConfig.voice,
        model: {
          ...currentConfig.model,
          messages: [{
            role: 'system',
            content: updatedInstructions
          }],
          toolIds: updatedToolIds
        }
      };
      
      console.log('Update payload:', JSON.stringify(updatePayload, null, 2));
      
      const updateResponse = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('VAPI update error:', updateResponse.status, errorText);
        throw new Error(`Failed to update assistant: ${updateResponse.status} ${errorText}`);
      }
      const result = await updateResponse.json();
      console.log('Update successful:', result);
      
      // After successful VAPI update, save toggle state and updated prompt to database
      const dbResponse = await fetch(`/api/assistant/${vapiAssistantId}/toggle-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          enabled,
          updated_prompt: updatedInstructions
        })
      });
      
      if (!dbResponse.ok) {
        console.error('Database update failed but VAPI was updated');
        // Don't throw error since VAPI was successfully updated
      } else {
        console.log('Database toggle state updated successfully');
      }
      
      // Verify the tool IDs were properly added/removed
      if (result.model?.toolIds) {
        const calendarToolIds = [
          'b0620a2a-b996-4120-a797-cec3035a6119',
          'd1107698-f804-4d9a-89a2-e3b35d009e6e'
        ];
        const hasCalendarTools = calendarToolIds.some(toolId => 
          result.model.toolIds.includes(toolId)
        );
        console.log(`Calendar tool IDs ${enabled ? 'added' : 'removed'}:`, hasCalendarTools);
        console.log('Current tool IDs:', result.model.toolIds);
        
        if (enabled) {
          // Variables for VAPI tools are passed via the webhook request body
          const variablesPayload = {
            tenantId: user?.id,
            assistantId: vapiAssistantId
          };
          console.log('Variables will be passed to webhooks:', variablesPayload);
        }
      }
      
      // Verify prompt changes
      const hasToolInstructions = result.model?.messages?.[0]?.content?.includes('Tool Invocation Logic');
      console.log(`Tool instructions ${enabled ? 'added to' : 'removed from'} prompt:`, hasToolInstructions === enabled);
      
      // Log the actual IDs being used for verification
      if (enabled) {
        console.log('Hardcoded tenant ID in prompt:', user?.id);
        console.log('Hardcoded assistant ID in prompt:', vapiAssistantId);
      }
      
      return result;
    },
    onSuccess: (result, enabled) => {
      setAppointmentBookingEnabled(enabled);
      
      // Update the local prompt state to reflect the changes
      if (result.model?.messages?.[0]?.content) {
        setPrompt(result.model.messages[0].content);
      }
      
      // Invalidate queries to refresh assistant data from database
      queryClient.invalidateQueries({ queryKey: ['/api/assistants'] });
      
      toast({
        title: enabled ? "Appointment booking enabled" : "Appointment booking disabled",
        description: enabled ? "Your assistant can now book appointments" : "Appointment booking has been disabled",
      });
    },
    onError: (error) => {
      console.error('Appointment booking toggle error:', error);
      toast({
        title: "Failed to update appointment booking",
        description: error.message || "Please check your connection and try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdatingBooking(false);
    },
  });

  const scrapeWebsiteMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await fetch('/api/quick-setup/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          website_url: websiteUrl,
          business_name: assistant?.name || 'Business'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to scrape website');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Website content processed successfully",
        description: `Processed ${data.pagesProcessed || 0} pages and created ${data.filesCount || 0} knowledge base files`,
      });
      refetchKnowledge();
      setWebsiteUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process website",
        description: error.message || "Please check the URL and try again.",
        variant: "destructive",
      });
      setIsScrapingWebsite(false);
    },
    onSettled: () => {
      setIsScrapingWebsite(false);
    },
  });

  const handleScrapeWebsite = () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "Website URL required",
        description: "Please enter a valid website URL",
        variant: "destructive",
      });
      return;
    }
    
    setIsScrapingWebsite(true);
    scrapeWebsiteMutation.mutate(websiteUrl);
  };

  // File upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check file size (800kb limit)
    if (file.size > 800 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 800KB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', user?.id || '');
      formData.append('businessName', assistant?.business_name || '');
      formData.append('vapiAssistantId', vapiAssistantId || '');

      const response = await fetch('/api/knowledge-base/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json();
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been added to your knowledge base`,
      });
      
      // Refresh knowledge base
      refetchKnowledge();
      
      // Clear selected file
      setSelectedFile(null);
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  // Removed auto-sync to prevent duplicate knowledge base files
  // Knowledge base files are now preserved during assistant updates

  const copyEmbedCode = () => {
    const embedCode = `<!-- Voice Assistant Widget - Secure Embed -->
<script src="${window.location.origin}/widget-production.js?v=${Date.now()}" 
        data-tenant-id="${user?.id}" 
        data-assistant-id="${vapiAssistantId}"
        data-api-base="${window.location.origin}"></script>`;
    
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Embed code copied!",
      description: "Add this code to any website to enable voice assistant.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading assistant configuration...</p>
        </div>
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assistant Not Found</h2>
          <p className="text-gray-600 mb-4">The assistant you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{(assistant as any)?.name || 'Assistant'}</h1>
                <p className="text-sm text-gray-600">{(assistant as any)?.business_name || ''} • {(assistant as any)?.industry || ''}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => savePromptMutation.mutate({ 
                  prompt: prompt, 
                  name: assistantName, 
                  voice: selectedVoice, 
                  firstMessage: firstMessage 
                })}
                disabled={savePromptMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={isCallActive ? stopVoiceCall : startVoiceCall}
                disabled={!vapiClient || !vapiAssistantId || isConnecting}
                variant={isCallActive ? "destructive" : "outline"}
                className={isCallActive ? "bg-red-600 hover:bg-red-700" : isConnecting ? "border-orange-600 text-orange-600" : "border-green-600 text-green-600 hover:bg-green-50"}
              >
                {isCallActive ? (
                  <>
                    <PhoneOff className="w-4 h-4 mr-2" />
                    End Call
                  </>
                ) : isConnecting ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Talk To Assistant
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Assistant Created</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Voice Widget Active</span>
                </div>

                <div className="flex items-center space-x-3">
                  {knowledgeEntries.length > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="text-sm">Knowledge Base</span>
                </div>
                <div className="flex items-center justify-between space-x-3">
                  <div className="flex items-center space-x-3">
                    {calendarStatus?.google?.isConnected ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {calendarStatus?.google?.isConnected ? 'Calendar Integration Enabled' : 'Calendar Integration'}
                    </span>
                  </div>
                  {!calendarStatus?.google?.isConnected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/api/oauth/google/init';
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </div>
                
                {/* Appointment Booking Toggle - Only show if calendar is connected */}
                {calendarStatus?.google?.isConnected && (
                  <div className="flex items-center justify-between space-x-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="text-sm">Enable Appointment Booking</span>
                    </div>
                    <Switch
                      checked={appointmentBookingEnabled || false}
                      onCheckedChange={(checked) => {
                        if (!isUpdatingBooking) {
                          toggleAppointmentBookingMutation.mutate(checked);
                        }
                      }}
                      disabled={isUpdatingBooking}
                    />
                  </div>
                )}
                
                {/* Calendar disconnect button */}
                {calendarStatus?.google?.isConnected && (
                  <div className="pt-2 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        fetch('/api/calendar/disconnect/google', {
                          method: 'POST',
                          credentials: 'include'
                        })
                        .then(() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/calendar/status'] });
                          toast({
                            title: "Calendar disconnected",
                            description: "Google Calendar has been disconnected",
                          });
                        })
                        .catch((error) => {
                          console.error('Disconnect error:', error);
                          toast({
                            title: "Failed to disconnect",
                            description: "Please try again",
                            variant: "destructive",
                          });
                        });
                      }}
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Assistant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">ASSISTANT ID</Label>
                  <p className="text-sm font-mono text-gray-900">{(assistant as any)?.vapi_assistant_id || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">STATUS</Label>
                  <Badge variant={(assistant as any)?.is_active ? "default" : "secondary"} className="ml-0">
                    {(assistant as any)?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">CREATED</Label>
                  <p className="text-sm text-gray-900">
                    {(assistant as any)?.created_at ? new Date((assistant as any).created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <Tabs defaultValue="prompt" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="prompt">
                  <Settings className="w-4 h-4 mr-2" />
                  Assistant Details
                </TabsTrigger>
                <TabsTrigger value="knowledge">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Knowledge Base
                </TabsTrigger>
                <TabsTrigger value="embed">
                  <Code className="w-4 h-4 mr-2" />
                  Embed Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assistant Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="assistant-name">Assistant Name</Label>
                          <Input
                            id="assistant-name"
                            value={assistantName}
                            onChange={(e) => setAssistantName(e.target.value)}
                            placeholder="Enter assistant name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="first-message">First Message</Label>
                          <Textarea
                            id="first-message"
                            value={firstMessage}
                            onChange={(e) => setFirstMessage(e.target.value)}
                            rows={4}
                            placeholder="Enter the greeting message for your assistant..."
                          />
                          <p className="text-xs text-gray-500">
                            This is the first message customers will hear when they start a conversation.
                          </p>
                        </div>

                        
                      </div>

                      {/* Right Column - Assistant Information */}
                      <div className="space-y-6">
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          <h3 className="font-medium text-gray-900">Assistant Information</h3>
                          
                          <div>
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Assistant ID</Label>
                            <p className="text-sm text-gray-900 font-mono break-all">
                              {(assistant as any)?.vapiAssistantId || 'N/A'}
                            </p>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Status</Label>
                            <div className="mt-1">
                              <Badge variant={(assistant as any)?.is_active ? "default" : "secondary"}>
                                {(assistant as any)?.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Created</Label>
                            <p className="text-sm text-gray-900">
                              {(assistant as any)?.created_at ? new Date((assistant as any).created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Business</Label>
                            <p className="text-sm text-gray-900">
                              {(assistant as any)?.business_name || 'N/A'}
                            </p>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Industry</Label>
                            <p className="text-sm text-gray-900">
                              {(assistant as any)?.industry || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="knowledge" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Knowledge Base</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Website Scraping Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Add Website Content</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Import content from your website to help your assistant answer questions about your business.
                      </p>
                      <div className="flex space-x-3">
                        <Input
                          placeholder="https://your-website.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleScrapeWebsite}
                          disabled={scrapeWebsiteMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {scrapeWebsiteMutation.isPending ? 'Processing...' : 'Import Content'}
                        </Button>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Upload Files</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Upload documents, PDFs, or text files to add to your knowledge base. Maximum file size: 800KB.
                      </p>
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          disabled={isUploadingFile}
                          className="hidden"
                          id="file-upload"
                          accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
                        />
                        <label
                          htmlFor="file-upload"
                          className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            isUploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploadingFile ? 'Uploading...' : 'Choose File'}
                        </label>
                        {selectedFile && !isUploadingFile && (
                          <span className="text-sm text-gray-600">
                            {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Supported formats: PDF, DOC, DOCX, TXT, MD, CSV, JSON
                      </p>
                    </div>

                    {/* Existing Knowledge Entries */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Knowledge Base Files</h4>
                      {knowledgeEntries.length > 0 ? (
                        <div className="space-y-3">
                          {knowledgeEntries.map((entry, index) => (
                            <div key={index} className={`border rounded-lg p-4 ${
                              entry.file_type === 'uploaded' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium text-gray-900">{entry.display_name || entry.file_name}</h5>
                                    {entry.file_type === 'uploaded' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Uploaded File
                                      </span>
                                    )}
                                    {entry.file_type === 'raw_content' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Website Content
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className="text-xs text-gray-500">
                                      File {entry.file_sequence} • {entry.size_kb}KB
                                    </span>
                                    {entry.pages_count > 0 && (
                                      <span className="text-xs text-gray-500">
                                        {entry.pages_count} pages processed
                                      </span>
                                    )}
                                    {entry.vapi_file_id && (
                                      <span className="text-xs text-green-600">✓ Synced</span>
                                    )}
                                    {!entry.vapi_file_id && (
                                      <span className="text-xs text-yellow-600">
                                        ⚠ Pending sync
                                      </span>
                                    )}
                                  </div>
                                  {entry.created_at && (
                                    <div className="mt-1">
                                      <span className="text-xs text-gray-400">
                                        Created: {new Date(entry.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No knowledge base files yet</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Import website content or upload files to get started
                          </p>
                        </div>
                      )}
                    </div>

                    
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="embed" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Embed Code</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Website Embed Code</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyEmbedCode}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Code
                        </Button>
                      </div>
                      <pre className="text-sm text-gray-800 bg-white p-4 rounded border overflow-x-auto">
{`<!-- Voice Assistant Widget - Secure Embed -->
<script src="${window.location.origin}/widget-production.js?v=${Date.now()}" 
        data-tenant-id="${user?.id}" 
        data-assistant-id="${vapiAssistantId}"
        data-api-base="${window.location.origin}"></script>`}
                      </pre>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">How to use this code:</h4>
                      <ol className="text-sm text-blue-800 space-y-1">
                        <li>1. Copy the embed code above</li>
                        <li>2. Paste it into your website's HTML before the closing &lt;/body&gt; tag</li>
                        <li>3. The voice assistant widget will appear on your website</li>
                        <li>4. Visitors can click the widget to start a voice conversation</li>
                      </ol>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-900 mb-2">⚠️ Important: Microphone Permissions</h4>
                      <div className="text-sm text-amber-800 space-y-2">
                        <p>For voice functionality to work properly on your website, you need to:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>Use HTTPS:</strong> Voice features only work on secure websites (https://)</li>
                          <li><strong>Add Permissions Policy:</strong> Add this to your website's HTML &lt;head&gt; section:</li>
                        </ul>
                        <div className="bg-white rounded border p-3 mt-2">
                          <code className="text-xs text-gray-800 break-all">
                            &lt;meta http-equiv="Permissions-Policy" content="microphone=*, camera=*, autoplay=*"&gt;
                          </code>
                        </div>
                        <p className="mt-2">
                          <strong>Note:</strong> Visitors will be prompted to allow microphone access when they first use the voice assistant.
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">✅ Troubleshooting Tips</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• If voice isn't working, check browser console for permission errors</li>
                        <li>• Ensure your website is served over HTTPS</li>
                        <li>• Test on different browsers (Chrome, Firefox, Safari)</li>
                        <li>• Users need to manually allow microphone access when prompted</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}