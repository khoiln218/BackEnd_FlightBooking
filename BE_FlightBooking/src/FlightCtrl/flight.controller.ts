import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { debugLog, errorLog } from '../shared/utils/debug';
import {
  FlightSearchQuery,
  AdminFlightQuery,
  FlightDetail,
  Seat,
  CreateFlightRequest,
  UpdateFlightRequest,
  UpdateFlightStatusRequest,
} from './flight.types';
import { PaginatedResult } from '../shared/types/common.types';

export async function searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as FlightSearchQuery;
    debugLog('Flight', 'searchFlights - departure:', query.departure, 'arrival:', query.arrival, 'date:', query.departureDate);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build Supabase query with embedded relations
    let dbQuery = supabase
      .from('flights')
      .select(`
        *,
        airlines!inner(name, code),
        departure_airport:airports!departure_airport_id!inner(name, code, city),
        arrival_airport:airports!arrival_airport_id!inner(name, code, city),
        seats!left(id, status)
      `, { count: 'exact' })
      .eq('status', 'scheduled')
      .eq('departure_airport.code', query.departure)
      .eq('arrival_airport.code', query.arrival)
      .gte('departure_time', `${query.departureDate}T00:00:00`)
      .lt('departure_time', `${query.departureDate}T23:59:59.999`)
      .gt('departure_time', new Date().toISOString());

    if (query.airline) {
      dbQuery = dbQuery.eq('airlines.code', query.airline);
    }
    if (query.minPrice !== undefined && query.minPrice !== null) {
      dbQuery = dbQuery.gte('base_price', Number(query.minPrice));
    }
    if (query.maxPrice !== undefined && query.maxPrice !== null) {
      dbQuery = dbQuery.lte('base_price', Number(query.maxPrice));
    }

    // Apply sort and pagination
    // For 'duration' sort, we cannot use Supabase query builder directly
    // so we handle it differently
    const sortBy = query.sortBy ?? 'departure_time';

    if (sortBy === 'price') {
      dbQuery = dbQuery.order('base_price', { ascending: true });
    } else if (sortBy === 'departure_time') {
      dbQuery = dbQuery.order('departure_time', { ascending: true });
    }
    // For 'duration' sort, we skip server-side ordering and sort in JS after fetch

    if (sortBy !== 'duration') {
      dbQuery = dbQuery.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new AppError(error.message, 500);
    }

    // Map embedded relations to flat FlightDetail format
    let flights: FlightDetail[] = (data || []).map((f: any) => ({
      id: f.id,
      airline_id: f.airline_id,
      departure_airport_id: f.departure_airport_id,
      arrival_airport_id: f.arrival_airport_id,
      departure_time: f.departure_time,
      arrival_time: f.arrival_time,
      base_price: f.base_price,
      total_seats: f.total_seats,
      status: f.status,
      created_at: f.created_at,
      airline_name: f.airlines?.name ?? '',
      airline_code: f.airlines?.code ?? '',
      departure_airport_name: f.departure_airport?.name ?? '',
      departure_airport_code: f.departure_airport?.code ?? '',
      departure_airport_city: f.departure_airport?.city ?? '',
      arrival_airport_name: f.arrival_airport?.name ?? '',
      arrival_airport_code: f.arrival_airport?.code ?? '',
      arrival_airport_city: f.arrival_airport?.city ?? '',
      available_seats: Array.isArray(f.seats)
        ? f.seats.filter((s: any) => s.status === 'available').length
        : 0,
    }));

    let total = count ?? 0;

    // Handle duration sort: sort in JS and paginate manually
    if (sortBy === 'duration') {
      flights.sort((a, b) => {
        const durationA = new Date(a.arrival_time).getTime() - new Date(a.departure_time).getTime();
        const durationB = new Date(b.arrival_time).getTime() - new Date(b.departure_time).getTime();
        return durationA - durationB;
      });
      total = flights.length;
      flights = flights.slice(offset, offset + limit);
    }

    const result: PaginatedResult<FlightDetail> = {
      data: flights,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    debugLog('Flight', 'searchFlights - found:', total, 'flights, page:', page);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAllFlightsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as AdminFlightQuery;
    debugLog('Flight', 'getAllFlightsAdmin - airlineId:', query.airlineId || 'none', 'status:', query.status || 'none');
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('flights')
      .select(`
        *,
        airlines!inner(name, code),
        departure_airport:airports!departure_airport_id!inner(name, code, city),
        arrival_airport:airports!arrival_airport_id!inner(name, code, city),
        seats!left(id, status)
      `, { count: 'exact' });

    if (query.id) {
      dbQuery = dbQuery.eq('id', Number(query.id));
    }
    if (query.airlineId) {
      dbQuery = dbQuery.eq('airline_id', Number(query.airlineId));
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.departureAirportId) {
      dbQuery = dbQuery.eq('departure_airport_id', Number(query.departureAirportId));
    }
    if (query.arrivalAirportId) {
      dbQuery = dbQuery.eq('arrival_airport_id', Number(query.arrivalAirportId));
    }
    if (query.departureDateFrom) {
      dbQuery = dbQuery.gte('departure_time', `${query.departureDateFrom}T00:00:00`);
    }
    if (query.departureDateTo) {
      dbQuery = dbQuery.lt('departure_time', `${query.departureDateTo}T23:59:59.999`);
    }

    dbQuery = dbQuery
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new AppError(error.message, 500);
    }

    const flights: FlightDetail[] = (data || []).map((f: any) => ({
      id: f.id,
      airline_id: f.airline_id,
      departure_airport_id: f.departure_airport_id,
      arrival_airport_id: f.arrival_airport_id,
      departure_time: f.departure_time,
      arrival_time: f.arrival_time,
      base_price: f.base_price,
      total_seats: f.total_seats,
      status: f.status,
      created_at: f.created_at,
      airline_name: f.airlines?.name ?? '',
      airline_code: f.airlines?.code ?? '',
      departure_airport_name: f.departure_airport?.name ?? '',
      departure_airport_code: f.departure_airport?.code ?? '',
      departure_airport_city: f.departure_airport?.city ?? '',
      arrival_airport_name: f.arrival_airport?.name ?? '',
      arrival_airport_code: f.arrival_airport?.code ?? '',
      arrival_airport_city: f.arrival_airport?.city ?? '',
      available_seats: Array.isArray(f.seats)
        ? f.seats.filter((s: any) => s.status === 'available').length
        : 0,
    }));

    const total = count ?? 0;

    const result: PaginatedResult<FlightDetail> = {
      data: flights,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    debugLog('Flight', 'getAllFlightsAdmin - found:', total, 'flights, page:', page);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getFlightById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    debugLog('Flight', 'getFlightById - id:', id);

    const { data: f, error } = await supabase
      .from('flights')
      .select(`
        *,
        airlines(name, code),
        departure_airport:airports!departure_airport_id(name, code, city),
        arrival_airport:airports!arrival_airport_id(name, code, city),
        seats!left(id, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        debugLog('Flight', 'getFlightById - not found:', id);
        throw new AppError('Chuyến bay không tồn tại', 404);
      }
      throw new AppError(error.message, 500);
    }

    if (!f) {
      debugLog('Flight', 'getFlightById - not found:', id);
      throw new AppError('Chuyến bay không tồn tại', 404);
    }

    const flight: FlightDetail = {
      id: f.id,
      airline_id: f.airline_id,
      departure_airport_id: f.departure_airport_id,
      arrival_airport_id: f.arrival_airport_id,
      departure_time: f.departure_time,
      arrival_time: f.arrival_time,
      base_price: f.base_price,
      total_seats: f.total_seats,
      status: f.status,
      created_at: f.created_at,
      airline_name: (f as any).airlines?.name ?? '',
      airline_code: (f as any).airlines?.code ?? '',
      departure_airport_name: (f as any).departure_airport?.name ?? '',
      departure_airport_code: (f as any).departure_airport?.code ?? '',
      departure_airport_city: (f as any).departure_airport?.city ?? '',
      arrival_airport_name: (f as any).arrival_airport?.name ?? '',
      arrival_airport_code: (f as any).arrival_airport?.code ?? '',
      arrival_airport_city: (f as any).arrival_airport?.city ?? '',
      available_seats: Array.isArray((f as any).seats)
        ? (f as any).seats.filter((s: any) => s.status === 'available').length
        : 0,
    };

    debugLog('Flight', 'getFlightById - found, available_seats:', flight.available_seats);
    res.status(200).json({ flight });
  } catch (error) {
    next(error);
  }
}

export async function getFlightSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    debugLog('Flight', 'getFlightSeats - flightId:', id);

    // Check flight exists
    const { data: flight, error: flightError } = await supabase
      .from('flights')
      .select('id')
      .eq('id', id)
      .single();

    if (flightError || !flight) {
      debugLog('Flight', 'getFlightSeats - flight not found:', id);
      throw new AppError('Chuyến bay không tồn tại', 404);
    }

    const { data: seats, error } = await supabase
      .from('seats')
      .select('*')
      .eq('flight_id', id);

    if (error) {
      throw new AppError(error.message, 500);
    }

    const seatList = (seats || []) as Seat[];

    debugLog('Flight', 'getFlightSeats - total seats:', seatList.length, 'available:', seatList.filter(s => s.status === 'available').length);
    res.status(200).json({ seats: seatList });
  } catch (error) {
    next(error);
  }
}

export async function createFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateFlightRequest;
    debugLog('Flight', 'createFlight - airline:', data.airline_id, 'seats:', data.total_seats);

    if (new Date(data.departure_time) >= new Date(data.arrival_time)) {
      debugLog('Flight', 'createFlight - invalid time: departure >= arrival');
      throw new AppError('Giờ khởi hành phải trước giờ đến', 400);
    }

    const { data: rpcResult, error } = await supabase.rpc('create_flight_with_seats', {
      p_airline_id: data.airline_id,
      p_departure_airport_id: data.departure_airport_id,
      p_arrival_airport_id: data.arrival_airport_id,
      p_departure_time: data.departure_time,
      p_arrival_time: data.arrival_time,
      p_base_price: data.base_price,
      p_total_seats: data.total_seats,
    });

    if (error) {
      errorLog('Flight', 'createFlight', 'RPC error:', error.message, 'code:', error.code);
      // FK violation → invalid reference
      if (error.code === '23503') {
        throw new AppError('Tham chiếu không hợp lệ', 400);
      }
      throw new AppError(error.message, 500);
    }

    const flight = rpcResult?.flight;

    // Fetch seats for the created flight
    const { data: seats } = await supabase
      .from('seats')
      .select('*')
      .eq('flight_id', flight?.id);

    debugLog('Flight', 'createFlight - success, flightId:', flight?.id, 'seats:', (seats || []).length);
    res.status(201).json({ flight, seats: seats || [] });
  } catch (error) {
    next(error);
  }
}

export async function updateFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body as UpdateFlightRequest;
    debugLog('Flight', 'updateFlight - id:', id, 'fields:', Object.keys(data));

    // Validate time constraints
    if (data.departure_time && data.arrival_time) {
      if (new Date(data.departure_time) >= new Date(data.arrival_time)) {
        throw new AppError('Giờ khởi hành phải trước giờ đến', 400);
      }
    } else if (data.departure_time || data.arrival_time) {
      const { data: existing, error: fetchError } = await supabase
        .from('flights')
        .select('departure_time, arrival_time')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        throw new AppError('Chuyến bay không tồn tại', 404);
      }

      const depTime = data.departure_time ?? existing.departure_time;
      const arrTime = data.arrival_time ?? existing.arrival_time;

      if (new Date(depTime) >= new Date(arrTime)) {
        throw new AppError('Giờ khởi hành phải trước giờ đến', 400);
      }
    }

    // Build dynamic update fields
    const allowedFields: (keyof UpdateFlightRequest)[] = [
      'airline_id',
      'departure_airport_id',
      'arrival_airport_id',
      'departure_time',
      'arrival_time',
      'base_price',
      'total_seats',
    ];

    const updateData: Record<string, string | number> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] as string | number;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('Không có trường nào để cập nhật', 400);
    }

    const { data: updated, error } = await supabase
      .from('flights')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      errorLog('Flight', 'updateFlight', 'error:', error.message, 'code:', error.code);
      if (error.code === '23503') {
        throw new AppError('Tham chiếu không hợp lệ', 400);
      }
      throw new AppError(error.message, 500);
    }

    if (!updated || updated.length === 0) {
      throw new AppError('Chuyến bay không tồn tại', 404);
    }

    debugLog('Flight', 'updateFlight - success, id:', id);
    res.status(200).json({ flight: updated[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/flights/:id/status — Admin
 * Đổi trạng thái chuyến bay đang 'scheduled'/'delayed' sang 'scheduled', 'delayed' hoặc 'completed'.
 * Khi chuyển sang 'completed', toàn bộ vé đã xác nhận ('confirmed') của chuyến cũng chuyển sang 'completed'.
 * Hủy chuyến (cancelled) phải đi qua adminCancelFlight (BookingCtrl) vì còn phải hủy vé liên quan.
 */
export async function updateFlightStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body as UpdateFlightStatusRequest;
    debugLog('Flight', 'updateFlightStatus - id:', id, 'status:', status);

    const { data: existing, error: fetchError } = await supabase
      .from('flights')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new AppError('Chuyến bay không tồn tại', 404);
    }

    if (existing.status !== 'scheduled' && existing.status !== 'delayed') {
      throw new AppError('Chỉ có thể đổi trạng thái chuyến bay đang lên lịch hoặc hoãn', 400);
    }

    const { data: updated, error } = await supabase
      .from('flights')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      errorLog('Flight', 'updateFlightStatus', 'error:', error.message, 'code:', error.code);
      throw new AppError(error.message, 500);
    }

    if (!updated || updated.length === 0) {
      throw new AppError('Chuyến bay không tồn tại', 404);
    }

    // Khi chuyến bay hoàn thành, toàn bộ vé đã xác nhận của chuyến cũng chuyển sang hoàn thành
    let completedBookings = 0;
    if (status === 'completed') {
      const { data: completed, error: bookingsError } = await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('flight_id', id)
        .eq('status', 'confirmed')
        .select('id');

      if (bookingsError) {
        errorLog('Flight', 'updateFlightStatus', 'bookings update error:', bookingsError.message, 'code:', bookingsError.code);
        throw new AppError(bookingsError.message, 500);
      }

      completedBookings = completed?.length ?? 0;
    }

    debugLog('Flight', 'updateFlightStatus - success, id:', id, 'status:', status, 'completedBookings:', completedBookings);
    res.status(200).json({ flight: updated[0], completedBookings });
  } catch (error) {
    next(error);
  }
}

export async function deleteFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    debugLog('Flight', 'deleteFlight - id:', id);

    const { data, error } = await supabase
      .from('flights')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      errorLog('Flight', 'deleteFlight', 'error:', error.message, 'code:', error.code);
      throw new AppError(error.message, 500);
    }

    if (!data || data.length === 0) {
      debugLog('Flight', 'deleteFlight - not found:', id);
      throw new AppError('Chuyến bay không tồn tại', 404);
    }

    debugLog('Flight', 'deleteFlight - success, id:', id);
    res.status(200).json({ message: 'Xóa chuyến bay thành công' });
  } catch (error) {
    next(error);
  }
}
