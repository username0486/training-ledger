// Workout template storage management
import { WorkoutTemplate } from '../types/templates';
import { loadState, saveState } from '../storage/storageGateway';

const TEMPLATES_KEY = 'workout_logs_templates';

export function loadTemplates(): WorkoutTemplate[] {
  try {
    const result = loadState();
    if (result.success && result.state) {
      return result.state.templates || [];
    }
    
    // Fallback to legacy storage
    const data = localStorage.getItem(TEMPLATES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load templates:', error);
    // NEVER clear data on error - return empty array only if truly no data
    return [];
  }
}

export function saveTemplates(templates: WorkoutTemplate[]): void {
  try {
    const result = loadState();
    if (result.success && result.state) {
      const updatedState = {
        ...result.state,
        templates,
      };
      saveState(updatedState);
    } else {
      // Fallback to legacy storage
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    }
  } catch (error) {
    console.error('Failed to save templates:', error);
    // Fallback to legacy storage
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
  }
}

export function saveTemplate(template: WorkoutTemplate): void {
  const templates = loadTemplates();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }
  
  saveTemplates(templates);
}

export function deleteTemplate(templateId: string): void {
  const templates = loadTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  saveTemplates(filtered);
}
