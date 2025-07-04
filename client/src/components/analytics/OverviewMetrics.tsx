import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Phone, Calendar, TrendingUp, Clock, Users } from "lucide-react";
import CountUp from "react-countup";

interface OverviewData {
  totalCalls: number;
  totalAppointments: number;
  avgCallDuration: number;
  conversionRate: number;
  avgSentimentScore: number;
  totalCallTime: number;
}

interface OverviewMetricsProps {
  dateRange?: { from: Date; to: Date };
}

export function OverviewMetrics({ dateRange }: OverviewMetricsProps = {}) {
  // Build query parameters for filtering
  const queryParams = new URLSearchParams();
  if (dateRange) {
    queryParams.set('from', dateRange.from.toISOString().split('T')[0]);
    queryParams.set('to', dateRange.to.toISOString().split('T')[0]);
  }

  const { data: overview, isLoading } = useQuery<OverviewData>({
    queryKey: ['/api/analytics/overview', queryParams.toString()],
    queryFn: async () => {
      const url = `/api/analytics/overview${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch overview data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentEmoji = (score: number) => {
    if (score >= 70) return "😊";
    if (score >= 50) return "😐";
    return "😞";
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-white/80 backdrop-blur-sm shadow-lg border-0 rounded-2xl">
            <CardHeader className="pb-2">
              <div className="w-6 h-6 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Calls",
      value: overview?.totalCalls || 0,
      icon: Phone,
      color: "from-blue-500 to-blue-600",
      suffix: "",
    },
    {
      title: "Appointments Booked",
      value: overview?.totalAppointments || 0,
      icon: Calendar,
      color: "from-green-500 to-green-600",
      suffix: "",
    },
    {
      title: "Avg Call Duration",
      value: overview?.avgCallDuration || 0,
      icon: Clock,
      color: "from-purple-500 to-purple-600",
      suffix: "",
      format: formatDuration,
    },
    {
      title: "Conversion Rate",
      value: overview?.conversionRate || 0,
      icon: TrendingUp,
      color: "from-orange-500 to-orange-600",
      suffix: "%",
    },
    {
      title: "Sentiment Score",
      value: overview?.avgSentimentScore || 0,
      icon: Users,
      color: "from-pink-500 to-pink-600",
      suffix: "",
      sentiment: true,
    },
    {
      title: "Total Call Time",
      value: overview?.totalCallTime || 0,
      icon: Activity,
      color: "from-indigo-500 to-indigo-600",
      suffix: "",
      format: formatTime,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} shadow-lg`}>
                <metric.icon className="w-6 h-6 text-white" />
              </div>
              {metric.sentiment && (
                <span className="text-2xl">
                  {getSentimentEmoji(metric.value)}
                </span>
              )}
            </div>
            <CardTitle className="text-sm font-medium text-gray-600 mt-3">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${metric.sentiment ? getSentimentColor(metric.value) : 'text-gray-900'}`}>
              <CountUp
                end={metric.value}
                duration={2}
                separator=","
                suffix={metric.suffix}
                formattingFn={metric.format ? (value) => metric.format!(value) : undefined}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}