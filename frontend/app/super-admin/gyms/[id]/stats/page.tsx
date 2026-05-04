'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Users, TrendingUp, Activity, Calendar, Target } from 'lucide-react';
import { gymsApi } from '@/lib/api';

interface GymStats {
  totalMembers: number;
  activeMembers: number;
  adminCount: number;
  memberCount: number;
  recentMembers: number;
  maxMembers: number;
  capacityUtilization: number;
}

export default function GymStatsPage() {
  const params = useParams();
  const router = useRouter();
  const [stats, setStats] = useState<GymStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchStats();
    }
  }, [params.id]);

  const fetchStats = async () => {
    try {
      const response = await gymsApi.getStats(params.id as string);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch gym stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/super-admin/gyms/${params.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gym
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-container space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/super-admin/gyms/${params.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gym
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Statistics not available</h3>
            <p className="text-gray-500">Unable to load gym statistics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/super-admin/gyms/${params.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gym
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Gym Statistics</h1>
          <p className="text-muted-foreground">Performance metrics and analytics</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              All registered members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              Currently active members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.adminCount}</div>
            <p className="text-xs text-muted-foreground">
              Gym administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentMembers}</div>
            <p className="text-xs text-muted-foreground">
              Members joined in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capacity Utilization</CardTitle>
            <CardDescription>
              Current gym capacity usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Occupancy</span>
                <span className="text-sm text-gray-600">
                  {stats.activeMembers} / {stats.maxMembers} members
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full ${
                    stats.capacityUtilization > 80 ? 'bg-red-500' :
                    stats.capacityUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(stats.capacityUtilization, 100)}%` }}
                ></div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.capacityUtilization}%</div>
                <p className="text-sm text-gray-600">
                  {stats.capacityUtilization > 80 ? 'Near capacity - consider expansion' :
                   stats.capacityUtilization > 60 ? 'Moderately occupied' : 'Plenty of space available'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Distribution</CardTitle>
            <CardDescription>
              Breakdown of member types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Regular Members</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{stats.memberCount}</div>
                  <div className="text-xs text-gray-500">
                    {stats.totalMembers > 0 ? Math.round((stats.memberCount / stats.totalMembers) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Administrators</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{stats.adminCount}</div>
                  <div className="text-xs text-gray-500">
                    {stats.totalMembers > 0 ? Math.round((stats.adminCount / stats.totalMembers) * 100) : 0}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Inactive Members</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{stats.totalMembers - stats.activeMembers}</div>
                  <div className="text-xs text-gray-500">
                    {stats.totalMembers > 0 ? Math.round(((stats.totalMembers - stats.activeMembers) / stats.totalMembers) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity Summary
          </CardTitle>
          <CardDescription>
            Key metrics for the past 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.recentMembers}</div>
              <p className="text-sm text-gray-600">New Members</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.recentMembers > 0 ? Math.round((stats.recentMembers / 30) * 100) / 100 : 0}
              </div>
              <p className="text-sm text-gray-600">Daily Average</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalMembers > 0 ? Math.round((stats.recentMembers / stats.totalMembers) * 100) : 0}%
              </div>
              <p className="text-sm text-gray-600">Growth Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
