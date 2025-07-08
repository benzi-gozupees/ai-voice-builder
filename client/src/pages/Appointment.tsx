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

interface Appointment {
    id: string;
    assistant_id: string;
    calendar_event_id: string;
    start_time: string;
    end_time: string;
    summary: string;
    description?: string;
    email?: string;
    phone?: string;
    service?: string;
    patient_type?: string;
    synced_at: string;
  }

export function AppointmentsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await fetch('/api/appointments', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return response.json() as Promise<Appointment[]>;
    }
  });

  // Sync appointments mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/appointments/sync', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to sync appointments");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Appointments synced",
        description: data.message || `${data.syncedCount} appointments synced successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: "Failed to sync appointments. Please try again.",
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

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  if (appointmentsLoading) {
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
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3"
        >
          <Activity className="w-4 h-4 mr-2" />
          {syncMutation.isPending ? "Syncing..." : "Sync Appointments"}
        </Button>
      </div>

      {!appointments || appointments.length === 0 ? (
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointments Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              No appointments have been synced yet. Make sure your calendar is connected and try syncing to see your AI assistant bookings.
            </p>
            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Activity className="w-4 h-4 mr-2" />
              {syncMutation.isPending ? "Syncing..." : "Sync Now"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Card 
              key={appointment.id}
              className={`bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl transition-all duration-300 hover:shadow-2xl ${
                isUpcoming(appointment.start_time) 
                  ? 'border-l-4 border-l-green-400' 
                  : 'border-l-4 border-l-gray-300'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        isUpcoming(appointment.start_time) ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {appointment.summary || 'Appointment'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(appointment.start_time)} at {formatTime(appointment.start_time)}</span>
                      <span className="text-gray-400">-</span>
                      <span>{formatTime(appointment.end_time)}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={isUpcoming(appointment.start_time) ? "default" : "secondary"}
                    className={`${
                      isUpcoming(appointment.start_time) 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isUpcoming(appointment.start_time) ? 'Upcoming' : 'Past'}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {appointment.service && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Service</p>
                        <p className="text-sm text-gray-600">{appointment.service}</p>
                      </div>
                    </div>
                  )}

                  {appointment.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{appointment.email}</p>
                      </div>
                    </div>
                  )}

                  {appointment.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{appointment.phone}</p>
                      </div>
                    </div>
                  )}

                  {appointment.patient_type && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Type</p>
                        <p className="text-sm text-gray-600">{appointment.patient_type}</p>
                      </div>
                    </div>
                  )}
                </div>

                {appointment.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-900 mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{appointment.description}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  Last synced: {formatDate(appointment.synced_at)} at {formatTime(appointment.synced_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}