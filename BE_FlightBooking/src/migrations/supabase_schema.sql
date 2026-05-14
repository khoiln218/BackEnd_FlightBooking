-- Supabase PostgreSQL Schema Migration
-- Chuyển đổi từ SQLite sang PostgreSQL cho Flight Booking Backend
-- Tạo 8 bảng: users, airlines, airports, flights, seats, bookings, passengers, payments

-- ============================================================
-- TABLES
-- ============================================================

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- airlines
CREATE TABLE IF NOT EXISTS airlines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  logo_url TEXT
);

-- airports
CREATE TABLE IF NOT EXISTS airports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  city VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL
);

-- flights
CREATE TABLE IF NOT EXISTS flights (
  id SERIAL PRIMARY KEY,
  airline_id INTEGER NOT NULL REFERENCES airlines(id),
  departure_airport_id INTEGER NOT NULL REFERENCES airports(id),
  arrival_airport_id INTEGER NOT NULL REFERENCES airports(id),
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  base_price NUMERIC(15,2) NOT NULL,
  total_seats INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK(status IN ('scheduled', 'delayed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- seats
CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  seat_number VARCHAR(10) NOT NULL,
  class VARCHAR(20) NOT NULL CHECK(class IN ('economy', 'business', 'first')),
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK(status IN ('available', 'booked', 'blocked')),
  price_modifier NUMERIC(5,2) NOT NULL DEFAULT 1.0
);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  flight_id INTEGER NOT NULL REFERENCES flights(id),
  booking_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- passengers
CREATE TABLE IF NOT EXISTS passengers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id INTEGER NOT NULL REFERENCES seats(id),
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  id_type VARCHAR(20) NOT NULL CHECK(id_type IN ('cmnd', 'cccd', 'passport'))
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  amount NUMERIC(15,2) NOT NULL,
  method VARCHAR(20) NOT NULL CHECK(method IN ('credit_card', 'bank_transfer', 'e_wallet')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'success', 'failed', 'refunded')),
  transaction_code VARCHAR(50) UNIQUE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_flights_airline_id ON flights(airline_id);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_seats_flight_id ON seats(flight_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_passengers_booking_id ON passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_passengers_seat_id ON passengers(seat_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_code ON payments(transaction_code);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);


-- ============================================================
-- UTILITY: Reset sequence for a table after seeding with explicit IDs
-- ============================================================
CREATE OR REPLACE FUNCTION reset_sequence(p_table TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE(MAX(id), 0) + 1, false) FROM %I',
    p_table, 'id', p_table
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GRANTS: Expose tables & functions to Data API (PostgREST)
-- Required since Supabase no longer auto-grants on new tables
-- See: https://supabase.com/changelog/45329
-- ============================================================

-- service_role: full access (backend uses SUPABASE_SECRET_KEY)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- authenticated: read/write (for client-side Supabase Auth if needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- anon: read-only (public endpoints like flight search)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Default privileges for tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

-- Default privileges for sequences created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated;

-- Default privileges for functions created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon;
