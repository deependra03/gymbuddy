'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, ArrowLeft, Edit, BarChart3, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { gymsApi } from '@/lib/api';

interface Gym {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  maxMembers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
    joinDate: string;
    membershipEnd?: string;
  }>;
  _count: {
    users: number;
  };
}

export default function GymDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchGym();
    }
  }, [params.id]);

  const fetchGym = async () => {
    try {
      const response = await gymsApi.get(params.id as string);
      setGym(response.data);
    } catch (error) {
      console.error('Failed to fetch gym:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/gyms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gyms
            </Button>
          </Link>
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="page-container space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/gyms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gyms
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gym not found</h3>
            <p className="text-gray-500">The gym you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/gyms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gyms
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{gym.name}</h1>
            <p className="text-muted-foreground">Gym details and management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/super-admin/gyms/${gym.id}/stats`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistics
            </Button>
          </Link>
          <Link href={`/super-admin/gyms/${gym.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Gym
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gym Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {gym.logoUrl ? (
                <img
                  src={gym.logoUrl}
                  alt={gym.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{gym.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  gym.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {gym.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {gym.description && (
              <p className="text-gray-600">{gym.description}</p>
            )}

            <div className="space-y-2">
              {gym.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{gym.address}</span>
                </div>
              )}
              {gym.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{gym.phone}</span>
                </div>
              )}
              {gym.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{gym.email}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Member Capacity</span>
                <span className="text-sm">{gym._count.users} / {gym.maxMembers}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((gym._count.users / gym.maxMembers) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Members
            </CardTitle>
            <CardDescription>
              Latest members who joined this gym
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gym.users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gym.users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(user.joinDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {gym.users.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{gym.users.length - 5} more members
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Created</span>
              <span className="text-sm text-gray-600">
                {new Date(gym.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Last Updated</span>
              <span className="text-sm text-gray-600">
                {new Date(gym.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
