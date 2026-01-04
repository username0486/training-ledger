import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export interface User {
  id: string;
  email: string | undefined;
  name?: string;
}

// Sign up with email and password
export async function signUp(email: string, password: string, name?: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/make-server-3d6cf358/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || 'Failed to sign up' };
    }

    // After signup, sign in to get session
    const signInResult = await signIn(email, password);
    return signInResult;
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, error: 'Failed to sign up' };
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Failed to sign in' };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      },
      error: null,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error: 'Failed to sign in' };
  }
}

// Sign in with OAuth provider (Google, Apple, etc.)
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('OAuth sign in error:', error);
    return { error: 'Failed to sign in with OAuth' };
  }
}

// Sign out
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: 'Failed to sign out' };
  }
}

// Get current session
export async function getSession(): Promise<{ user: User | null; accessToken: string | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return { user: null, accessToken: null };
    }

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        name: data.session.user.user_metadata?.name,
      },
      accessToken: data.session.access_token,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return { user: null, accessToken: null };
  }
}

// Get access token
export async function getAccessToken(): Promise<string | null> {
  try {
    // First, try to get the current session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    if (!data.session) {
      console.log('No active session found');
      return null;
    }
    
    // Check if the token is expired or about to expire (within 60 seconds)
    const expiresAt = data.session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && (expiresAt - now < 60)) {
      console.log('Token expired or about to expire, refreshing session...');
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(data.session);
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        return null;
      }
      
      if (!refreshData.session) {
        console.log('No session after refresh');
        return null;
      }
      
      console.log('Session refreshed successfully');
      return refreshData.session.access_token;
    }
    
    return data.session.access_token;
  } catch (error) {
    console.error('Exception in getAccessToken:', error);
    return null;
  }
}

// Check if email exists (attempts to sign in with a dummy password to check if user exists)
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/make-server-3d6cf358/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Check email error:', data.error);
      return false;
    }

    return data.exists || false;
  } catch (error) {
    console.error('Check email error:', error);
    return false;
  }
}