import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { StudentRow } from '../../types/models';

export interface UseStudentsQueryOptions {
  status?: string;
  isArchived?: boolean;
}

export function useStudentsQuery(options: UseStudentsQueryOptions = {}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  const queryKey = ['students', companyId, options.status, options.isArchived];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<StudentRow[]> => {
      if (!companyId) return [];

      let q = supabase
        .from('students')
        .select('*')
        .eq('company_id', companyId);

      if (options.status && options.status !== 'all') {
        q = q.eq('status', options.status);
      }

      if (options.isArchived !== undefined) {
        q = q.eq('is_archived', options.isArchived);
      } else {
        q = q.eq('is_archived', false);
      }

      const { data, error } = await q.order('full_name');
      if (error) throw error;
      return (data || []) as StudentRow[];
    },
    enabled: !!companyId,
    staleTime: 60 * 1000,
    gcTime: 1000 * 60 * 60 * 24, // 24h IndexedDB cache
  });

  const invalidateStudents = () => {
    return queryClient.invalidateQueries({ queryKey: ['students', companyId] });
  };

  return {
    ...query,
    students: query.data || [],
    invalidateStudents,
  };
}
