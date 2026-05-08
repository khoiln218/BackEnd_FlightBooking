-- ============================================================
-- Supabase RPC Transaction Functions
-- 5 PostgreSQL functions for atomic multi-step operations
-- Called via supabase.rpc() from controllers
-- ============================================================

-- 1. create_booking(p_user_id, p_flight_id, p_passengers, p_seat_ids, p_booking_code)
CREATE OR REPLACE FUNCTION create_booking(
  p_user_id INTEGER,
  p_flight_id INTEGER,
  p_passengers JSONB,
  p_seat_ids INTEGER[],
  p_booking_code VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_flight RECORD;
  v_seat RECORD;
  v_total_amount NUMERIC;
  v_booking_id INTEGER;
  v_passenger JSONB;
  v_i INTEGER;
BEGIN
  -- 1. Verify flight
  SELECT id, base_price, status INTO v_flight
  FROM flights WHERE id = p_flight_id AND status = 'scheduled' AND departure_time > NOW();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chuyến bay không tồn tại, đã hủy hoặc đã khởi hành';
  END IF;

  -- 2. Check seats available
  IF (SELECT COUNT(*) FROM seats
      WHERE id = ANY(p_seat_ids) AND flight_id = p_flight_id AND status = 'available')
     != array_length(p_seat_ids, 1) THEN
    RAISE EXCEPTION 'Một hoặc nhiều ghế đã được đặt hoặc không hợp lệ';
  END IF;

  -- 3. Calculate total
  SELECT SUM(v_flight.base_price * price_modifier) INTO v_total_amount
  FROM seats WHERE id = ANY(p_seat_ids);

  -- 4. Insert booking
  INSERT INTO bookings (user_id, flight_id, booking_code, status, total_amount)
  VALUES (p_user_id, p_flight_id, p_booking_code, 'pending', v_total_amount)
  RETURNING id INTO v_booking_id;

  -- 5. Insert passengers
  FOR v_i IN 0..jsonb_array_length(p_passengers) - 1 LOOP
    v_passenger := p_passengers->v_i;
    INSERT INTO passengers (booking_id, seat_id, full_name, date_of_birth, id_number, id_type)
    VALUES (
      v_booking_id,
      p_seat_ids[v_i + 1],
      v_passenger->>'fullName',
      (v_passenger->>'dateOfBirth')::DATE,
      v_passenger->>'idNumber',
      v_passenger->>'idType'
    );
  END LOOP;

  -- 6. Update seats
  UPDATE seats SET status = 'booked' WHERE id = ANY(p_seat_ids);

  RETURN jsonb_build_object(
    'id', v_booking_id,
    'booking_code', p_booking_code,
    'status', 'pending',
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. cancel_booking(p_user_id, p_booking_id)
CREATE OR REPLACE FUNCTION cancel_booking(
  p_user_id INTEGER,
  p_booking_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT b.*, f.departure_time INTO v_booking
  FROM bookings b JOIN flights f ON b.flight_id = f.id
  WHERE b.id = p_booking_id AND b.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đặt vé không tồn tại';
  END IF;
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Không thể hủy đặt vé ở trạng thái này';
  END IF;
  IF v_booking.departure_time <= NOW() THEN
    RAISE EXCEPTION 'Không thể hủy vé đã khởi hành';
  END IF;

  UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = p_booking_id;
  UPDATE seats SET status = 'available'
    WHERE id IN (SELECT seat_id FROM passengers WHERE booking_id = p_booking_id);
  UPDATE payments SET status = 'refunded'
    WHERE booking_id = p_booking_id AND status = 'success';

  RETURN jsonb_build_object(
    'id', v_booking.id, 'user_id', v_booking.user_id,
    'flight_id', v_booking.flight_id, 'booking_code', v_booking.booking_code,
    'status', 'cancelled', 'total_amount', v_booking.total_amount,
    'created_at', v_booking.created_at, 'updated_at', v_booking.updated_at
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. process_payment(p_user_id, p_booking_id, p_amount, p_method, p_transaction_code)
CREATE OR REPLACE FUNCTION process_payment(
  p_user_id INTEGER,
  p_booking_id INTEGER,
  p_amount NUMERIC,
  p_method VARCHAR,
  p_transaction_code VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_payment_id INTEGER;
  v_paid_at TIMESTAMPTZ;
BEGIN
  SELECT b.id, b.total_amount INTO v_booking
  FROM bookings b JOIN flights f ON b.flight_id = f.id
  WHERE b.id = p_booking_id AND b.user_id = p_user_id AND b.status = 'pending'
    AND f.departure_time > NOW();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đặt vé không tồn tại, đã thanh toán hoặc chuyến bay đã khởi hành';
  END IF;
  IF p_amount != v_booking.total_amount THEN
    RAISE EXCEPTION 'Số tiền không khớp với tổng tiền đặt vé';
  END IF;

  v_paid_at := NOW();
  INSERT INTO payments (booking_id, amount, method, status, transaction_code, paid_at)
  VALUES (p_booking_id, p_amount, p_method, 'success', p_transaction_code, v_paid_at)
  RETURNING id INTO v_payment_id;

  UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'paymentId', v_payment_id, 'status', 'success',
    'transactionCode', p_transaction_code, 'paidAt', v_paid_at
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. create_flight_with_seats(p_airline_id, p_departure_airport_id, ...)
CREATE OR REPLACE FUNCTION create_flight_with_seats(
  p_airline_id INTEGER,
  p_departure_airport_id INTEGER,
  p_arrival_airport_id INTEGER,
  p_departure_time TIMESTAMPTZ,
  p_arrival_time TIMESTAMPTZ,
  p_base_price NUMERIC,
  p_total_seats INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_flight_id INTEGER;
  v_first_count INTEGER;
  v_business_count INTEGER;
  v_economy_count INTEGER;
  v_seat_index INTEGER := 0;
  v_row INTEGER;
  v_col TEXT;
  v_columns TEXT[] := ARRAY['A','B','C','D','E','F'];
  v_class TEXT;
  v_modifier NUMERIC;
  v_seats JSONB := '[]'::JSONB;
  v_flight RECORD;
BEGIN
  INSERT INTO flights (airline_id, departure_airport_id, arrival_airport_id,
    departure_time, arrival_time, base_price, total_seats)
  VALUES (p_airline_id, p_departure_airport_id, p_arrival_airport_id,
    p_departure_time, p_arrival_time, p_base_price, p_total_seats)
  RETURNING id INTO v_flight_id;

  v_first_count := FLOOR(p_total_seats * 0.2);
  v_business_count := FLOOR(p_total_seats * 0.2);
  v_economy_count := p_total_seats - v_first_count - v_business_count;

  -- Generate seats (first, business, economy)
  FOR v_i IN 1..p_total_seats LOOP
    v_row := (v_seat_index / 6) + 1;
    v_col := v_columns[(v_seat_index % 6) + 1];

    IF v_seat_index < v_first_count THEN
      v_class := 'first'; v_modifier := 3.0;
    ELSIF v_seat_index < v_first_count + v_business_count THEN
      v_class := 'business'; v_modifier := 2.0;
    ELSE
      v_class := 'economy'; v_modifier := 1.0;
    END IF;

    INSERT INTO seats (flight_id, seat_number, class, status, price_modifier)
    VALUES (v_flight_id, v_row || v_col, v_class, 'available', v_modifier);

    v_seat_index := v_seat_index + 1;
  END LOOP;

  SELECT * INTO v_flight FROM flights WHERE id = v_flight_id;

  RETURN jsonb_build_object('flight', row_to_json(v_flight));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. admin_cancel_flight(p_flight_id)
CREATE OR REPLACE FUNCTION admin_cancel_flight(
  p_flight_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_cancelled_count INTEGER;
  v_booking_ids INTEGER[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM flights WHERE id = p_flight_id) THEN
    RAISE EXCEPTION 'Chuyến bay không tồn tại';
  END IF;

  UPDATE flights SET status = 'cancelled' WHERE id = p_flight_id;

  SELECT ARRAY_AGG(id) INTO v_booking_ids
  FROM bookings WHERE flight_id = p_flight_id AND status IN ('pending', 'confirmed');

  v_cancelled_count := COALESCE(array_length(v_booking_ids, 1), 0);

  IF v_cancelled_count > 0 THEN
    UPDATE bookings SET status = 'cancelled', updated_at = NOW()
      WHERE id = ANY(v_booking_ids);
    UPDATE payments SET status = 'refunded'
      WHERE booking_id = ANY(v_booking_ids) AND status = 'success';
  END IF;

  UPDATE seats SET status = 'available' WHERE flight_id = p_flight_id;

  RETURN jsonb_build_object('cancelledCount', v_cancelled_count);
END;
$$ LANGUAGE plpgsql;