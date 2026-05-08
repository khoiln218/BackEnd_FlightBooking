import 'dotenv/config';
import supabase from '../config/database';
import bcrypt from 'bcryptjs';

/**
 * Seed dữ liệu mẫu cho Flight Booking Backend.
 * - Users, airlines, airports: cố định (upsert idempotent)
 * - Flights: tự động generate từ NGÀY HIỆN TẠI → cuối năm, nhiều tuyến × nhiều hãng
 * - Seats: generate 30 ghế/chuyến
 * - Bookings mẫu: 2 bookings trên flights gần nhất
 *
 * Chạy lại nhiều lần sẽ xóa flights tương lai chưa khởi hành và regenerate.
 * Flights/bookings trong quá khứ KHÔNG bị xóa.
 *
 * Chạy: npm run seed
 */

// ═══════════════════════════════════════════════════════════════
// CONFIG — chỉnh ở đây
// ═══════════════════════════════════════════════════════════════

const FLIGHTS_PER_ROUTE_PER_DAY = 3;      // Mỗi tuyến 2 chuyến/ngày
const DAYS_GAP_BETWEEN_SEEDS = 0;          // Bắt đầu từ ngày mai (1) hoặc hôm nay (0)

// ═══════════════════════════════════════════════════════════════

async function seed() {
  console.log('🌱 Bắt đầu seed data...\n');

  const passwordHash = bcrypt.hashSync('Admin@123', 12);
  const customerHash = bcrypt.hashSync('Customer@123', 12);

  // ─── Users (4) ───────────────────────────────────────────────
  const { error: usersError } = await supabase.from('users').upsert([
    { id: 1, email: 'admin@flightbooking.local', password_hash: passwordHash, full_name: 'Admin Hệ Thống', phone: '0901000001', role: 'admin' },
    { id: 2, email: 'nguyenvana@example.local', password_hash: customerHash, full_name: 'Nguyễn Văn A', phone: '0912345678', role: 'customer' },
    { id: 3, email: 'tranthib@example.local', password_hash: customerHash, full_name: 'Trần Thị B', phone: '0987654321', role: 'customer' },
    { id: 4, email: 'levanc@example.local', password_hash: customerHash, full_name: 'Lê Văn C', phone: '0933456789', role: 'customer' },
  ], { onConflict: 'email' });
  if (usersError) { console.error('❌ users:', usersError.message); throw usersError; }
  console.log('✅ Users: 4');

  // ─── Airlines (3) ────────────────────────────────────────────
  const { error: airlinesError } = await supabase.from('airlines').upsert([
    { id: 1, name: 'Vietnam Airlines', code: 'VNA', logo_url: '/logos/vna.png' },
    { id: 2, name: 'VietJet Air', code: 'VJA', logo_url: '/logos/vja.png' },
    { id: 3, name: 'Bamboo Airways', code: 'BAV', logo_url: '/logos/bav.png' },
  ], { onConflict: 'code' });
  if (airlinesError) { console.error('❌ airlines:', airlinesError.message); throw airlinesError; }
  console.log('✅ Airlines: 3');

  // ─── Airports (5) ────────────────────────────────────────────
  const { error: airportsError } = await supabase.from('airports').upsert([
    { id: 1, name: 'Tân Sơn Nhất', code: 'SGN', city: 'Hồ Chí Minh', country: 'Việt Nam' },
    { id: 2, name: 'Nội Bài', code: 'HAN', city: 'Hà Nội', country: 'Việt Nam' },
    { id: 3, name: 'Đà Nẵng', code: 'DAD', city: 'Đà Nẵng', country: 'Việt Nam' },
    { id: 4, name: 'Cam Ranh', code: 'CXR', city: 'Nha Trang', country: 'Việt Nam' },
    { id: 5, name: 'Phú Quốc', code: 'PQC', city: 'Phú Quốc', country: 'Việt Nam' },
  ], { onConflict: 'code' });
  if (airportsError) { console.error('❌ airports:', airportsError.message); throw airportsError; }
  console.log('✅ Airports: 5');

  // ─── Xóa flights cũ chưa khởi hành (batch để tránh timeout) ──
  const now = new Date();
  const nowIso = now.toISOString();

  console.log('🗑️  Đang xóa flights scheduled trong tương lai...');
  const DELETE_BATCH = 200;
  let totalDeleted = 0;
  while (true) {
    const { data: toDelete, error: fetchErr } = await supabase
      .from('flights')
      .select('id')
      .gte('departure_time', nowIso)
      .eq('status', 'scheduled')
      .limit(DELETE_BATCH);

    if (fetchErr) { console.error('❌ fetch flights to delete:', fetchErr.message); throw fetchErr; }
    if (!toDelete || toDelete.length === 0) break;

    const ids = toDelete.map(f => f.id);

    // Xóa FK dependencies trước (theo thứ tự: payments → bookings → flights)
    // Lấy bookings đang reference các flights này
    const { data: depBookings } = await supabase
      .from('bookings')
      .select('id')
      .in('flight_id', ids);

    if (depBookings && depBookings.length > 0) {
      const bookingIds = depBookings.map(b => b.id);
      // Xóa payments (không có CASCADE)
      await supabase.from('payments').delete().in('booking_id', bookingIds);
      // Xóa bookings (passengers tự CASCADE)
      await supabase.from('bookings').delete().in('id', bookingIds);
    }

    // Giờ mới xóa được flights (seats sẽ tự CASCADE)
    const { error: deleteErr } = await supabase.from('flights').delete().in('id', ids);
    if (deleteErr) { console.error('❌ delete flights batch:', deleteErr.message); throw deleteErr; }

    totalDeleted += toDelete.length;
    process.stdout.write(`\r   Đã xóa: ${totalDeleted} flights`);
  }
  console.log(`\n✅ Đã xóa ${totalDeleted} flights cũ`);

  // ─── Generate flights động ───────────────────────────────────
  // Routes: các tuyến 2 chiều. [departureId, arrivalId, duration phút, giá gốc]
  const routes: Array<[number, number, number, number]> = [
    [1, 2, 130, 1500000],   // SGN → HAN (2h10')
    [2, 1, 130, 1500000],   // HAN → SGN
    [1, 3, 80, 900000],     // SGN → DAD (1h20')
    [3, 1, 80, 900000],     // DAD → SGN
    [2, 3, 80, 850000],     // HAN → DAD
    [3, 2, 80, 850000],     // DAD → HAN
    [1, 4, 60, 750000],     // SGN → CXR (1h)
    [4, 1, 60, 750000],     // CXR → SGN
    [1, 5, 60, 1100000],    // SGN → PQC (1h)
    [5, 1, 60, 1100000],    // PQC → SGN
    [2, 4, 110, 1600000],   // HAN → CXR (1h50')
    [4, 2, 110, 1600000],   // CXR → HAN
  ];

  // Giờ khởi hành cố định trong ngày (UTC, +7 giờ so với giờ VN)
  const departureHoursUtc = [23, 1, 3, 5, 7, 9, 11, 13]; // tương ứng 6h, 8h, 10h, ..., 20h VN

  // Khoảng thời gian: từ ngày mai → 31/12/năm hiện tại
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + DAYS_GAP_BETWEEN_SEEDS);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // 31/12 năm hiện tại

  const flightsToInsert: Array<{
    airline_id: number;
    departure_airport_id: number;
    arrival_airport_id: number;
    departure_time: string;
    arrival_time: string;
    base_price: number;
    total_seats: number;
    status: string;
  }> = [];

  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const currentDate = new Date(startDate.getTime() + dayOffset * msPerDay);

    for (const [depId, arrId, duration, basePrice] of routes) {
      // Chọn giờ khởi hành ngẫu nhiên (không trùng)
      const shuffled = [...departureHoursUtc].sort(() => Math.random() - 0.5);
      const selectedHours = shuffled.slice(0, FLIGHTS_PER_ROUTE_PER_DAY);

      for (const hour of selectedHours) {
        // Random airline
        const airlineId = Math.floor(Math.random() * 3) + 1;

        // Random price ±15%
        const priceVariation = 0.85 + Math.random() * 0.3;
        const price = Math.round((basePrice * priceVariation) / 10000) * 10000;

        const departureTime = new Date(currentDate);
        departureTime.setUTCHours(hour, 0, 0, 0);

        // Nếu giờ < 12 (UTC), có thể là ngày hôm sau theo giờ VN, nhưng đơn giản để nguyên
        const arrivalTime = new Date(departureTime.getTime() + duration * 60 * 1000);

        flightsToInsert.push({
          airline_id: airlineId,
          departure_airport_id: depId,
          arrival_airport_id: arrId,
          departure_time: departureTime.toISOString(),
          arrival_time: arrivalTime.toISOString(),
          base_price: price,
          total_seats: 30,
          status: 'scheduled',
        });
      }
    }
  }

  console.log(`📅 Generate ${flightsToInsert.length} chuyến bay từ ${startDate.toISOString().split('T')[0]} đến ${endDate.toISOString().split('T')[0]}`);

  // Insert flights theo batches
  const FLIGHT_BATCH = 100;
  const insertedFlightIds: number[] = [];
  for (let i = 0; i < flightsToInsert.length; i += FLIGHT_BATCH) {
    const batch = flightsToInsert.slice(i, i + FLIGHT_BATCH);
    const { data, error } = await supabase.from('flights').insert(batch).select('id');
    if (error) { console.error(`❌ flights batch ${i / FLIGHT_BATCH + 1}:`, error.message); throw error; }
    if (data) insertedFlightIds.push(...data.map(f => f.id));
  }
  console.log(`✅ Flights: ${insertedFlightIds.length}`);

  // ─── Seats cho flights mới ───────────────────────────────────
  const seatColumns = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seats: Array<{
    flight_id: number;
    seat_number: string;
    class: string;
    status: string;
    price_modifier: number;
  }> = [];

  for (const flightId of insertedFlightIds) {
    // Row 1: First class
    for (const col of seatColumns) {
      seats.push({ flight_id: flightId, seat_number: `1${col}`, class: 'first', status: 'available', price_modifier: 3.0 });
    }
    // Row 2: Business
    for (const col of seatColumns) {
      seats.push({ flight_id: flightId, seat_number: `2${col}`, class: 'business', status: 'available', price_modifier: 2.0 });
    }
    // Rows 3-5: Economy
    for (let row = 3; row <= 5; row++) {
      for (const col of seatColumns) {
        seats.push({ flight_id: flightId, seat_number: `${row}${col}`, class: 'economy', status: 'available', price_modifier: 1.0 });
      }
    }
  }

  const SEAT_BATCH = 500;
  for (let i = 0; i < seats.length; i += SEAT_BATCH) {
    const batch = seats.slice(i, i + SEAT_BATCH);
    const { error } = await supabase.from('seats').insert(batch);
    if (error) { console.error(`❌ seats batch ${i / SEAT_BATCH + 1}:`, error.message); throw error; }
  }
  console.log(`✅ Seats: ${seats.length}`);

  // ─── Bookings mẫu (2) — trên 2 flights gần nhất ──────────────
  if (insertedFlightIds.length >= 2) {
    const flight1Id = insertedFlightIds[0];
    const flight2Id = insertedFlightIds[1];

    // Xóa theo thứ tự FK: payments → passengers (cascade) → bookings
    const { data: oldBookings } = await supabase
      .from('bookings')
      .select('id')
      .in('booking_code', ['BOOK0001', 'BOOK0002']);

    if (oldBookings && oldBookings.length > 0) {
      const oldBookingIds = oldBookings.map(b => b.id);
      // Xóa payments trước (không có CASCADE)
      await supabase.from('payments').delete().in('booking_id', oldBookingIds);
      // Xóa bookings (passengers sẽ tự động CASCADE)
      await supabase.from('bookings').delete().in('id', oldBookingIds);
    }

    // Lấy seat_ids tương ứng flight 1 (3A, 3B) và flight 2 (2A)
    const { data: flight1Seats } = await supabase
      .from('seats')
      .select('id, seat_number')
      .eq('flight_id', flight1Id)
      .in('seat_number', ['3A', '3B']);

    const { data: flight2Seats } = await supabase
      .from('seats')
      .select('id, seat_number')
      .eq('flight_id', flight2Id)
      .eq('seat_number', '2A');

    // Insert bookings
    const { data: bookings, error: bookingsError } = await supabase.from('bookings').insert([
      { user_id: 2, flight_id: flight1Id, booking_code: 'BOOK0001', status: 'confirmed', total_amount: 3000000 },
      { user_id: 3, flight_id: flight2Id, booking_code: 'BOOK0002', status: 'pending', total_amount: 1800000 },
    ]).select('id, booking_code');
    if (bookingsError) { console.error('❌ bookings:', bookingsError.message); throw bookingsError; }

    const booking1Id = bookings!.find(b => b.booking_code === 'BOOK0001')!.id;
    const booking2Id = bookings!.find(b => b.booking_code === 'BOOK0002')!.id;

    // Update seats → booked
    if (flight1Seats && flight1Seats.length === 2) {
      await supabase.from('seats').update({ status: 'booked' }).in('id', flight1Seats.map(s => s.id));
    }
    if (flight2Seats && flight2Seats.length === 1) {
      await supabase.from('seats').update({ status: 'booked' }).in('id', flight2Seats.map(s => s.id));
    }

    // Passengers
    if (flight1Seats && flight1Seats.length === 2 && flight2Seats && flight2Seats.length === 1) {
      const seat3A = flight1Seats.find(s => s.seat_number === '3A')!.id;
      const seat3B = flight1Seats.find(s => s.seat_number === '3B')!.id;
      const seat2A = flight2Seats[0].id;

      await supabase.from('passengers').insert([
        { booking_id: booking1Id, seat_id: seat3A, full_name: 'Nguyễn Văn A', date_of_birth: '1990-05-15', id_number: '012345678901', id_type: 'cccd' },
        { booking_id: booking1Id, seat_id: seat3B, full_name: 'Phạm Thị D', date_of_birth: '1992-08-20', id_number: '098765432109', id_type: 'cccd' },
        { booking_id: booking2Id, seat_id: seat2A, full_name: 'Trần Thị B', date_of_birth: '1988-03-10', id_number: 'P12345678', id_type: 'passport' },
      ]);
    }

    // Payment cho booking 1
    await supabase.from('payments').upsert([
      { booking_id: booking1Id, amount: 3000000, method: 'credit_card', status: 'success', transaction_code: 'TXN' + Date.now(), paid_at: new Date().toISOString() },
    ], { onConflict: 'transaction_code' });

    console.log('✅ Bookings: 2 (trên flights gần nhất)');
    console.log('✅ Passengers: 3');
    console.log('✅ Payments: 1');
  }

  // ─── Reset sequences ─────────────────────────────────────────
  const tables = ['users', 'airlines', 'airports', 'flights', 'seats', 'bookings', 'passengers', 'payments'];
  for (const table of tables) {
    const { error: seqError } = await supabase.rpc('reset_sequence', { p_table: table });
    if (seqError) console.warn(`⚠️  reset_sequence ${table}:`, seqError.message);
  }

  console.log('\n🎉 Seed hoàn tất!\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin@flightbooking.local / Admin@123');
  console.log('  Customer: nguyenvana@example.local / Customer@123');
}

seed().catch(err => {
  console.error('\n❌ Seed thất bại:', err);
  process.exit(1);
});
