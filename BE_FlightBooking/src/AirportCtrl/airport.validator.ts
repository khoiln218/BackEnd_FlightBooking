import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const createAirportValidation = [
  body('name')
    .notEmpty().withMessage('Tên sân bay là bắt buộc')
    .trim()
    .isLength({ max: 255 }),

  body('code')
    .notEmpty().withMessage('Mã sân bay là bắt buộc')
    .trim()
    .isLength({ min: 3, max: 10 }).withMessage('Mã sân bay phải từ 3-10 ký tự')
    .matches(/^[A-Z]+$/).withMessage('Mã sân bay chỉ chứa chữ in hoa'),

  body('city')
    .notEmpty().withMessage('Thành phố là bắt buộc')
    .trim()
    .isLength({ max: 255 }),

  body('country')
    .notEmpty().withMessage('Quốc gia là bắt buộc')
    .trim()
    .isLength({ max: 255 }),
];

export const updateAirportValidation = [
  body('name').optional().notEmpty().trim().isLength({ max: 255 }),
  body('code').optional().notEmpty().trim().isLength({ min: 3, max: 10 }).matches(/^[A-Z]+$/),
  body('city').optional().notEmpty().trim().isLength({ max: 255 }),
  body('country').optional().notEmpty().trim().isLength({ max: 255 }),
];

export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: (err as any).path,
      message: err.msg,
    }));
    res.status(400).json({ status: 'error', errors: formattedErrors });
    return;
  }
  next();
}
