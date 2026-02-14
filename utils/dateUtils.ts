
import { DayData, MonthInfo, Habit } from '../types';

export const getDaysInMonth = (year: number, month: number): DayData[] => {
  const date = new Date(year, month, 1);
  const days: DayData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (date.getMonth() === month) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const isoString = d.toISOString().split('T')[0];
    days.push({
      date: d,
      dateKey: isoString,
      dayNumber: date.getDate(),
      isFuture: d > today,
      isToday: d.getTime() === today.getTime()
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getMonthInfo = (year: number, month: number): MonthInfo => {
  const date = new Date(year, month, 1);
  const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { year, month, label };
};

export const calculateStreak = (completions: string[], todayKey: string): number => {
  if (!completions || completions.length === 0) return 0;
  const sortedDates = Array.from(new Set(completions)).sort((a, b) => b.localeCompare(a));
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const isTodayCompleted = sortedDates.includes(todayKey);
  if (!isTodayCompleted) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (true) {
    const checkKey = currentDate.toISOString().split('T')[0];
    if (sortedDates.includes(checkKey)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

export const formatFrequency = (habit: Habit): string => {
  const { type, value, days } = habit.frequency;
  if (type === 'daily') return 'Daily';
  if (type === 'weekly') return `${value}x/week`;
  if (type === 'custom' && days) {
    const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days.map(d => names[d]).join('');
  }
  return 'Daily';
};

export const getCompletionStats = (completions: string[], monthDays: DayData[]) => {
  const currentMonthKeys = monthDays.map(d => d.dateKey);
  const completedInMonth = completions.filter(key => currentMonthKeys.includes(key));
  const rate = monthDays.length > 0 ? (completedInMonth.length / monthDays.length) * 100 : 0;
  return {
    count: completedInMonth.length,
    percentage: Math.round(rate)
  };
};
