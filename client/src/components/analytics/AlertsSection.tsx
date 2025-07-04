import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";
import { format, parseISO } from 'date-fns';

interface Alert {
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

interface AlertsData {
  alerts: Alert[];
}

export function AlertsSection() {
  const { data: alertsData, isLoading } = useQuery<AlertsData>({
    queryKey: ['/api/analytics/alerts'],
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getAlertBackground = (type: string) => {
    switch (type) {
      case 'critical':
        return 'from-red-50 to-red-100 border-red-200';
      case 'warning':
        return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 'info':
        return 'from-blue-50 to-blue-100 border-blue-200';
      case 'success':
        return 'from-green-50 to-green-100 border-green-200';
      default:
        return 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
        <CardHeader>
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = alertsData?.alerts || [];

  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🚨 System Health
        </CardTitle>
        <p className="text-sm text-gray-600">
          Current alerts and system status
        </p>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-gray-900 font-medium">All Systems Running Smoothly</p>
            <p className="text-sm text-gray-500 mt-1">No alerts or issues detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div 
                key={index}
                className={`p-4 rounded-xl bg-gradient-to-r border hover:shadow-md transition-all duration-200 ${getAlertBackground(alert.type)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    </div>
                  </div>
                  {getAlertBadge(alert.type)}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {format(parseISO(alert.timestamp), 'MMM dd, HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}