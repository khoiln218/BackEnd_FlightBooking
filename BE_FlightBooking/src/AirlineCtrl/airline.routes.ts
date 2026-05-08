import { Router } from 'express';
import {
  createAirlineValidation,
  updateAirlineValidation,
  handleValidationErrors,
} from './airline.validator';
import {
  getAllAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
} from './airline.controller';
import { authMiddleware } from '../shared/middlewares/auth.middleware';
import { authorize } from '../shared/middlewares/authorize.middleware';

// Public routes — mounted at /api/airlines
const airlineRoutes = Router();

// GET /api/airlines
airlineRoutes.get('/', getAllAirlines);

// Admin routes — mounted at /api/admin
const adminAirlineRoutes = Router();

// POST /api/admin/airlines
adminAirlineRoutes.post(
  '/airlines',
  authMiddleware,
  authorize('admin'),
  createAirlineValidation,
  handleValidationErrors,
  createAirline,
);

// PUT /api/admin/airlines/:id
adminAirlineRoutes.put(
  '/airlines/:id',
  authMiddleware,
  authorize('admin'),
  updateAirlineValidation,
  handleValidationErrors,
  updateAirline,
);

// DELETE /api/admin/airlines/:id
adminAirlineRoutes.delete(
  '/airlines/:id',
  authMiddleware,
  authorize('admin'),
  deleteAirline,
);

export { adminAirlineRoutes };
export default airlineRoutes;
