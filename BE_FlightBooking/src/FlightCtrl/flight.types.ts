export interface FlightSearchQuery {
  departure: string;
  arrival: string;
  departureDate: string;
  airline?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'departure_time' | 'duration';
  page?: number;
  limit?: number;
}

export interface AdminFlightQuery {
  airlineId?: number;
  status?: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
  departureAirportId?: number;
  arrivalAirportId?: number;
  departureDateFrom?: string;
  departureDateTo?: string;
  page?: number;
  limit?: number;
}

export interface Flight {
  id: number;
  airline_id: number;
  departure_airport_id: number;
  arrival_airport_id: number;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  total_seats: number;
  status: string;
  created_at: string;
}

export interface FlightDetail extends Flight {
  airline_name: string;
  airline_code: string;
  departure_airport_name: string;
  departure_airport_code: string;
  departure_airport_city: string;
  arrival_airport_name: string;
  arrival_airport_code: string;
  arrival_airport_city: string;
  available_seats: number;
}

export interface Seat {
  id: number;
  flight_id: number;
  seat_number: string;
  class: 'economy' | 'business' | 'first';
  status: 'available' | 'booked' | 'blocked';
  price_modifier: number;
}

export interface CreateFlightRequest {
  airline_id: number;
  departure_airport_id: number;
  arrival_airport_id: number;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  total_seats: number;
}

export type UpdateFlightRequest = Partial<CreateFlightRequest>;

export interface SeatConfig {
  seat_number: string;
  class: 'economy' | 'business' | 'first';
  price_modifier: number;
}
