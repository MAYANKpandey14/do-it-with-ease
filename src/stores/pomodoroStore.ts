
import { create } from 'zustand';
import { PomodoroSession, Task } from '../types';
import { useUpdateTask } from './tasksStore';

interface PomodoroState {
  currentSession: PomodoroSession | null;
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  selectedTask: Task | null;
  workDuration: number;
  breakDuration: number;
  startSession: (task: Task) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  resetSession: () => void;
  tick: () => void;
  setDurations: (workDuration: number, breakDuration: number) => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  currentSession: null,
  isRunning: false,
  isPaused: false,
  timeRemaining: 25 * 60, // 25 minutes in seconds
  selectedTask: null,
  workDuration: 25 * 60,
  breakDuration: 5 * 60,

  startSession: (task: Task) => {
    const session: PomodoroSession = {
      id: Date.now().toString(),
      userId: task.userId,
      taskId: task.id,
      duration: get().workDuration,
      sessionType: 'work',
      startedAt: new Date(),
      isCompleted: false,
    };

    set({
      currentSession: session,
      selectedTask: task,
      isRunning: true,
      isPaused: false,
      timeRemaining: get().workDuration,
    });
  },

  pauseSession: () => {
    set({ isRunning: false, isPaused: true });
  },

  resumeSession: () => {
    set({ isRunning: true, isPaused: false });
  },

  completeSession: () => {
    const { currentSession, selectedTask } = get();
    if (currentSession && selectedTask) {
      // Note: In a real implementation, we would use the Supabase hooks here
      // to update the task's completed pomodoros count and create a session record
      
      set({
        currentSession: null,
        selectedTask: null,
        isRunning: false,
        isPaused: false,
        timeRemaining: get().workDuration,
      });
    }
  },

  resetSession: () => {
    set({
      currentSession: null,
      selectedTask: null,
      isRunning: false,
      isPaused: false,
      timeRemaining: get().workDuration,
    });
  },

  tick: () => {
    const { timeRemaining, isRunning } = get();
    if (isRunning && timeRemaining > 0) {
      set({ timeRemaining: timeRemaining - 1 });
    } else if (isRunning && timeRemaining === 0) {
      get().completeSession();
    }
  },

  setDurations: (workDuration: number, breakDuration: number) => {
    set({ 
      workDuration: workDuration * 60, 
      breakDuration: breakDuration * 60,
      timeRemaining: workDuration * 60
    });
  }
}));

// Start timer interval
setInterval(() => {
  usePomodoroStore.getState().tick();
}, 1000);
