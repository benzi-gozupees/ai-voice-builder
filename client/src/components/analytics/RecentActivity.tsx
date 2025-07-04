import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Clock, User, Mail } from "lucide-react";
import { format, parseISO } from 'date-fns';

interface CallActivity {
  id: string;
  assistantName: string;
  startedAt: string;
  duration: number;
  result: string;
  endedReason: string;
  sentimentLabel: string;
  sentimentScore: number;
}

interface AppointmentActivity {
  summary: string;
  startTime: string;
  service: string;
  email: string;
  phone: string;
  syncedAt: string;
}

interface ActivityData {
  recentCalls: CallActivity[];
  recentAppointments: AppointmentActivity[];
}

export function RecentActivity() {
  const { data: activity, isLoading } = useQuery<ActivityData>({
    queryKey: ['/api/analytics/recent-activity'],
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const getSentimentEmoji = (label: string) => {
    switch (label) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'fail':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardHeader>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardHeader>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Recent Calls */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activity?.recentCalls || activity.recentCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No recent calls</p>
              <p className="text-sm text-gray-500">Calls will appear here once processed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.recentCalls.slice(0, 5).map((call) => (
                <div 
                  key={call.id} 
                  className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{call.assistantName}</p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(call.startedAt), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSentimentEmoji(call.sentimentLabel)}</span>
                      {getResultBadge(call.result)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3 h-3" />
                      {formatDuration(call.duration)}
                    </div>
                    <span className="text-gray-500">{call.endedReason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activity?.recentAppointments || activity.recentAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No recent appointments</p>
              <p className="text-sm text-gray-500">Appointments will appear here once synced</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.recentAppointments.slice(0, 5).map((appointment, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{appointment.summary}</p>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(appointment.startTime), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      {appointment.service && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {appointment.service}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      {appointment.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="text-xs">{appointment.email.split('@')[0]}</span>
                        </div>
                      )}
                      {appointment.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs">{appointment.phone.slice(-4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}