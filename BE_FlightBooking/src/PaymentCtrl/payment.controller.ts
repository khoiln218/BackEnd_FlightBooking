import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { debugLog, errorLog } from '../shared/utils/debug';
import { PaymentRequest } from './payment.types';
import { generateTransactionCode } from '../shared/utils/helpers';

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
