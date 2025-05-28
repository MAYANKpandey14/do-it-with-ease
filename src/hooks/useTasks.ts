
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Task, TaskFilters } from '@/types';

interface TaskWithTags extends Omit<Task, 'tags'> {
  task_tags: {
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

const transformTask = (dbTask: TaskWithTags): Task => ({
  id: dbTask.id,
  userId: dbTask.user_id,
  title: dbTask.title,
  description: dbTask.description,
  priority: dbTask.priority as 'high' | 'medium' | 'low',
  tags: dbTask.task_tags.map(tt => tt.tags.name),
  dueDate: dbTask.due_date ? new Date(dbTask.due_date) : undefined,
  estimatedPomodoros: dbTask.estimated_pomodoros,
  completedPomodoros: dbTask.completed_pomodoros,
  isCompleted: dbTask.is_completed,
  createdAt: new Date(dbTask.created_at),
  updatedAt: new Date(dbTask.updated_at)
});

export const useTasks = (filters?: TaskFilters) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: ['tasks', user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('tasks')
        .select(`
          *,
          task_tags(
            tags(id, name, color)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.status === 'completed') {
        query = query.eq('is_completed', true);
      } else if (filters?.status === 'pending') {
        query = query.eq('is_completed', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      let tasks = (data as TaskWithTags[]).map(transformTask);

      // Apply client-side filters
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        tasks = tasks.filter(task => 
          task.title.toLowerCase().includes(search) || 
          task.description?.toLowerCase().includes(search)
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        tasks = tasks.filter(task => 
          filters.tags!.some(tag => task.tags.includes(tag))
        );
      }

      return tasks;
    },
    enabled: !!user,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation({
    mutationFn: async (taskData: {
      title: string;
      description?: string;
      priority: 'high' | 'medium' | 'low';
      estimatedPomodoros: number;
      dueDate?: Date;
      tags: string[];
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          estimated_pomodoros: taskData.estimatedPomodoros,
          due_date: taskData.dueDate?.toISOString(),
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Handle tags
      for (const tagName of taskData.tags) {
        // Create or get tag
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', tagName)
          .single();

        let tagId: string;

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({
              user_id: user.id,
              name: tagName
            })
            .select('id')
            .single();

          if (tagError) throw tagError;
          tagId = newTag.id;
        }

        // Link tag to task
        const { error: linkError } = await supabase
          .from('task_tags')
          .insert({
            task_id: task.id,
            tag_id: tagId
          });

        if (linkError) throw linkError;
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      if (!user) throw new Error('User not authenticated');

      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.estimatedPomodoros !== undefined) dbUpdates.estimated_pomodoros = updates.estimatedPomodoros;
      if (updates.completedPomodoros !== undefined) dbUpdates.completed_pomodoros = updates.completedPomodoros;
      if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate?.toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
