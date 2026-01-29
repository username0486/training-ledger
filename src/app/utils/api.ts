import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { getAccessToken } from './auth';
import { Workout } from '../types';
import { WorkoutTemplate } from '../types/templates';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3d6cf358`;

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please sign in.');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      url,
      errorText,
    });
    
    try {
      const error = JSON.parse(errorText);
      // Handle both 'error' and 'message' fields
      throw new Error(error.error || error.message || 'Request failed');
    } catch (parseError) {
      // If JSON parsing fails, throw the original error
      if (parseError instanceof Error && parseError.message !== 'Request failed') {
        throw parseError;
      }
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
}

// Workouts API
export async function fetchWorkouts(): Promise<Workout[]> {
  try {
    const data = await fetchWithAuth(`${API_BASE}/user/workouts`);
    return data.workouts || [];
  } catch (error) {
    console.error('Failed to fetch workouts:', error);
    return [];
  }
}

export async function saveWorkout(workout: Workout): Promise<void> {
  try {
    if (import.meta.env.DEV) {
      console.log('Attempting to save workout:', workout);
      console.log('Serialized workout:', JSON.stringify({ workout }));
    }
    
    await fetchWithAuth(`${API_BASE}/user/workouts`, {
      method: 'POST',
      body: JSON.stringify({ workout }),
    });
    
    if (import.meta.env.DEV) {
      console.log('Workout saved successfully');
    }
  } catch (error) {
    console.error('Failed to save workout:', error);
    throw error;
  }
}

export async function deleteWorkouts(workoutIds: string[]): Promise<void> {
  try {
    await fetchWithAuth(`${API_BASE}/user/workouts`, {
      method: 'DELETE',
      body: JSON.stringify({ workoutIds }),
    });
  } catch (error) {
    console.error('Failed to delete workouts:', error);
    throw error;
  }
}

// Templates API
export async function fetchTemplates(): Promise<WorkoutTemplate[]> {
  try {
    const data = await fetchWithAuth(`${API_BASE}/user/templates`);
    return data.templates || [];
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return [];
  }
}

export async function saveTemplate(template: WorkoutTemplate): Promise<void> {
  try {
    await fetchWithAuth(`${API_BASE}/user/templates`, {
      method: 'POST',
      body: JSON.stringify({ template }),
    });
  } catch (error) {
    console.error('Failed to save template:', error);
    throw error;
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    await fetchWithAuth(`${API_BASE}/user/templates/${templateId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete template:', error);
    throw error;
  }
}