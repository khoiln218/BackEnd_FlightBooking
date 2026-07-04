import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { debugLog, errorLog } from '../shared/utils/debug';
import { CreateBookingRequest, AdminBookingQuery } from './booking.types';
import { PaginatedResult } from '../shared/types/common.types';
import { generateBookingCode } from '../shared/utils/helpers';

// ─── 4.1 createBooking ───────────────────────────────────────────────

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { flightId, passengers, seatIds } = req.body as CreateBookingRequest;
    debugLog('Booking', 'createBooking - userId:', userId, 'flightId:', flightId, 'seatIds count:', seatIds.length);

    // Double-check passengers.length === seatIds.length (after validation)
    if (passengers.length !== seatIds.length) {
      debugLog('Booking', 'createBooking - passengers/seats mismatch:', passengers.length, '!=', seatIds.length);
      throw new AppError('Số lượng hành khách phải bằng số lượng ghế', 400);
    }

    const bookingCode = generateBookingCode();

    const { data, error } = await supabase.rpc('create_booking', {
      p_user_id: userId,
      p_flight_id: flightId,
      p_passengers: passengers,
      p_seat_ids: seatIds,
      p_booking_code: bookingCode,
    });

    if (error) {
      const message = error.message;
      errorLog('Booking', 'createBooking', 'RPC error:', message, 'code:', error.code);
      if (message.includes('không tồn tại')) throw new AppError(message, 404);
      if (message.includes('đã được đặt')) throw new AppError(message, 409);
      throw new AppError(message, 500);
    }

    debugLog('Booking', 'createBooking - success, bookingId:', data.id, 'bookingCode:', data.booking_code, 'totalAmount:', data.total_amount);
    res.status(201).json({ booking: data });
  } catch (error) {
    next(error);
  }
}

// ─── 4.2 cancelBooking ───────────────────────────────────────────────

export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const bookingId = Number(req.params.id);
    debugLog('Booking', 'cancelBooking - userId:', userId, 'bookingId:', bookingId);

    const { data, error } = await supabase.rpc('cancel_booking', {
      p_user_id: userId,
      p_booking_id: bookingId,
    });

    if (error) {
      const message = error.message;
      errorLog('Booking', 'cancelBooking', 'RPC error:', message, 'code:', error.code);
      if (message.includes('không tồn tại')) throw new AppError(message, 404);
      if (message.includes('Không thể hủy')) throw new AppError(message, 400);
      throw new AppError(message, 500);
    }

    debugLog('Booking', 'cancelBooking - success, bookingId:', bookingId);
    res.status(200).json({ booking: data });
  } catch (error) {
    next(error);
  }
}

// ─── 4.3 getBookingHistory ───────────────────────────────────────────

export async function getBookingHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = Number(req.query.page) || 1;
    debugLog('Booking', 'getBookingHistory - userId:', userId, 'page:', page);
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('bookings')
      .select(`
        *,
        flights!inner(
          departure_time, arrival_time, status,
          airlines!inner(name, code),
          departure_airport:airports!departure_airport_id!inner(code, city),
          arrival_airport:airports!arrival_airport_id!inner(code, city)
        ),
        passengers(seats(seat_number, class))
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(error.message, 500);
    }

    // Map embedded relations to flat format matching original response
    const bookings = (data || []).map((b: any) => ({
      id: b.id,
      user_id: b.user_id,
      flight_id: b.flight_id,
      booking_code: b.booking_code,
      status: b.status,
      total_amount: b.total_amount,
      created_at: b.created_at,
      updated_at: b.updated_at,
      airline_name: b.flights?.airlines?.name ?? '',
      airline_code: b.flights?.airlines?.code ?? '',
      departure_airport_code: b.flights?.departure_airport?.code ?? '',
      departure_airport_city: b.flights?.departure_airport?.city ?? '',
      arrival_airport_code: b.flights?.arrival_airport?.code ?? '',
      arrival_airport_city: b.flights?.arrival_airport?.city ?? '',
      departure_time: b.flights?.departure_time ?? '',
      arrival_time: b.flights?.arrival_time ?? '',
      flight_status: b.flights?.status ?? '',
      seat_numbers: Array.isArray(b.passengers)
        ? b.passengers.map((p: any) => p.seats?.seat_number).filter(Boolean)
        : [],
      seats_count: Array.isArray(b.passengers) ? b.passengers.length : 0,
    }));

    const total = count ?? 0;

    debugLog('Booking', 'getBookingHistory - total found:', total, 'page:', page);

    const result: PaginatedResult<any> = {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}


// ─── 4.3 getBookingById ──────────────────────────────────────────────

export async function getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const bookingId = Number(req.params.id);
    debugLog('Booking', 'getBookingById - userId:', userId, 'bookingId:', bookingId);

    // Get booking with flight info via embedded relations
    const { data: b, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        flights!inner(
          departure_time, arrival_time,
          airlines!inner(name, code),
          departure_airport:airports!departure_airport_id!inner(code, city),
          arrival_airport:airports!arrival_airport_id!inner(code, city)
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError) {
      if (bookingError.code === 'PGRST116') {
        debugLog('Booking', 'getBookingById - not found, bookingId:', bookingId, 'userId:', userId);
        throw new AppError('Đặt vé không tồn tại', 404);
      }
      throw new AppError(bookingError.message, 500);
    }

    if (!b) {
      debugLog('Booking', 'getBookingById - not found, bookingId:', bookingId, 'userId:', userId);
      throw new AppError('Đặt vé không tồn tại', 404);
    }

    // Get passengers with seat info
    const { data: passengersData, error: passError } = await supabase
      .from('passengers')
      .select(`
        full_name, date_of_birth, id_number, id_type,
        seats!inner(seat_number, class)
      `)
      .eq('booking_id', bookingId);

    if (passError) {
      throw new AppError(passError.message, 500);
    }

    const passengers = (passengersData || []).map((p: any) => ({
      full_name: p.full_name,
      date_of_birth: p.date_of_birth,
      id_number: p.id_number,
      id_type: p.id_type,
      seat_number: p.seats?.seat_number ?? '',
      seat_class: p.seats?.class ?? '',
    }));

    // Get payment info (latest payment for this booking)
    const { data: paymentData } = await supabase
      .from('payments')
      .select('status, method, transaction_code, paid_at')
      .eq('booking_id', bookingId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const detail = {
      id: b.id,
      user_id: b.user_id,
      flight_id: b.flight_id,
      booking_code: b.booking_code,
      status: b.status,
      total_amount: b.total_amount,
      created_at: b.created_at,
      updated_at: b.updated_at,
      airline_name: b.flights?.airlines?.name ?? '',
      airline_code: b.flights?.airlines?.code ?? '',
      departure_airport_code: b.flights?.departure_airport?.code ?? '',
      departure_airport_city: b.flights?.departure_airport?.city ?? '',
      arrival_airport_code: b.flights?.arrival_airport?.code ?? '',
      arrival_airport_city: b.flights?.arrival_airport?.city ?? '',
      departure_time: b.flights?.departure_time ?? '',
      arrival_time: b.flights?.arrival_time ?? '',
      passengers,
      payment_status: paymentData?.status ?? null,
      payment_method: paymentData?.method ?? null,
      transaction_code: paymentData?.transaction_code ?? null,
      paid_at: paymentData?.paid_at ?? null,
    };

    debugLog('Booking', 'getBookingById - success, bookingId:', bookingId);
    res.status(200).json({ booking: detail });
  } catch (error) {
    next(error);
  }
}


// ─── 4.4 getAllBookings (admin) ──────────────────────────────────────

export async function getAllBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as AdminBookingQuery;
    debugLog('Booking', 'getAllBookings - filters: status:', query.status || 'none', 'flightId:', query.flightId || 'none');
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('bookings')
      .select(`
        *,
        flights!inner(
          departure_time, arrival_time,
          airlines!inner(name, code),
          departure_airport:airports!departure_airport_id!inner(code, city),
          arrival_airport:airports!arrival_airport_id!inner(code, city)
        ),
        users!inner(email, full_name),
        passengers(seats(seat_number, class))
      `, { count: 'exact' });

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.flightId) {
      dbQuery = dbQuery.eq('flight_id', Number(query.flightId));
    }
    if (query.userId) {
      dbQuery = dbQuery.eq('user_id', Number(query.userId));
    }
    if (query.airlineId) {
      dbQuery = dbQuery.eq('flights.airline_id', Number(query.airlineId));
    }
    if (query.departureDateFrom) {
      dbQuery = dbQuery.gte('flights.departure_time', `${query.departureDateFrom}T00:00:00`);
    }
    if (query.departureDateTo) {
      dbQuery = dbQuery.lt('flights.departure_time', `${query.departureDateTo}T23:59:59.999`);
    }
    if (query.search) {
      const term = query.search.replace(/[%,]/g, '');

      const { data: matchingUsers } = await supabase
        .from('users')
        .select('id')
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

      const matchingUserIds = (matchingUsers || []).map((u) => u.id);

      const orParts = [`booking_code.ilike.%${term}%`];
      if (matchingUserIds.length > 0) {
        orParts.push(`user_id.in.(${matchingUserIds.join(',')})`);
      }
      dbQuery = dbQuery.or(orParts.join(','));
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new AppError(error.message, 500);
    }

    // Map embedded relations to flat format matching original response
    const bookings = (data || []).map((b: any) => ({
      id: b.id,
      user_id: b.user_id,
      flight_id: b.flight_id,
      booking_code: b.booking_code,
      status: b.status,
      total_amount: b.total_amount,
      created_at: b.created_at,
      updated_at: b.updated_at,
      departure_time: b.flights?.departure_time ?? '',
      arrival_time: b.flights?.arrival_time ?? '',
      airline_name: b.flights?.airlines?.name ?? '',
      airline_code: b.flights?.airlines?.code ?? '',
      departure_airport_code: b.flights?.departure_airport?.code ?? '',
      departure_airport_city: b.flights?.departure_airport?.city ?? '',
      arrival_airport_code: b.flights?.arrival_airport?.code ?? '',
      arrival_airport_city: b.flights?.arrival_airport?.city ?? '',
      user_email: b.users?.email ?? '',
      user_full_name: b.users?.full_name ?? '',
      seat_numbers: Array.isArray(b.passengers)
        ? b.passengers.map((p: any) => p.seats?.seat_number).filter(Boolean)
        : [],
      seats_count: Array.isArray(b.passengers) ? b.passengers.length : 0,
    }));

    const total = count ?? 0;

    debugLog('Booking', 'getAllBookings - total found:', total, 'page:', page);

    const result: PaginatedResult<any> = {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ─── 4.4 adminUpdateBookingStatus (admin) ────────────────────────────

export async function adminUpdateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body as { status: string };
    debugLog('Booking', 'adminUpdateBookingStatus - bookingId:', bookingId, 'newStatus:', status);

    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select();

    if (error) {
      throw new AppError(error.message, 500);
    }

    if (!data || data.length === 0) {
      debugLog('Booking', 'adminUpdateBookingStatus - booking not found:', bookingId);
      throw new AppError('Đặt vé không tồn tại', 404);
    }

    debugLog('Booking', 'adminUpdateBookingStatus - success, bookingId:', bookingId, 'newStatus:', status);
    res.status(200).json({ booking: data[0] });
  } catch (error) {
    next(error);
  }
}

// ─── 4.4 adminCancelFlight (admin) ──────────────────────────────────

export async function adminCancelFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const flightId = Number(req.params.id);
    debugLog('Booking', 'adminCancelFlight - flightId:', flightId);

    const { data, error } = await supabase.rpc('admin_cancel_flight', {
      p_flight_id: flightId,
    });

    if (error) {
      const message = error.message;
      errorLog('Booking', 'adminCancelFlight', 'RPC error:', message, 'code:', error.code);
      if (message.includes('không tồn tại')) throw new AppError(message, 404);
      throw new AppError(message, 500);
    }

    const cancelledCount = data?.cancelledCount ?? 0;

    debugLog('Booking', 'adminCancelFlight - success, flightId:', flightId, 'cancelledBookings:', cancelledCount);
    res.status(200).json({
      message: 'Hủy chuyến bay thành công',
      cancelledBookings: cancelledCount,
    });
  } catch (error) {
    next(error);
  }
}
