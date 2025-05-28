
import { create } from 'zustand';
import { PomodoroSession, Task } from '../types';

interface PomodoroState {
  currentSession: PomodoroSession | null;
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  selectedTask: Task | null;
  sessions: PomodoroSession[];
  workDuration: number;
  breakDuration: number;
  startSession: (task: Task) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  resetSession: () => void;
  tick: () => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  currentSession: null,
  isRunning: false,
  isPaused: false,
  timeRemaining: 25 * 60, // 25 minutes in seconds
  selectedTask: null,
  sessions: [],
  workDuration: 25 * 60,
  breakDuration: 5 * 60,

  startSession: (task: Task) => {
    const session: PomodoroSession = {
      id: Date.now().toString(),
      userId: '1',
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
    const { currentSession, sessions, selectedTask } = get();
    if (currentSession && selectedTask) {
      const completedSession = {
        ...currentSession,
        completedAt: new Date(),
        isCompleted: true,
      };

      // Update task pomodoros count
      const { updateTask } = useTasksStore.getState();
      updateTask(selectedTask.id, {
        completedPomodoros: selectedTask.completedPomodoros + 1
      });

      set({
        sessions: [...sessions, completedSession],
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
}));

// Start timer interval
setInterval(() => {
  usePomodoroStore.getState().tick();
}, 1000);
