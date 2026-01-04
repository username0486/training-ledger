// Workout template storage management
import { WorkoutTemplate } from '../types/templates';

const TEMPLATES_KEY = 'workout_logs_templates';

export function loadTemplates(): WorkoutTemplate[] {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load templates:', error);
    return [];
  }
}

export function saveTemplates(templates: WorkoutTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save templates:', error);
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
