
import React from 'react';
import { Habit, CompletionRecord } from '../types';
import { calculateStreak } from '../utils/dateUtils';

interface StatsViewProps {
  habits: Habit[];
  completions: CompletionRecord;
  onClose: () => void;
}

const StatsView: React.FC<StatsViewProps> = ({ habits, completions, onClose }) => {
  const todayKey = new Date().toISOString().split('T')[0];
  
  const stats = habits.map(h => {
    const habitComps = completions[h.id] || [];
    return {
      name: h.name,
      currentStreak: calculateStreak(habitComps, todayKey),
      totalCompletions: habitComps.length,
      bestStreak: 0, // In a real app, you'd calculate this over the whole history
    };
  });

  const topHabit = [...stats].sort((a, b) => b.currentStreak - a.currentStreak)[0];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Your Progress</h2>
          <p className="text-slate-400">Deep dive into your habits consistency.</p>
        </div>
        <button onClick={onClose} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest">Active Habits</span>
          <div className="text-4xl font-bold mt-2">{habits.length}</div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Best Current Streak</span>
          <div className="text-4xl font-bold mt-2">🔥 {topHabit?.currentStreak || 0}</div>
          <div className="text-xs text-slate-500 mt-1">on "{topHabit?.name || '---'}"</div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-orange-400 text-sm font-bold uppercase tracking-widest">Total Checks</span>
          <div className="text-4xl font-bold mt-2">✅ {Object.values(completions).flat().length}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <h3 className="text-xl font-bold mb-4">Habit Breakdown</h3>
        <div className="space-y-4">
          {stats.map(s => (
            <div key={s.name} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="font-semibold">{s.name}</span>
              <div className="flex gap-8 text-center">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Streak</div>
                  <div className="font-bold text-orange-400">{s.currentStreak}d</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Life Count</div>
                  <div className="font-bold">{s.totalCompletions}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsView;
