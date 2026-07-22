-- 1. Ensure stop_id exists (this was causing the RPC to crash silently)
ALTER TABLE public.student_route_assignments 
ADD COLUMN IF NOT EXISTS stop_id UUID REFERENCES public.route_stops(id) ON DELETE CASCADE;

-- 2. Completely rewrite the RPC to avoid json_agg ORDER BY syntax errors
CREATE OR REPLACE FUNCTION public.get_driver_route_data(p_vehicle_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', r.id,
                'name', r.name,
                'geometry', r.geometry,
                'time', r.time,
                'status', r.status,
                'created_at', r.created_at,
                'route_stops', (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                             'id', rs.id,
                            'name', rs.name,
                            'latitude', rs.latitude,
                            'longitude', rs.longitude,
                            'order_index', rs.order_index,
                            'estimated_time', rs.estimated_time
                        ) ORDER BY rs.order_index ASC
                    ), '[]'::json)
                    FROM public.route_stops rs
                    WHERE rs.route_id = r.id
                ),
                'student_route_assignments', (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'stop_id', sra.stop_id,
                            'students', json_build_object(
                                'id', s.id,
                                'full_name', s.full_name,
                                'absent_dates', s.absent_dates,
                                'home_latitude', s.home_latitude,
                                'home_longitude', s.home_longitude
                            )
                        )
                    ), '[]'::json)
                    FROM public.student_route_assignments sra
                    JOIN public.students s ON s.id = sra.student_id
                    WHERE sra.route_id = r.id
                )
            )
        )
        FROM (
            SELECT * 
            FROM public.routes
            WHERE vehicle_id = p_vehicle_id
            AND status IN ('active', 'pending')
            ORDER BY time ASC
            LIMIT 10
        ) r), 
    '[]'::json)
    INTO result;

    RETURN result;
END;
$$;

-- 3. Backfill driver phone to vehicles
UPDATE public.vehicles v
SET driver_phone = d.phone
FROM public.drivers d
WHERE v.driver_id = d.id AND v.driver_phone IS NULL;

-- 4. Assign stop_ids to old students so they don't break the UI
UPDATE public.student_route_assignments sra
SET stop_id = (
    SELECT id FROM public.route_stops rs 
    WHERE rs.route_id = sra.route_id 
    ORDER BY order_index ASC LIMIT 1
)
WHERE sra.stop_id IS NULL;
