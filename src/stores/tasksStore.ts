
import { create } from 'zustand';
import { Task, TaskFilters } from '../types';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  filters: TaskFilters;
  filteredTasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  setFilters: (filters: TaskFilters) => void;
  getTasksByTag: (tag: string) => Task[];
  getTasksByPriority: (priority: string) => Task[];
  applyFilters: () => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  filters: {},
  filteredTasks: [],

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      userId: '1', // Mock user ID
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const tasks = [...get().tasks, newTask];
    set({ tasks });
    get().applyFilters();
  },

  updateTask: (id: string, updates: Partial<Task>) => {
    const tasks = get().tasks.map(task =>
      task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
    );
    set({ tasks });
    get().applyFilters();
  },

  deleteTask: (id: string) => {
    const tasks = get().tasks.filter(task => task.id !== id);
    set({ tasks });
    get().applyFilters();
  },

  toggleTask: (id: string) => {
    get().updateTask(id, { isCompleted: !get().tasks.find(t => t.id === id)?.isCompleted });
  },

  setFilters: (filters: TaskFilters) => {
    set({ filters });
    get().applyFilters();
  },

  getTasksByTag: (tag: string) => {
    return get().tasks.filter(task => task.tags.includes(tag));
  },

  getTasksByPriority: (priority: string) => {
    return get().tasks.filter(task => task.priority === priority);
  },

  applyFilters: () => {
    const { tasks, filters } = get();
    let filtered = [...tasks];

    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(task => 
        filters.tags!.some(tag => task.tags.includes(tag))
      );
    }

    if (filters.status) {
      filtered = filtered.filter(task => 
        filters.status === 'completed' ? task.isCompleted : !task.isCompleted
      );
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(search) || 
        task.description?.toLowerCase().includes(search)
      );
    }

    set({ filteredTasks: filtered });
  }
}));

// Initialize with some demo tasks
useTasksStore.setState({
  tasks: [
    {
      id: '1',
      userId: '1',
      title: 'Complete project documentation',
      description: 'Write comprehensive documentation for the new feature',
      priority: 'high',
      tags: ['work', 'documentation'],
      estimatedPomodoros: 4,
      completedPomodoros: 2,
      isCompleted: false,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000),
    },
    {
      id: '2',
      userId: '1',
      title: 'Review code changes',
      description: 'Review pull requests from team members',
      priority: 'medium',
      tags: ['work', 'review'],
      estimatedPomodoros: 2,
      completedPomodoros: 0,
      isCompleted: false,
      createdAt: new Date(Date.now() - 43200000),
      updatedAt: new Date(Date.now() - 43200000),
    },
    {
      id: '3',
      userId: '1',
      title: 'Buy groceries',
      description: 'Weekly grocery shopping',
      priority: 'low',
      tags: ['personal', 'shopping'],
      estimatedPomodoros: 1,
      completedPomodoros: 1,
      isCompleted: true,
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 86400000),
    }
  ]
});

// Apply initial filters
useTasksStore.getState().applyFilters();
