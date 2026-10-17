import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { RouteRow } from '../../types/models';

export function useRoutesQuery() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  const query = useQuery({
    queryKey: ['routes', companyId],
    queryFn: async (): Promise<RouteRow[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return (data || []) as RouteRow[];
    },
    enabled: !!companyId,
    staleTime: 60 * 1000,
    gcTime: 1000 * 60 * 60 * 24, // 24h offline cache
  });

  const invalidateRoutes = () => {
    return queryClient.invalidateQueries({ queryKey: ['routes', companyId] });
  };

  return {
    ...query,
    routes: query.data || [],
    invalidateRoutes,
  };
}
