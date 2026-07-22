-- Function for Driver to update vehicle location (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_driver_location(p_vehicle_id UUID, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.vehicles
    SET 
        current_latitude = p_latitude,
        current_longitude = p_longitude
    WHERE id = p_vehicle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_driver_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;

-- Function for Parent to safely read their child's assigned vehicle info (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_parent_vehicle_data(p_vehicle_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT row_to_json(v) INTO result
    FROM (
        SELECT id, plate_number, driver_name, driver_phone, current_latitude, current_longitude, status
        FROM public.vehicles
        WHERE id = p_vehicle_id
    ) v;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_vehicle_data(UUID) TO anon, authenticated;
