/**
 * Visitors Tab Component
 * Shows anonymous visitor tracking and conversion funnel
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, Target, Monitor, Smartphone, Globe } from 'lucide-react';

interface VisitorStats {
  period_days: number;
  total_visitors: number;
  period_visitors: number;
  anonymous_visitors: number;
  converted_visitors: number;
  conversion_rate_percent: number;
  bounce_rate_percent: number;
  avg_visits_per_visitor: number;
  traffic_sources: Array<{ source: string; visitors: number }>;
  devices: Array<{ device: string; count: number }>;
  timeline: Array<{ date: string; new_visitors: number; conversions: number }>;
}

interface FunnelStep {
  step: string;
  count: number;
  conversion_rate: number;
}

interface ConversionFunnel {
  period_days: number;
  funnel: FunnelStep[];
}

export function VisitorsTab() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [statsRes, funnelRes] = await Promise.all([
        fetch(`/api/tracking/stats?days=${days}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/tracking/funnel?days=${days}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok && funnelRes.ok) {
        const statsData = await statsRes.json();
        const funnelData = await funnelRes.json();
        setStats(statsData);
        setFunnel(funnelData);
      }
    } catch (error) {
      console.error('Failed to fetch visitor analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats || !funnel) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Loading visitor analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">📊 Visitor Analytics</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setDays(7)}
            className={`px-4 py-2 rounded ${days === 7 ? 'bg-[#eb6a48] text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            7 days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-4 py-2 rounded ${days === 30 ? 'bg-[#eb6a48] text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            30 days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-4 py-2 rounded ${days === 90 ? 'bg-[#eb6a48] text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.period_visitors.toLocaleString()}</div>
            <p className="text-xs text-gray-400">Last {days} days</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Anonymous Visitors</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.anonymous_visitors.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400">Not registered yet</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.conversion_rate_percent.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400">
              {stats.converted_visitors} converted
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Bounce Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats.bounce_rate_percent.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400">Single visit only</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">🎯 Conversion Funnel</CardTitle>
              <CardDescription className="text-gray-400">
                See how visitors convert from landing to paying customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnel.funnel.map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-48 font-medium text-gray-300">{step.step}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-8 overflow-hidden">
                          <div
                            className="bg-[#eb6a48] h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                            style={{ width: `${step.conversion_rate}%` }}
                          >
                            {step.conversion_rate >= 20 && `${step.conversion_rate.toFixed(1)}%`}
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <span className="font-bold text-white">{step.count.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                <Globe className="inline mr-2" />
                Traffic Sources
              </CardTitle>
              <CardDescription className="text-gray-400">Where your visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.traffic_sources.length > 0 ? (
                <div className="space-y-3">
                  {stats.traffic_sources.map((source, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium text-gray-300">{source.source}</span>
                      <span className="text-2xl font-bold text-white">{source.visitors}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No UTM source data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                <Monitor className="inline mr-2" />
                Device Types
              </CardTitle>
              <CardDescription className="text-gray-400">Visitor device breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.devices.map((device, index) => {
                  const total = stats.devices.reduce((sum, d) => sum + d.count, 0);
                  const percentage = ((device.count / total) * 100).toFixed(1);
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {device.device === 'mobile' ? (
                          <Smartphone className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Monitor className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="font-medium capitalize text-gray-300">{device.device}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{percentage}%</span>
                        <span className="text-2xl font-bold text-white">{device.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Daily Visitor Timeline</CardTitle>
              <CardDescription className="text-gray-400">New visitors and conversions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.timeline.map((day, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="font-medium text-gray-300">{day.date}</span>
                    <div className="flex gap-4">
                      <span className="text-blue-400">
                        👥 {day.new_visitors} visitors
                      </span>
                      <span className="text-green-400">
                        ✅ {day.conversions} converted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
