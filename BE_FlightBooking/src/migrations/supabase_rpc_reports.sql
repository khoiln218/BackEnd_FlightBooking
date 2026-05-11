-- =============================================
-- Report RPC Functions for Supabase PostgreSQL
-- =============================================

-- get_revenue_by_airline
CREATE OR REPLACE FUNCTION get_revenue_by_airline(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB)
    FROM (
      SELECT a.name AS airline_name, a.code AS airline_code,
        COUNT(DISTINCT b.id) AS "totalBookings",
        COALESCE(SUM(p.amount), 0) AS "totalRevenue"
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN airlines a ON f.airline_id = a.id
      JOIN payments p ON b.id = p.booking_id AND p.status = 'success'
      WHERE b.status IN ('confirmed', 'completed')
        AND p.paid_at BETWEEN p_start_date AND p_end_date
      GROUP BY a.id, a.name, a.code
      ORDER BY "totalRevenue" DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql;

-- get_revenue_by_route
CREATE OR REPLACE FUNCTION get_revenue_by_route(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB)
    FROM (
      SELECT dep.city AS departure_city, dep.code AS departure_code,
        arr.city AS arrival_city, arr.code AS arrival_code,
        COUNT(DISTINCT b.id) AS "totalBookings",
        COALESCE(SUM(p.amount), 0) AS "totalRevenue"
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN airports dep ON f.departure_airport_id = dep.id
      JOIN airports arr ON f.arrival_airport_id = arr.id
      JOIN payments p ON b.id = p.booking_id AND p.status = 'success'
      WHERE b.status IN ('confirmed', 'completed')
        AND p.paid_at BETWEEN p_start_date AND p_end_date
      GROUP BY f.departure_airport_id, f.arrival_airport_id,
        dep.city, dep.code, arr.city, arr.code
      ORDER BY "totalRevenue" DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql;

-- get_revenue_by_month
CREATE OR REPLACE FUNCTION get_revenue_by_month(
  p_year INTEGER
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB)
    FROM (
      SELECT EXTRACT(MONTH FROM p.paid_at)::INTEGER AS month,
        COUNT(DISTINCT b.id) AS "totalBookings",
        COALESCE(SUM(p.amount), 0) AS "totalRevenue"
      FROM bookings b
      JOIN payments p ON b.id = p.booking_id AND p.status = 'success'
      WHERE b.status IN ('confirmed', 'completed')
        AND EXTRACT(YEAR FROM p.paid_at) = p_year
      GROUP BY EXTRACT(MONTH FROM p.paid_at)
      ORDER BY month
    ) t
  );
END;
$$ LANGUAGE plpgsql;
