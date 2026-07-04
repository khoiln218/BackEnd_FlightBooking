import { Router } from 'express';
import { registerValidation, loginValidation, changePasswordValidation, handleValidationErrors } from './auth.validator';
import { register, login, getProfile, changePassword, getAllCustomers } from './auth.controller';
import { authMiddleware } from '../shared/middlewares/auth.middleware';
import { authorize } from '../shared/middlewares/authorize.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidation, handleValidationErrors, register);

// POST /api/auth/login
router.post('/login', loginValidation, handleValidationErrors, login);

// GET /api/auth/profile
router.get('/profile', authMiddleware, getProfile);

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, changePasswordValidation, handleValidationErrors, changePassword);

// Admin routes — mounted at /api/admin
const adminCustomerRoutes = Router();

// GET /api/admin/customers
adminCustomerRoutes.get('/customers', authMiddleware, authorize('admin'), getAllCustomers);

export { adminCustomerRoutes };
export default router;
