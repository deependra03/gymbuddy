import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'member';
  photoUrl?: string;
}

export async function getServerSession(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('gymbuddy_token')?.value;
    
    if (!token) {
      return null;
    }

    // For now, we'll get user info from a client-side cookie
    // In a real app, you'd validate the token with your backend
    const userCookie = cookieStore.get('gymbuddy_user')?.value;
    
    if (!userCookie) {
      return null;
    }

    const user = JSON.parse(userCookie) as User;
    return user;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}
