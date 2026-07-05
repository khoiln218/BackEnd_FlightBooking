import { PaginationQuery } from '../shared/types/common.types';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface PassengerInfo {
  fullName: string;
  dateOfBirth: string;
  idNumber: string;
  idType: 'cmnd' | 'cccd' | 'passport';
}

export interface CreateBookingRequest {
  flightId: number;
  passengers: PassengerInfo[];
  seatIds: number[];
}

export interface Booking {
  id: number;
  user_id: number;
  flight_id: number;
  booking_code: string;
  status: BookingStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BookingDetail extends Booking {
  airline_name: string;
  airline_code: string;
  departure_airport_code: string;
  departure_airport_city: string;
  arrival_airport_code: string;
  arrival_airport_city: string;
  departure_time: string;
  arrival_time: string;
  passengers: {
    full_name: string;
    date_of_birth: string;
    id_number: string;
    id_type: 'cmnd' | 'cccd' | 'passport';
    seat_number: string;
    seat_class: 'economy' | 'business' | 'first';
  }[];
  payment_status?: string;
  payment_method?: string;
  transaction_code?: string;
  paid_at?: string;
}

export interface AdminBookingQuery extends PaginationQuery {
  id?: number;
  status?: BookingStatus;
  flightId?: number;
  userId?: number;
  airlineId?: number;
  departureDateFrom?: string;
  departureDateTo?: string;
  search?: string;
}
