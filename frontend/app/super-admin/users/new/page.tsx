'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Building2 } from 'lucide-react';
import { membersApi, gymsApi } from '@/lib/api';

interface UserFormData {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'admin' | 'member';
  gymId: string;
  age: string;
  weight: string;
  height: string;
  goal: string;
  photoUrl: string;
  membershipStart: string;
  membershipEnd: string;
  membershipDurationMonths: string;
  membershipPurchasePrice: string;
}

interface Gym {
  id: string;
  name: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'member',
    gymId: '',
    age: '',
    weight: '',
    height: '',
    goal: '',
    photoUrl: '',
    membershipStart: '',
    membershipEnd: '',
    membershipDurationMonths: '',
    membershipPurchasePrice: ''
  });

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const response = await gymsApi.list();
      setGyms(response.data);
    } catch (error) {
      console.error('Failed to fetch gyms:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare the data for API
      const submitData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        role: formData.role,
        gymId: formData.gymId || undefined,
      };

      // Add member-specific fields
      if (formData.role === 'member') {
        if (formData.age) submitData.age = parseInt(formData.age);
        if (formData.weight) submitData.weight = parseFloat(formData.weight);
        if (formData.height) submitData.height = parseFloat(formData.height);
        if (formData.goal) submitData.goal = formData.goal;
        if (formData.photoUrl) submitData.photoUrl = formData.photoUrl;
        if (formData.membershipStart) submitData.membershipStart = formData.membershipStart;
        if (formData.membershipEnd) submitData.membershipEnd = formData.membershipEnd;
        if (formData.membershipDurationMonths) submitData.membershipDurationMonths = parseInt(formData.membershipDurationMonths);
        if (formData.membershipPurchasePrice) submitData.membershipPurchasePrice = parseFloat(formData.membershipPurchasePrice);
      }

      await membersApi.create(submitData);
      router.push('/super-admin/users');
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New User</h1>
          <p className="text-muted-foreground">Create a new admin or member account</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Fill in the details for the new user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password (min 6 characters)"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium mb-2">
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="gymId" className="block text-sm font-medium mb-2">
                    Gym Assignment *
                  </label>
                  <select
                    id="gymId"
                    name="gymId"
                    value={formData.gymId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a gym</option>
                    {gyms.map((gym) => (
                      <option key={gym.id} value={gym.id}>
                        {gym.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="photoUrl" className="block text-sm font-medium mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    id="photoUrl"
                    name="photoUrl"
                    value={formData.photoUrl}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Member-specific fields */}
            {formData.role === 'member' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Member Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium mb-2">
                        Age
                      </label>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        min="1"
                        max="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter age"
                      />
                    </div>

                    <div>
                      <label htmlFor="weight" className="block text-sm font-medium mb-2">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        id="weight"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        min="1"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter weight in kg"
                      />
                    </div>

                    <div>
                      <label htmlFor="height" className="block text-sm font-medium mb-2">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        id="height"
                        name="height"
                        value={formData.height}
                        onChange={handleInputChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter height in cm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="goal" className="block text-sm font-medium mb-2">
                        Fitness Goal
                      </label>
                      <textarea
                        id="goal"
                        name="goal"
                        value={formData.goal}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter fitness goals"
                      />
                    </div>

                    <div>
                      <label htmlFor="membershipStart" className="block text-sm font-medium mb-2">
                        Membership Start Date
                      </label>
                      <input
                        type="date"
                        id="membershipStart"
                        name="membershipStart"
                        value={formData.membershipStart}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="membershipEnd" className="block text-sm font-medium mb-2">
                        Membership End Date
                      </label>
                      <input
                        type="date"
                        id="membershipEnd"
                        name="membershipEnd"
                        value={formData.membershipEnd}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label htmlFor="membershipDurationMonths" className="block text-sm font-medium mb-2">
                      Membership Duration (months)
                    </label>
                    <input
                      type="number"
                      id="membershipDurationMonths"
                      name="membershipDurationMonths"
                      value={formData.membershipDurationMonths}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter duration in months"
                    />
                  </div>

                  <div>
                    <label htmlFor="membershipPurchasePrice" className="block text-sm font-medium mb-2">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      id="membershipPurchasePrice"
                      name="membershipPurchasePrice"
                      value={formData.membershipPurchasePrice}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter purchase price"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Link href="/super-admin/users">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
