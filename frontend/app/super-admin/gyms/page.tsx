'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Plus, Edit, Eye, BarChart3, Phone, Mail } from 'lucide-react';
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
  _count: {
    users: number;
  };
}

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const response = await gymsApi.list();
      setGyms(response.data);
    } catch (error) {
      console.error('Failed to fetch gyms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Gyms</h1>
            <p className="text-muted-foreground">Manage all gym locations</p>
          </div>
          <Link href="/super-admin/gyms/new">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Gym
            </Button>
          </Link>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gyms</h1>
          <p className="text-muted-foreground">Manage all gym locations</p>
        </div>
        <Link href="/super-admin/gyms/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Gym
          </Button>
        </Link>
      </div>

      {gyms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No gyms yet</h3>
            <p className="text-gray-500 text-center mb-4">
              Get started by adding your first gym location
            </p>
            <Link href="/super-admin/gyms/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Gym
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {gyms.map((gym) => (
            <Card key={gym.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {gym.logoUrl ? (
                      <img
                        src={gym.logoUrl}
                        alt={gym.name}
                        className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {gym.name}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          gym.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {gym.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </CardTitle>
                      {gym.description && (
                        <CardDescription className="line-clamp-2">{gym.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 sm:self-start">
                    <Link href={`/super-admin/gyms/${gym.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/super-admin/gyms/${gym.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/super-admin/gyms/${gym.id}/stats`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{gym._count.users} / {gym.maxMembers} members</span>
                  </div>
                  {gym.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{gym.phone}</span>
                    </div>
                  )}
                  {gym.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{gym.email}</span>
                    </div>
                  )}
                </div>
                {gym.address && (
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Address:</strong> <span className="break-all">{gym.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
