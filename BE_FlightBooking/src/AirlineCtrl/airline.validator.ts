import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const createAirlineValidation = [
  body('name')
    .notEmpty().withMessage('Tên hãng bay là bắt buộc')
    .trim()
    .isLength({ max: 255 }).withMessage('Tên hãng bay tối đa 255 ký tự'),

  body('code')
    .notEmpty().withMessage('Mã hãng bay là bắt buộc')
    .trim()
    .isLength({ min: 2, max: 10 }).withMessage('Mã hãng bay phải từ 2-10 ký tự')
    .matches(/^[A-Z0-9]+$/).withMessage('Mã hãng bay chỉ chứa chữ in hoa và số'),

  body('logo_url')
    .optional()
    .isString().withMessage('Logo URL phải là chuỗi'),
];

export const updateAirlineValidation = [
  body('name')
    .optional()
    .notEmpty().withMessage('Tên hãng bay không được rỗng')
    .trim()
    .isLength({ max: 255 }),

  body('code')
    .optional()
    .notEmpty().withMessage('Mã hãng bay không được rỗng')
    .trim()
    .isLength({ min: 2, max: 10 })
    .matches(/^[A-Z0-9]+$/).withMessage('Mã hãng bay chỉ chứa chữ in hoa và số'),

  body('logo_url')
    .optional()
    .isString(),
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
