
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface Tag {
  id: string;
  name: string;
  color: string;
}

export const useTags = () => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation({
    mutationFn: async (tagData: { name: string; color?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: tagData.name,
          color: tagData.color || '#3B82F6'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};
