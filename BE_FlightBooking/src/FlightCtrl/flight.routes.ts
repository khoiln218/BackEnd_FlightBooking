import { Router } from 'express';
import {
  searchFlightValidation,
  createFlightValidation,
  updateFlightValidation,
  handleValidationErrors,
} from './flight.validator';
import {
  searchFlights,
  getAllFlightsAdmin,
  getFlightById,
  getFlightSeats,
  createFlight,
  updateFlight,
  deleteFlight,
} from './flight.controller';
import { authMiddleware } from '../shared/middlewares/auth.middleware';
import { authorize } from '../shared/middlewares/authorize.middleware';

// Public routes — mounted at /api/flights
const flightRoutes = Router();

// GET /api/flights/search
flightRoutes.get('/search', searchFlightValidation, handleValidationErrors, searchFlights);

// GET /api/flights/:id
flightRoutes.get('/:id', getFlightById);

// GET /api/flights/:id/seats
flightRoutes.get('/:id/seats', getFlightSeats);

// Admin routes — mounted at /api/admin
const adminFlightRoutes = Router();

// GET /api/admin/flights
adminFlightRoutes.get('/flights', authMiddleware, authorize('admin'), getAllFlightsAdmin);

// POST /api/admin/flights
adminFlightRoutes.post('/flights', authMiddleware, authorize('admin'), createFlightValidation, handleValidationErrors, createFlight);

// PUT /api/admin/flights/:id
adminFlightRoutes.put('/flights/:id', authMiddleware, authorize('admin'), updateFlightValidation, handleValidationErrors, updateFlight);

// DELETE /api/admin/flights/:id
adminFlightRoutes.delete('/flights/:id', authMiddleware, authorize('admin'), deleteFlight);

export { adminFlightRoutes };
export default flightRoutes;
