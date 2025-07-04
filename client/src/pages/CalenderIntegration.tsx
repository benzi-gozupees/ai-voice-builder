import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Bot, Calendar, BookOpen, Code, Settings, LogOut, Plus, TestTube, Edit, Copy, AlertTriangle, CheckCircle, Clock, Building, User, Sparkles, Zap, Phone, Play, Activity, EyeIcon, EyeOffIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarStatus {
    google: {
      isConnected: boolean;
      userEmail?: string;
      assistantCalendar?: {
        calendarName?: string;
        calendarId?: string;
        userEmail?: string;
      };
    };
    outlook: {
      isConnected: boolean;
      userEmail?: string;
    };
  }
export function CalendarIntegrationSection() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    // Fetch calendar connection status
    const { data: calendarStatus, isLoading } = useQuery({
      queryKey: ["/api/calendar/status"],
      queryFn: async () => {
        const response = await fetch('/api/calendar/status', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error("Failed to fetch calendar status");
        return response.json() as Promise<CalendarStatus>;
      }
    });
  
    // Disconnect calendar mutation
    const disconnectMutation = useMutation({
      mutationFn: async (provider: string) => {
        const response = await fetch(`/api/calendar/disconnect/${provider}`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!response.ok) throw new Error("Failed to disconnect calendar");
        return response.json();
      },
      onSuccess: (data, provider) => {
        toast({
          title: "Calendar disconnected",
          description: `${provider === 'google' ? 'Google Calendar' : 'Outlook'} has been disconnected successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/assistants"] });
      },
      onError: (error) => {
        toast({
          title: "Failed to disconnect",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    });
  
    const connectGoogle = () => {
      window.location.href = '/api/oauth/google/init';
    };
  
    const disconnectCalendar = (provider: string) => {
      disconnectMutation.mutate(provider);
    };
  
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Calendar Integration</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-20 h-4 bg-gray-150 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-48 h-4 bg-gray-150 rounded animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="w-32 h-4 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                  <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }
  
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Calendar Integration</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
          {/* Google Calendar Card */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center border border-green-200">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">Google Calendar</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Calendar</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">Sync appointments and manage scheduling</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Two-way sync</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Automatic booking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Conflict detection</span>
                </div>
              </div>
  
              {calendarStatus?.google?.isConnected ? (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  {calendarStatus.google.userEmail && (
                    <p className="text-xs text-gray-600 mb-2">
                      Connected as: {calendarStatus.google.userEmail}
                    </p>
                  )}
                  {calendarStatus.google.assistantCalendar?.calendarName && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Dedicated Calendar</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        Appointments will be booked in: <span className="font-medium">{calendarStatus.google.assistantCalendar.calendarName}</span>
                      </p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => disconnectCalendar('google')}
                    disabled={disconnectMutation.isPending}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>
              ) : (
                <div className="pt-4">
                  <Button 
                    onClick={connectGoogle}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold"
                  >
                    Connect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
  
          {/* Microsoft Outlook Card */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">Microsoft Outlook</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Calendar</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">Calendar and email integration</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Calendar sync</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Email integration</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Contact management</span>
                </div>
              </div>
  
              <div className="pt-4">
                <Button 
                  disabled
                  className="w-full bg-gray-400 text-white rounded-xl py-3 font-semibold cursor-not-allowed"
                >
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

