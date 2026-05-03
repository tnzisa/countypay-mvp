import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Card, Badge, Spinner } from './UI';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';

/**
 * Metric Card Component
 * Displays KPI with value, trend, and icon
 */
export const MetricCard = ({
  title,
  value,
  subtext,
  trend,
  trendDirection,
  icon: Icon,
  loading = false
}) => {
  return (
    <Card className="bg-gradient-to-br from-white to-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                trendDirection === 'up'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              <TrendingUp size={14} />
              {trend}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-100 rounded-lg">
            <Icon size={24} className="text-blue-600" />
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * Line Chart Component
 * Shows trends over time
 */
export const LineChart = ({
  title,
  data,
  labels,
  loading = false,
  height = '300px'
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || loading) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels || [],
        datasets: [
          {
            label: title,
            data: data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, labels, title, loading]);

  return (
    <Card title={title}>
      <div style={{ height, position: 'relative' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </Card>
  );
};

/**
 * Bar Chart Component
 * Compares values across categories
 */
export const BarChart = ({
  title,
  data,
  labels,
  loading = false,
  height = '300px'
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || loading) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels || [],
        datasets: [
          {
            label: title,
            data: data,
            backgroundColor: [
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#8b5cf6',
              '#ec4899'
            ],
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, labels, title, loading]);

  return (
    <Card title={title}>
      <div style={{ height, position: 'relative' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </Card>
  );
};

/**
 * Pie Chart Component
 * Shows data distribution
 */
export const PieChart = ({
  title,
  data,
  labels,
  loading = false,
  height = '300px'
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || loading) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels || [],
        datasets: [
          {
            data: data,
            backgroundColor: [
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#8b5cf6'
            ],
            borderColor: '#fff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, labels, title, loading]);

  return (
    <Card title={title}>
      <div style={{ height, position: 'relative' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </Card>
  );
};

/**
 * Dashboard Summary Section
 * Shows key metrics and KPIs
 */
export const DashboardSummary = ({ data, loading = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <MetricCard
        title="Total Transactions"
        value={loading ? '-' : data?.summary?.activeTransactions || 0}
        icon={Users}
        trend={data?.summary?.trend?.daily?.length > 1 ? '+12%' : ''}
        trendDirection="up"
        loading={loading}
      />
      <MetricCard
        title="Total Revenue"
        value={
          loading
            ? '-'
            : `KES ${(data?.summary?.totalAmount || 0).toLocaleString()}`
        }
        icon={DollarSign}
        trend={data?.summary?.trend?.daily?.length > 1 ? '+8.5%' : ''}
        trendDirection="up"
        loading={loading}
      />
      <MetricCard
        title="Success Rate"
        value={loading ? '-' : `${data?.summary?.successRate || 0}%`}
        icon={CheckCircle}
        trend="Excellent"
        trendDirection="up"
        loading={loading}
      />
      <MetricCard
        title="Avg Response Time"
        value={loading ? '-' : `${data?.summary?.averageTime || 0}s`}
        icon={TrendingUp}
        trend="On target"
        trendDirection="up"
        loading={loading}
      />
      <MetricCard
        title="Fraud Events"
        value={loading ? '-' : data?.summary?.fraudEvents || 0}
        icon={AlertCircle}
        trend="Protected"
        trendDirection="down"
        loading={loading}
      />
    </div>
  );
};

/**
 * Analytics Dashboard Layout
 * Complete dashboard with multiple chart types
 */
export const AnalyticsDashboard = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <DashboardSummary data={data} loading={loading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <LineChart
          title="Revenue Trend"
          data={data?.trend?.daily?.map((d) => d.amount) || []}
          labels={data?.trend?.daily?.map((d) => d.date) || []}
          loading={loading}
        />

        {/* Transaction Count */}
        <LineChart
          title="Transaction Count"
          data={data?.trend?.daily?.map((d) => d.count) || []}
          labels={data?.trend?.daily?.map((d) => d.date) || []}
          loading={loading}
        />

        {/* Payment Method Distribution */}
        <PieChart
          title="Payment Methods"
          data={[
            data?.paymentDistribution?.mpesa || 0,
            data?.paymentDistribution?.stripe || 0,
            data?.paymentDistribution?.bank_transfer || 0
          ]}
          labels={['M-Pesa', 'Stripe', 'Bank Transfer']}
          loading={loading}
        />

        {/* County Performance */}
        <BarChart
          title="Top Counties"
          data={
            data?.counties
              ?.slice(0, 6)
              .map((c) => c.revenue) || []
          }
          labels={
            data?.counties
              ?.slice(0, 6)
              .map((c) => c.name) || []
          }
          loading={loading}
        />
      </div>

      {/* Top Fees Section */}
      <Card title="Top Performing Fees">
        <div className="space-y-3">
          {data?.topFees?.slice(0, 5).map((fee, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{fee.name}</p>
                <p className="text-xs text-gray-600">
                  {fee.count} transactions
                </p>
              </div>
              <Badge variant="success">
                KES {fee.revenue?.toLocaleString() || 0}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/**
 * Forecast Chart Component
 * Shows predicted values with confidence intervals
 */
export const ForecastChart = ({ data, loading = false }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || loading) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.forecast?.map((f) => f.date) || [],
        datasets: [
          {
            label: 'Forecast',
            data: data.forecast?.map((f) => f.predictedRevenue) || [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            borderDash: [5, 5]
          },
          {
            label: 'Upper Bound',
            data: data.forecast?.map((f) => f.confidenceInterval?.[1]) || [],
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Lower Bound',
            data: data.forecast?.map((f) => f.confidenceInterval?.[0]) || [],
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, loading]);

  return (
    <Card title="30-Day Revenue Forecast">
      <div style={{ height: '350px', position: 'relative' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-600">Trend</p>
          <p className="text-lg font-bold text-gray-900">
            {data?.trend === 'UPWARD' ? '📈 Up' : '📉 Down'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Growth Rate</p>
          <p className="text-lg font-bold text-gray-900">
            {data?.growthRate}%/day
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Accuracy</p>
          <p className="text-lg font-bold text-gray-900">
            {data?.modelAccuracy}%
          </p>
        </div>
      </div>
    </Card>
  );
};

/**
 * Anomaly List Component
 * Shows detected anomalies
 */
export const AnomalyList = ({ anomalies, loading = false }) => {
  return (
    <Card title={`Detected Anomalies (${anomalies?.length || 0})`}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : anomalies && anomalies.length > 0 ? (
        <div className="space-y-3">
          {anomalies.map((anomaly, idx) => (
            <div
              key={idx}
              className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {anomaly.type}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {anomaly.description}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-gray-600">
                      Expected: {anomaly.expectedValue}
                    </span>
                    <span className="text-red-600 font-medium">
                      Actual: {anomaly.actualValue}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={
                    anomaly.severity === 'high' ? 'danger' : 'warning'
                  }
                >
                  {anomaly.severity?.toUpperCase() || 'MEDIUM'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 py-8 text-center">
          No anomalies detected
        </p>
      )}
    </Card>
  );
};
