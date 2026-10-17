import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { VehicleRow } from '../../types/models';

export interface FormattedVehicle {
  id: string;
  plate: string;
  driver: string;
  driver_id?: string;
  capacity: number;
  status: 'active' | 'maintenance' | 'out_of_service' | 'inactive';
  student_count: number;
  color?: string;
  location: string;
  current_latitude?: number;
  current_longitude?: number;
}

export function useVehiclesQuery() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  const query = useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: async (): Promise<FormattedVehicle[]> => {
      if (!companyId) return [];

      const { data: rawVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId)
        .order('plate_number');

      if (vehiclesError) throw vehiclesError;

      // Fetch student counts grouped by vehicle
      const { data: studentCounts } = await supabase
        .from('students')
        .select('vehicle_id')
        .eq('company_id', companyId)
        .not('vehicle_id', 'is', null)
        .neq('status', 'pending');

      const countMap: Record<string, number> = {};
      studentCounts?.forEach((s: { vehicle_id: string | null }) => {
        if (s.vehicle_id) {
          countMap[s.vehicle_id] = (countMap[s.vehicle_id] || 0) + 1;
        }
      });

      return (rawVehicles || []).map((v: VehicleRow) => ({
        id: v.id,
        plate: v.plate_number,
        driver: v.driver_name || '',
        driver_id: v.driver_id || undefined,
        capacity: v.capacity || 16,
        status: (v.status as FormattedVehicle['status']) || 'active',
        student_count: countMap[v.id] || 0,
        color: v.color || undefined,
        location:
          v.current_latitude && v.current_longitude
            ? `${v.current_latitude.toFixed(4)}, ${v.current_longitude.toFixed(4)}`
            : 'Konum Yok',
        current_latitude: v.current_latitude || undefined,
        current_longitude: v.current_longitude || undefined,
      }));
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 minute fresh
    gcTime: 1000 * 60 * 60 * 24, // Keep in IndexedDB cache for 24h
  });

  const invalidateVehicles = () => {
    return queryClient.invalidateQueries({ queryKey: ['vehicles', companyId] });
  };

  return {
    ...query,
    vehicles: query.data || [],
    invalidateVehicles,
  };
}
