import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  percentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface SentimentChartProps {
  dateRange?: { from: Date; to: Date };
}

export function SentimentChart({ dateRange }: SentimentChartProps = {}) {
  // Build query parameters for filtering
  const queryParams = new URLSearchParams();
  if (dateRange) {
    queryParams.set('from', dateRange.from.toISOString().split('T')[0]);
    queryParams.set('to', dateRange.to.toISOString().split('T')[0]);
  }

  const { data: sentiment, isLoading } = useQuery<SentimentData>({
    queryKey: ['/api/analytics/sentiment', queryParams.toString()],
    queryFn: async () => {
      const url = `/api/analytics/sentiment${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sentiment data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
        <CardHeader>
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Positive', value: sentiment?.positive || 0, color: '#10b981', emoji: '😊' },
    { name: 'Neutral', value: sentiment?.neutral || 0, color: '#f59e0b', emoji: '😐' },
    { name: 'Negative', value: sentiment?.negative || 0, color: '#ef4444', emoji: '😞' },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = sentiment?.total ? Math.round((data.value / sentiment.total) * 100) : 0;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">{data.emoji}</span>
            {data.name}
          </p>
          <p className="text-sm text-gray-600">
            {data.value} calls ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <span className="text-base">{entry.payload.emoji}</span>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!sentiment?.total || sentiment.total === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            💭 Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600">No sentiment data available yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Sentiment analysis will appear after call processing
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          💭 Sentiment Analysis
        </CardTitle>
        <p className="text-sm text-gray-600">
          Customer sentiment from {sentiment.total} analyzed calls
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {chartData.map((item) => {
            const percentage = sentiment?.percentages?.[item.name.toLowerCase() as keyof typeof sentiment.percentages] || 0;
            return (
              <div key={item.name} className="text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-sm font-medium text-gray-700">{item.name}</div>
                <div className="text-lg font-bold" style={{ color: item.color }}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}