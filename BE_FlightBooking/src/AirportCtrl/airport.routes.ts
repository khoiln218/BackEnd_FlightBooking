import { Router } from 'express';
import {
  createAirportValidation,
  updateAirportValidation,
  handleValidationErrors,
} from './airport.validator';
import {
  getAllAirports,
  createAirport,
  updateAirport,
  deleteAirport,
} from './airport.controller';
import { authMiddleware } from '../shared/middlewares/auth.middleware';
import { authorize } from '../shared/middlewares/authorize.middleware';

// Public routes — mounted at /api/airports
const airportRoutes = Router();

// GET /api/airports
airportRoutes.get('/', getAllAirports);

// Admin routes — mounted at /api/admin
const adminAirportRoutes = Router();

// POST /api/admin/airports
adminAirportRoutes.post(
  '/airports',
  authMiddleware,
  authorize('admin'),
  createAirportValidation,
  handleValidationErrors,
  createAirport,
);

// PUT /api/admin/airports/:id
adminAirportRoutes.put(
  '/airports/:id',
  authMiddleware,
  authorize('admin'),
  updateAirportValidation,
  handleValidationErrors,
  updateAirport,
);

// DELETE /api/admin/airports/:id
adminAirportRoutes.delete(
  '/airports/:id',
  authMiddleware,
  authorize('admin'),
  deleteAirport,
);

export { adminAirportRoutes };
export default airportRoutes;
