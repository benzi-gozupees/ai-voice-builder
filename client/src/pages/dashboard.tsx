import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Home, 
  Bot, 
  Calendar, 
  BookOpen, 
  Code, 
  Settings, 
  LogOut,
  Plus,
  TestTube,
  Edit,
  Copy,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  User,
  Sparkles,
  Zap,
  Phone,
  Play,
  Activity,
  EyeIcon,
  EyeOffIcon,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import {Knowledge} from "./Knowledge";
import { CalendarIntegrationSection } from "./CalenderIntegration";
import { AccountSettingsSection } from "./AccountSetting";
import { AppointmentsSection } from "./Appointment";
import { CallLogsSection } from "./CallLogs";
import  {AssistantCard}  from "@/components/Assistantcard";
import { EmptyState } from "@/components/EmptyState";
import { sidebarItems } from "@/components/SideBar";

interface Assistant {
  id: string;
  tenant_id: string;
  vapi_assistant_id: string;
  name: string;
  voice: string;
  is_active: boolean;
  business_name: string;
  industry: string;
  location: string;
  created_at: string;
    kb_configured?: boolean;
    prompt_updated?: boolean;
  }

export default function DashboardPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("assistants");
  const queryClient = useQueryClient();
  
  // Get current user first
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch(`/api/auth/user`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    }
  });

  const { data: assistants, isLoading, error } = useQuery({
    queryKey: ["/api/assistants", currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/assistants`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error("Failed to fetch assistants");
      }
      return response.json();
    },
    enabled: !!currentUser // Only run when we have user data
  });

  const { data: businessInfo } = useQuery({
    queryKey: ["/api/business", currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/business`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser
  });

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Clear all React Query cache to prevent data leakage between users
        queryClient.clear();
        
        toast({
          title: "Signed out successfully",
          description: "You have been logged out of your account.",
        });
        setLocation('/');
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "There was an issue signing you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const testAssistantCall = async (assistant: Assistant) => {
    try {
      const response = await fetch("/api/public-widget-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenantId: assistant.tenant_id }),
      });

      if (!response.ok) {
        throw new Error('Failed to load assistant configuration');
      }

      const { assistantId, apiKey } = await response.json();
      console.log('Starting call with assistant:', assistantId);
      
      // Create a direct VAPI call using iframe approach
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.bottom = '20px';
      iframe.style.right = '20px';
      iframe.style.width = '400px';
      iframe.style.height = '300px';
      iframe.style.border = '1px solid #ccc';
      iframe.style.borderRadius = '12px';
      iframe.style.zIndex = '9999';
      iframe.style.backgroundColor = '#fff';
      
      const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Voice Assistant</title>
          <script src="https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.umd.js"></script>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center;">
            <h3>Voice Assistant Test</h3>
            <button id="startCall" style="background: #12A594; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer;">Start Call</button>
            <button id="endCall" style="background: #ff4444; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-left: 10px; display: none;">End Call</button>
            <div id="status" style="margin-top: 20px; font-size: 14px; color: #666;"></div>
          </div>
          
          <script>
            const vapi = new Vapi('${apiKey}');
            const startBtn = document.getElementById('startCall');
            const endBtn = document.getElementById('endCall');
            const status = document.getElementById('status');
            
            let isConnected = false;
            
            vapi.on('call-start', () => {
              console.log('Call started');
              status.textContent = 'Connected - Speak now!';
              startBtn.style.display = 'none';
              endBtn.style.display = 'inline-block';
              isConnected = true;
            });
            
            vapi.on('call-end', () => {
              console.log('Call ended');
              status.textContent = 'Call ended';
              startBtn.style.display = 'inline-block';
              endBtn.style.display = 'none';
              isConnected = false;
            });
            
            vapi.on('error', (error) => {
              console.error('Call error:', error);
              status.textContent = 'Error: ' + error.message;
            });
            
            startBtn.onclick = () => {
              status.textContent = 'Connecting...';
              vapi.start('${assistantId}');
            };
            
            endBtn.onclick = () => {
              vapi.stop();
            };
            
            // Auto-start the call
            setTimeout(() => {
              startBtn.click();
            }, 500);
          </script>
        </body>
        </html>
      `;
      
      iframe.srcdoc = iframeContent;
      document.body.appendChild(iframe);
      
      // Add close button for iframe
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '×';
      closeBtn.style.position = 'fixed';
      closeBtn.style.bottom = '305px';
      closeBtn.style.right = '25px';
      closeBtn.style.width = '30px';
      closeBtn.style.height = '30px';
      closeBtn.style.background = '#ff4444';
      closeBtn.style.color = 'white';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.zIndex = '10000';
      closeBtn.onclick = () => {
        document.body.removeChild(iframe);
        document.body.removeChild(closeBtn);
      };
      document.body.appendChild(closeBtn);
      
      toast({
        title: "Test interface loaded",
        description: "Voice assistant test window is now active.",
      });
    } catch (error) {
      console.error('Test call error:', error);
      toast({
        title: "Test failed",
        description: "Unable to start test call. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyEmbedCode = (tenantId: string, assistantId: string) => {
    const embedCode = `<!-- Voice Assistant Widget - Secure Embed -->
<script src="${window.location.origin}/widget-production.js?v=${Date.now()}" 
        data-tenant-id="${tenantId}" 
        data-assistant-id="${assistantId}"
        data-api-base="${window.location.origin}"></script>`;
    
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Embed code copied!",
      description: "Add this code to any website to enable voice assistant.",
    });
  };

  const renderMainContent = () => {
    if (activeSection === "assistants") {
      if (isLoading) {
        return (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-6 bg-gray-200 rounded-lg animate-pulse"></div>
                          <div className="w-20 h-4 bg-gray-150 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="w-48 h-4 bg-gray-150 rounded animate-pulse"></div>
                    </div>
                    <div className="w-24 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-150 rounded-lg animate-pulse"></div>
                      <div className="space-y-1">
                        <div className="w-16 h-4 bg-gray-150 rounded animate-pulse"></div>
                        <div className="w-20 h-3 bg-gray-100 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-150 rounded-lg animate-pulse"></div>
                      <div className="space-y-1">
                        <div className="w-12 h-4 bg-gray-150 rounded animate-pulse"></div>
                        <div className="w-16 h-3 bg-gray-100 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-12 bg-gray-150 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }

      if (error || !assistants || assistants.length === 0) {
        return <EmptyState />;
      }

      return (
        <div className="space-y-6">
          {/* Success Banner for New Assistants */}
          {assistants && assistants.length > 0 && (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Assistant Created Successfully!
                    </h3>
                    <p className="text-green-700 mb-4">
                      Your AI voice assistant "{assistants[0]?.name}" is now active and ready to handle customer calls. 
                      Use the embed code below to add it to your website.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">Embed Code</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyEmbedCode(assistants[0]?.tenant_id || '', assistants[0]?.vapi_assistant_id || '')}
                          className="text-gray-300 hover:text-white"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <code className="text-sm text-green-400 font-mono block overflow-x-auto">
                        {`<!-- Voice Assistant Widget - Secure Embed -->
<script src="${window.location.origin}/widget-production.js?v=${Date.now()}" 
        data-tenant-id="${assistants[0]?.tenant_id || ''}" 
        data-assistant-id="${assistants[0]?.vapi_assistant_id || ''}"
        data-api-base="${window.location.origin}"></script>`}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Assistants</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assistants.map((assistant:any) => (
             <AssistantCard key={assistant.id} assistant={assistant} />
          ))}
          </div>
        </div>
      );
    }

    if (activeSection === "appointments") {
      return <AppointmentsSection />;
    }

    if (activeSection === "calls") {
      return <CallLogsSection />;
    }

    if (activeSection === "calendar") {
      return <CalendarIntegrationSection />;
    }

    if (activeSection === "settings") {
      return <AccountSettingsSection/>;
    }

    if (activeSection === "home") {
      return <AnalyticsDashboard />;
    }

    if (activeSection === "knowledge") {
      return <Knowledge />;
    }

    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {sidebarItems.find(item => item.id === activeSection)?.label}
        </h3>
        <p className="text-gray-600">This section is coming soon.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-100/50"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)"
        }}></div>
      </div>

      {/* Premium Sidebar */}
      <div className="w-72 bg-white/80 backdrop-blur-xl shadow-2xl border-r border-white/20 flex flex-col relative z-10">
        {/* Enhanced Header */}
        <div className="p-8 border-b border-gray-100/50 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl blur opacity-25"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold">Voice Assistant</h1>
              <p className="text-sm text-blue-100 font-medium">AI Management Platform</p>
            </div>
          </div>
          
          {businessInfo && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-white">{businessInfo.business_name}</span>
                  <p className="text-xs text-blue-100 mt-1">
                    Business Dashboard
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Enhanced Navigation */}
        <nav className="flex-1 p-6">
          <ul className="space-y-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-700 hover:bg-gray-100/80 hover:shadow-sm"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Enhanced Footer */}
        <div className="p-6 border-t border-gray-100/50">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Premium Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 px-8 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                  {sidebarItems.find(item => item.id === activeSection)?.label || "Dashboard"}
                </h2>
                {businessInfo && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">{businessInfo.business_name}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Manage your AI voice assistants and configurations
              </p>
            </div>
            {activeSection === "assistants" && (
              <Button 
                onClick={() => setLocation("/quick-setup")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Assistant
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}