import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OverviewMetrics } from './OverviewMetrics';
import { TrendsChart } from './TrendsChart';
import { SentimentChart } from './SentimentChart';
import { RecentActivity } from './RecentActivity';
import { AlertsSection } from './AlertsSection';
import { AnalyticsFilters } from './AnalyticsFilters';
import { subDays } from 'date-fns';

export function AnalyticsDashboard() {
  // Filter state
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6), // Last 7 days
    to: new Date()
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Analytics Overview
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Real-time insights into your AI assistant performance, customer interactions, and business metrics
        </p>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Overview Metrics Cards */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Metrics</h3>
        <OverviewMetrics 
          dateRange={dateRange}
        />
      </div>

      {/* Charts Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Trends & Insights</h3>
        <TrendsChart 
          dateRange={dateRange}
        />
      </div>

      {/* Sentiment and Alerts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Sentiment</h3>
          <SentimentChart 
            dateRange={dateRange}
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">System Status</h3>
          <AlertsSection />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <RecentActivity />
      </div>
    </div>
  );
}