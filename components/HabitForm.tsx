
import React, { useState } from 'react';
import { FrequencyType, Habit } from '../types';

interface HabitFormProps {
  onAdd: (name: string, frequency: Habit['frequency']) => void;
}

const HabitForm: React.FC<HabitFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [freqType, setFreqType] = useState<FrequencyType>('daily');
  const [weeklyValue, setWeeklyValue] = useState(3);
  const [customDays, setCustomDays] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

   const frequency: any = { type: freqType };

  if (freqType === 'weekly') {
    frequency.value = weeklyValue;
  }

  if (freqType === 'custom') {
    frequency.days = customDays;
  }

  onAdd(name.trim(), frequency);

    setName('');
  };

  const toggleDay = (day: number) => {
    setCustomDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  return (
    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's your new habit?"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            maxLength={30}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 rounded-lg font-bold text-white transition-all shadow-lg"
          >
            Create
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <span className="font-semibold uppercase text-xs tracking-wider">Frequency:</span>
          <div className="flex bg-slate-800 rounded-lg p-1">
            {(['daily', 'weekly', 'custom'] as FrequencyType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFreqType(t)}
                className={`px-3 py-1 rounded-md capitalize transition-all ${freqType === t ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {freqType === 'weekly' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <input 
                type="range" min="1" max="7" value={weeklyValue} 
                onChange={e => setWeeklyValue(parseInt(e.target.value))} 
                className="w-24 accent-indigo-500"
              />
              <span className="w-16 font-mono text-indigo-400">{weeklyValue} days</span>
            </div>
          )}

          {freqType === 'custom' && (
            <div className="flex gap-1 animate-in fade-in slide-in-from-left-2">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-7 h-7 rounded-md text-[10px] font-bold border ${customDays.includes(i) ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default HabitForm;
