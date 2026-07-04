import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './shared/middlewares/error.middleware';
import authRoutes, { adminCustomerRoutes } from './Auth/auth.routes';
import flightRoutes, { adminFlightRoutes } from './FlightCtrl/flight.routes';
import bookingRoutes, { adminBookingRoutes } from './BookingCtrl/booking.routes';
import paymentRoutes from './PaymentCtrl/payment.routes';
import reportRoutes from './ReportCtrl/report.routes';
import airportRoutes, { adminAirportRoutes } from './AirportCtrl/airport.routes';
import airlineRoutes, { adminAirlineRoutes } from './AirlineCtrl/airline.routes';

const app = express();

// Trust proxy (required for Render, Cloud Run, etc.)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration - only allow frontend domain
app.use(cors({
  origin: true,
  credentials: true,
}));

// Rate limiting: 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/airports', airportRoutes);
app.use('/api/airlines', airlineRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminFlightRoutes);
app.use('/api/admin', adminBookingRoutes);
app.use('/api/admin', adminAirportRoutes);
app.use('/api/admin', adminAirlineRoutes);
app.use('/api/admin', adminCustomerRoutes);
app.use('/api/admin/reports', reportRoutes);

// Global error handler (must be last middleware)
app.use(errorHandler);

export default app;
