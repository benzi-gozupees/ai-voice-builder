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

interface CallLog {
  id: string;
  tenant_id: string;
  assistant_id: string;
  assistant_name: string;
  phone_customer?: string;
  phone_assistant?: string;
  started_at: string;
  duration: number;
  result?: string;
  ended_reason: string;
  audio_url?: string;
  transcript?: any;
  synced_at: string;
}

export function CallLogsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  // Fetch call logs
  const { data: callLogs, isLoading: callLogsLoading } = useQuery({
    queryKey: ["/api/call-logs"],
    queryFn: async () => {
      const response = await fetch('/api/call-logs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch call logs");
      return response.json() as Promise<CallLog[]>;
    }
  });

  // Sync call logs mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/call-logs/sync', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to sync call logs");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call logs synced",
        description: data.message || `${data.syncedCount} call logs synced successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/call-logs"] });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: "Failed to sync call logs. Please try again.",
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getResultBadge = (result?: string) => {
    if (!result) {
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
          No Result
        </Badge>
      );
    }
    
    if (result === 'pass' || result === 'success') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Success
        </Badge>
      );
    }
    
    if (result === 'fail' || result === 'failed') {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Failed
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
        {result}
      </Badge>
    );
  };

  const getEndedReasonBadge = (reason: string) => {
    const reasonMap: { [key: string]: { color: string; label: string } } = {
      'user_ended': { color: 'blue', label: 'User Ended' },
      'assistant_ended': { color: 'green', label: 'Assistant Ended' },
      'silence_timeout': { color: 'yellow', label: 'Silence Timeout' },
      'error': { color: 'red', label: 'Error' },
      'unknown': { color: 'gray', label: 'Unknown' }
    };

    const config = reasonMap[reason] || { color: 'gray', label: reason };
    
    return (
      <Badge className={`bg-${config.color}-100 text-${config.color}-700 border-${config.color}-200`}>
        {config.label}
      </Badge>
    );
  };

  const copyCallId = (callId: string) => {
    const shortId = callId.substring(0, 8) + '...';
    navigator.clipboard.writeText(callId);
    toast({
      title: "Call ID copied",
      description: `${shortId} copied to clipboard`,
    });
  };

  if (callLogsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <div className="w-32 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-24 h-4 bg-gray-150 rounded animate-pulse"></div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="grid gap-2">
                    <div className="w-48 h-4 bg-gray-150 rounded animate-pulse"></div>
                    <div className="w-36 h-4 bg-gray-150 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-2"
        >
          {syncMutation.isPending ? (
            <>
              <Activity className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      {!callLogs || callLogs.length === 0 ? (
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Call Logs Found</h3>
            <p className="text-gray-600 mb-6">
              When your AI assistant receives calls, they will appear here. Click "Sync Now" to fetch the latest call logs from VAPI.
            </p>
            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-2"
            >
              {syncMutation.isPending ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Sync Call Logs
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {callLogs.map((call) => (
            <Card 
              key={call.id} 
              className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-2xl overflow-hidden group cursor-pointer"
              onClick={() => setSelectedCall(call)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{call.assistant_name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCallId(call.id);
                        }}
                        className="text-gray-500 hover:text-gray-700 p-1"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDate(call.started_at)} at {formatTime(call.started_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getResultBadge(call.result)}
                    {getEndedReasonBadge(call.ended_reason)}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Customer</p>
                      <p className="text-sm text-gray-600">{call.phone_customer || 'Web Call'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Duration</p>
                      <p className="text-sm text-gray-600">{formatDuration(call.duration)}</p>
                    </div>
                  </div>

                  {call.audio_url && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Play className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Recording</p>
                        <p className="text-sm text-blue-600">Available</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  Call ID: {call.id.substring(0, 8)}... • Last synced: {formatDate(call.synced_at)} at {formatTime(call.synced_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call Details Drawer - Placeholder for now */}
      {selectedCall && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setSelectedCall(null)}
        >
          <div 
            className="w-96 bg-white h-full shadow-2xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Call Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCall(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Recording</h4>
                {selectedCall.audio_url ? (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-4 h-4" />
                      <span className="text-sm">Audio Recording</span>
                    </div>
                    <audio controls className="w-full">
                      <source src={selectedCall.audio_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No recording available</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Transcript</h4>
                {selectedCall.transcript ? (
                  <div className="p-4 border rounded-lg max-h-64 overflow-y-auto">
                    <div className="space-y-2 text-sm">
                      {typeof selectedCall.transcript === 'string' ? (
                        <p>{selectedCall.transcript}</p>
                      ) : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedCall.transcript, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No transcript available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}