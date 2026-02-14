
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Habit, CompletionRecord, NoteRecord, MonthInfo, AppView, Theme } from './types';
import { getDaysInMonth, getMonthInfo, calculateStreak, formatFrequency, getCompletionStats } from './utils/dateUtils';
import { COLORS, SIDEBAR_WIDTH, ROW_HEIGHT, DAY_CELL_WIDTH, DAY_CELL_INNER } from './constants';
import HabitForm from './components/HabitForm';
import Modal from './components/Modal';
import StatsView from './components/StatsView';

// Firebase imports
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const App: React.FC = () => {
  // --- Core State ---
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord>({});
  const [notes, setNotes] = useState<NoteRecord>({});
  const [currentMonth, setCurrentMonth] = useState<MonthInfo>(() => {
    const d = new Date();
    return getMonthInfo(d.getFullYear(), d.getMonth());
  });
  
  // --- UI State ---
  const [view, setView] = useState<AppView>('dashboard');
  const [theme, setTheme] = useState<Theme>('dark');
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [undoHabit, setUndoHabit] = useState<{habit: Habit, completions: string[], notes: Record<string, string>} | null>(null);
  const [activeCellAction, setActiveCellAction] = useState<{habitId: string, dateKey: string} | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Refs ---
  const sidebarRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);
  const gridHeaderRef = useRef<HTMLDivElement>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const isInitialLoad = useRef(true);

  // --- Auth & Sync Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        setIsSyncing(true);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for real-time updates from Firestore
        const unsubFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setHabits(data.habits || []);
            setCompletions(data.completions || {});
            setNotes(data.notes || {});
          } else if (isInitialLoad.current) {
            // New cloud user: check if there's local data to migrate
            const localHabits = JSON.parse(localStorage.getItem('sf_v2_habits') || '[]');
            const localComps = JSON.parse(localStorage.getItem('sf_v2_completions') || '{}');
            const localNotes = JSON.parse(localStorage.getItem('sf_v2_notes') || '{}');
            
            if (localHabits.length > 0) {
              // Show it locally immediately
              setHabits(localHabits);
              setCompletions(localComps);
              setNotes(localNotes);
              
              // Push to cloud
              setDoc(userDocRef, {
                habits: localHabits,
                completions: localComps,
                notes: localNotes,
                updatedAt: Date.now()
              }).catch(err => console.error("Migration failed:", err));
            }
          }
          isInitialLoad.current = false;
          setIsSyncing(false);
        }, (error) => {
          console.error("Firestore error:", error);
          setIsSyncing(false);
        });

        return () => unsubFirestore();
      } else {
        // Guest mode: Reset load ref and load from localStorage
        isInitialLoad.current = true;
        const h = localStorage.getItem('sf_v2_habits');
        const c = localStorage.getItem('sf_v2_completions');
        const n = localStorage.getItem('sf_v2_notes');
        setHabits(h ? JSON.parse(h) : []);
        setCompletions(c ? JSON.parse(c) : {});
        setNotes(n ? JSON.parse(n) : {});
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync to Cloud/Local when state changes
  useEffect(() => {
    if (isInitialLoad.current && user) return; // Don't sync back empty state during initial cloud fetch

    if (user) {
      const timer = setTimeout(async () => {
        setIsSyncing(true);
        try {
          await setDoc(doc(db, 'users', user.uid), {
            habits,
            completions,
            notes,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (e) {
          console.error("Cloud sync failed:", e);
        } finally {
          setIsSyncing(false);
        }
      }, 1000); // 1s debounce to prevent spamming Firestore
      return () => clearTimeout(timer);
    } else {
      localStorage.setItem('sf_v2_habits', JSON.stringify(habits));
      localStorage.setItem('sf_v2_completions', JSON.stringify(completions));
      localStorage.setItem('sf_v2_notes', JSON.stringify(notes));
    }
  }, [habits, completions, notes, user]);

  useEffect(() => {
    const t = localStorage.getItem('sf_v2_theme');
    if (t) setTheme(t as Theme);
  }, []);

  useEffect(() => {
    localStorage.setItem('sf_v2_theme', theme);
  }, [theme]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const addHabit = (name: string, frequency: Habit['frequency']) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      frequency,
      order: habits.length
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const deleteHabit = () => {
    if (!habitToDelete) return;
    const h = habits.find(x => x.id === habitToDelete);
    if (h) {
      setUndoHabit({
        habit: h,
        completions: completions[h.id] || [],
        notes: notes[h.id] || {}
      });
      setHabits(prev => prev.filter(x => x.id !== habitToDelete));
      
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = window.setTimeout(() => setUndoHabit(null), 5000);
    }
    setHabitToDelete(null);
  };

  const undoDeletion = () => {
    if (!undoHabit) return;
    setHabits(prev => [...prev, undoHabit.habit].sort((a,b) => a.order - b.order));
    setCompletions(prev => ({ ...prev, [undoHabit.habit.id]: undoHabit.completions }));
    setNotes(prev => ({ ...prev, [undoHabit.habit.id]: undoHabit.notes }));
    setUndoHabit(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const toggleDay = (habitId: string, dateKey: string) => {
    setCompletions(prev => {
      const list = prev[habitId] || [];
      return { ...prev, [habitId]: list.includes(dateKey) ? list.filter(k => k !== dateKey) : [...list, dateKey] };
    });
  };

  const saveNote = () => {
    if (!activeCellAction) return;
    const { habitId, dateKey } = activeCellAction;
    setNotes(prev => ({
      ...prev,
      [habitId]: { ...(prev[habitId] || {}), [dateKey]: currentNoteText }
    }));
    setActiveCellAction(null);
    setCurrentNoteText('');
  };

  const moveHabit = (id: string, dir: number) => {
    const idx = habits.findIndex(h => h.id === id);
    if ((idx === 0 && dir === -1) || (idx === habits.length - 1 && dir === 1)) return;
    const newHabits = [...habits];
    const target = idx + dir;
    [newHabits[idx], newHabits[target]] = [newHabits[target], newHabits[idx]];
    setHabits(newHabits.map((h, i) => ({ ...h, order: i })));
  };

  const days = getDaysInMonth(currentMonth.year, currentMonth.month);
  const todayKey = new Date().toISOString().split('T')[0];

  const onGridScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (sidebarRef.current) sidebarRef.current.scrollTop = target.scrollTop;
    if (gridHeaderRef.current) gridHeaderRef.current.scrollLeft = target.scrollLeft;
  }, []);

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'} backdrop-blur-md`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg">S</div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">StreakFlow</h1>
          </div>
          <nav className="flex items-center gap-1 bg-slate-800/20 p-1 rounded-xl">
            <button onClick={() => setView('dashboard')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Dashboard</button>
            <button onClick={() => setView('stats')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Analytics</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${isSyncing ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Synced'}</span>
            </div>
          )}

          <div className="flex items-center bg-slate-800/30 rounded-full px-2">
             <button onClick={() => setCurrentMonth(getMonthInfo(currentMonth.year, currentMonth.month - 1))} className="p-2 hover:text-indigo-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
             <span className="text-xs font-bold uppercase w-32 text-center tracking-widest text-slate-400">{currentMonth.label}</span>
             <button onClick={() => setCurrentMonth(getMonthInfo(currentMonth.year, currentMonth.month + 1))} className="p-2 hover:text-indigo-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
          </div>
          
          <div className="flex items-center gap-3 ml-2 border-l border-slate-800 pl-4">
            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-indigo-500" />
                <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase">Sign Out</button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign In
              </button>
            )}
          </div>

          <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className={`p-2.5 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-yellow-400' : 'bg-white border-slate-200 text-indigo-600 shadow-sm'}`}>
            {theme === 'dark' ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>}
          </button>
        </div>
      </header>

      <HabitForm onAdd={addHabit} />

      <main className="flex flex-1 overflow-hidden relative">
        <div className={`${SIDEBAR_WIDTH} flex flex-col border-r shrink-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200 bg-white/50'}`}>
          <div className={`${ROW_HEIGHT} border-b flex items-center px-4 shrink-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">My Routines</span>
          </div>
          <div ref={sidebarRef} className="flex-1 overflow-y-hidden no-scrollbar">
            {habits.map((habit) => {
              const streak = calculateStreak(completions[habit.id] || [], todayKey);
              const stats = getCompletionStats(completions[habit.id] || [], days);
              return (
                <div key={habit.id} className={`group flex flex-col justify-center px-4 ${ROW_HEIGHT} border-b transition-all relative ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-900/40' : 'border-slate-200 hover:bg-slate-100'}`}>
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => moveHabit(habit.id, -1)} className="hover:text-indigo-500"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg></button>
                         <button onClick={() => moveHabit(habit.id, 1)} className="hover:text-indigo-500"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg></button>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                           <span className="truncate text-xs font-bold uppercase tracking-tight">{habit.name}</span>
                           <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">{formatFrequency(habit)}</span>
                        </div>
                        <span className="text-[10px] text-orange-400 font-bold mt-0.5">🔥 {streak}d streak</span>
                      </div>
                    </div>
                    <button onClick={() => setHabitToDelete(habit.id)} className="opacity-0 group-hover:opacity-100 text-rose-500/60 hover:text-rose-500 p-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                  <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-600 transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div ref={gridHeaderRef} className={`${ROW_HEIGHT} flex border-b overflow-x-hidden no-scrollbar shrink-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200 bg-slate-50'}`}>
            {days.map((day) => (
              <div key={day.dateKey} className={`${DAY_CELL_WIDTH} flex flex-col items-center justify-center shrink-0 border-r ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} ${day.isToday ? 'bg-indigo-600/10' : ''}`}>
                <span className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${day.isToday ? 'text-indigo-400' : 'text-slate-500'}`}>{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={`text-xs font-bold leading-none ${day.isToday ? 'text-indigo-400 underline decoration-2' : day.isFuture ? 'text-slate-700' : 'text-slate-400'}`}>{day.dayNumber}</span>
              </div>
            ))}
          </div>

          <div ref={gridBodyRef} onScroll={onGridScroll} className="flex-1 overflow-auto bg-grid-slate-900/5">
            {habits.map((habit) => (
              <div key={habit.id} className={`flex ${ROW_HEIGHT} border-b transition-colors group ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-900/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                {days.map((day) => {
                  const isChecked = (completions[habit.id] || []).includes(day.dateKey);
                  const hasNote = notes[habit.id]?.[day.dateKey];
                  return (
                    <div key={day.dateKey} className={`${DAY_CELL_WIDTH} flex items-center justify-center shrink-0 border-r relative ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} ${day.isToday ? 'bg-indigo-600/5' : ''}`}>
                      <button
                        onClick={() => {
                           if(day.isFuture) return;
                           setActiveCellAction({ habitId: habit.id, dateKey: day.dateKey });
                           setCurrentNoteText(notes[habit.id]?.[day.dateKey] || '');
                        }}
                        className={`
                          ${DAY_CELL_INNER} rounded-lg flex items-center justify-center transition-all duration-300 relative
                          ${day.isFuture ? 'opacity-10 cursor-not-allowed' : isChecked ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 rotate-[360deg]' : 'bg-slate-800/20 hover:bg-indigo-600/20 hover:scale-110'}
                        `}
                      >
                        {isChecked && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                        {hasNote && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </main>

      {view === 'stats' && <StatsView habits={habits} completions={completions} onClose={() => setView('dashboard')} />}

      {activeCellAction && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-1">Update Progress</h3>
            <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest">{activeCellAction.dateKey}</p>
            <div className="space-y-4">
              <button onClick={() => { toggleDay(activeCellAction.habitId, activeCellAction.dateKey); setActiveCellAction(null); }} className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${ (completions[activeCellAction.habitId] || []).includes(activeCellAction.dateKey) ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-600 text-white' }`}>
                {(completions[activeCellAction.habitId] || []).includes(activeCellAction.dateKey) ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Daily Note</label>
                <textarea value={currentNoteText} onChange={e => setCurrentNoteText(e.target.value)} placeholder="How did it go?..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveCellAction(null)} className="flex-1 py-2 text-slate-400 hover:text-white font-semibold">Cancel</button>
                <button onClick={saveNote} className="flex-1 py-2 bg-indigo-600 rounded-lg text-white font-bold hover:bg-indigo-500">Save Note</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={!!habitToDelete} title="Delete Habit?" message="This will permanently remove the habit and all its history. No take-backs (unless you use the undo snackbar)!" onConfirm={deleteHabit} onCancel={() => setHabitToDelete(null)} />

      {undoHabit && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 border border-indigo-500/30 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold">Habit deleted</span>
            <div className="h-1 bg-indigo-600 mt-1 animate-[undo-progress_5s_linear_forwards]" />
          </div>
          <button onClick={undoDeletion} className="text-indigo-400 font-bold hover:text-indigo-300">UNDO</button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes undo-progress { from { width: 100% } to { width: 0% } }
      `}} />
    </div>
  );
};

export default App;
