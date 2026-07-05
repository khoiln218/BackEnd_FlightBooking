import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { debugLog, errorLog } from '../shared/utils/debug';
import { PaymentRequest } from './payment.types';
import { generateTransactionCode } from '../shared/utils/helpers';
import { sendMail } from '../shared/utils/mailer';
import { buildBookingConfirmationEmail } from '../shared/utils/bookingEmail';

async function sendBookingConfirmationEmail(bookingId: number): Promise<void> {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        booking_code, total_amount,
        users!inner(email),
        flights!inner(
          departure_time, arrival_time,
          airlines!inner(name),
          departure_airport:airports!departure_airport_id!inner(code, city),
          arrival_airport:airports!arrival_airport_id!inner(code, city)
        ),
        passengers(full_name, seats(seat_number, class))
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      errorLog('Payment', 'sendBookingConfirmationEmail', 'không lấy được thông tin đặt vé:', error?.message);
      return;
    }

    const b = booking as any;
    const { subject, html } = buildBookingConfirmationEmail({
      bookingCode: b.booking_code,
      airlineName: b.flights?.airlines?.name ?? '',
      departureAirportCode: b.flights?.departure_airport?.code ?? '',
      departureAirportCity: b.flights?.departure_airport?.city ?? '',
      arrivalAirportCode: b.flights?.arrival_airport?.code ?? '',
      arrivalAirportCity: b.flights?.arrival_airport?.city ?? '',
      departureTime: b.flights?.departure_time ?? '',
      arrivalTime: b.flights?.arrival_time ?? '',
      totalAmount: Number(b.total_amount),
      passengers: (b.passengers || []).map((p: any) => ({
        fullName: p.full_name,
        seatNumber: p.seats?.seat_number ?? '',
        seatClass: p.seats?.class ?? '',
      })),
    });

    await sendMail({ to: b.users?.email, subject, html });
  } catch (error) {
    errorLog('Payment', 'sendBookingConfirmationEmail', 'lỗi khi gửi mail xác nhận đặt vé:', error);
  }
}

export async function processPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bookingId, amount, method } = req.body as PaymentRequest;

    debugLog('Payment', 'processPayment - userId:', userId, 'bookingId:', bookingId, 'amount:', amount, 'method:', method);

    const transactionCode = generateTransactionCode();

    const { data, error } = await supabase.rpc('process_payment', {
      p_user_id: userId,
      p_booking_id: bookingId,
      p_amount: amount,
      p_method: method,
      p_transaction_code: transactionCode,
    });

    if (error) {
      const message = error.message;
      errorLog('Payment', 'processPayment', 'RPC error:', error.message, 'code:', error.code);
      if (message.includes('không tồn tại')) throw new AppError(message, 404);
      if (message.includes('đã thanh toán')) throw new AppError(message, 404);
      if (message.includes('không khớp')) throw new AppError(message, 400);
      throw new AppError(message, 500);
    }

    debugLog('Payment', 'processPayment - success, paymentId:', data.id, 'transactionCode:', data.transaction_code);

    void sendBookingConfirmationEmail(bookingId);

    res.status(200).json({ payment: data });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const bookingId = Number(req.params.bookingId);

    debugLog('Payment', 'getPaymentByBookingId - userId:', userId, 'bookingId:', bookingId);

    // Verify booking belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError || !booking) {
      debugLog('Payment', 'getPaymentByBookingId - not found, bookingId:', bookingId, 'userId:', userId);
      throw new AppError('Đặt vé không tồn tại', 404);
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      throw new AppError(paymentError.message, 500);
    }

    if (!payment) {
      debugLog('Payment', 'getPaymentByBookingId - not found, no payment for bookingId:', bookingId);
      throw new AppError('Chưa có thanh toán cho đặt vé này', 404);
    }

    debugLog('Payment', 'getPaymentByBookingId - success, paymentId:', payment.id, 'status:', payment.status);
    res.status(200).json({ payment });
  } catch (error) {
    next(error);
  }
}
