
export type FrequencyType = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  name: string;
  createdAt: number;
  frequency: {
    type: FrequencyType;
    value?: number; // For weekly (e.g., 3 times)
    days?: number[]; // For custom (0-6, Sun-Sat)
  };
  order: number;
}

export type CompletionRecord = Record<string, string[]>; // HabitId -> Array of ISO dates
export type NoteRecord = Record<string, Record<string, string>>; // HabitId -> DateKey -> NoteString

export interface DayData {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isFuture: boolean;
  isToday: boolean;
}

export interface MonthInfo {
  year: number;
  month: number;
  label: string;
}

export type Theme = 'dark' | 'light';
export type AppView = 'dashboard' | 'stats';
