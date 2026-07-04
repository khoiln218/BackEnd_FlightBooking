import { body, query } from 'express-validator';
export { handleValidationErrors } from '../Auth/auth.validator';

export const searchFlightValidation = [
  query('departure')
    .notEmpty().withMessage('Mã sân bay đi là bắt buộc')
    .matches(/^[A-Z]{3}$/).withMessage('Mã sân bay đi phải gồm 3 chữ cái viết hoa'),

  query('arrival')
    .notEmpty().withMessage('Mã sân bay đến là bắt buộc')
    .matches(/^[A-Z]{3}$/).withMessage('Mã sân bay đến phải gồm 3 chữ cái viết hoa'),

  query('departureDate')
    .notEmpty().withMessage('Ngày khởi hành là bắt buộc')
    .isISO8601({ strict: true, strictSeparator: true }).withMessage('Ngày khởi hành phải đúng định dạng ISO')
    .custom((value: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const depDate = new Date(value);
      if (depDate < today) {
        throw new Error('Ngày khởi hành phải từ hôm nay trở đi');
      }
      return true;
    }),

  query('airline')
    .optional()
    .matches(/^[A-Z]{3}$/).withMessage('Mã hãng bay phải gồm 3 chữ cái viết hoa'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá tối thiểu phải là số >= 0')
    .toFloat(),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá tối đa phải là số >= 0')
    .toFloat(),

  query('sortBy')
    .optional()
    .isIn(['price', 'departure_time', 'duration']).withMessage('sortBy phải là price, departure_time hoặc duration'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page phải là số nguyên >= 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit phải là số nguyên từ 1 đến 100')
    .toInt(),
];

export const createFlightValidation = [
  body('airline_id')
    .notEmpty().withMessage('airline_id là bắt buộc')
    .isInt().withMessage('airline_id phải là số nguyên'),

  body('departure_airport_id')
    .notEmpty().withMessage('departure_airport_id là bắt buộc')
    .isInt().withMessage('departure_airport_id phải là số nguyên'),

  body('arrival_airport_id')
    .notEmpty().withMessage('arrival_airport_id là bắt buộc')
    .isInt().withMessage('arrival_airport_id phải là số nguyên'),

  body('departure_time')
    .notEmpty().withMessage('Giờ khởi hành là bắt buộc')
    .isISO8601().withMessage('Giờ khởi hành phải đúng định dạng ISO 8601'),

  body('arrival_time')
    .notEmpty().withMessage('Giờ đến là bắt buộc')
    .isISO8601().withMessage('Giờ đến phải đúng định dạng ISO 8601')
    .custom((value: string, { req }) => {
      if (req.body.departure_time && new Date(value) <= new Date(req.body.departure_time)) {
        throw new Error('Giờ đến phải sau giờ khởi hành');
      }
      return true;
    }),

  body('base_price')
    .notEmpty().withMessage('Giá cơ bản là bắt buộc')
    .isFloat({ gt: 0 }).withMessage('Giá cơ bản phải là số lớn hơn 0'),

  body('total_seats')
    .notEmpty().withMessage('Tổng số ghế là bắt buộc')
    .isInt({ gt: 0 }).withMessage('Tổng số ghế phải là số nguyên lớn hơn 0'),
];

export const updateFlightValidation = [
  body('airline_id')
    .optional()
    .isInt().withMessage('airline_id phải là số nguyên'),

  body('departure_airport_id')
    .optional()
    .isInt().withMessage('departure_airport_id phải là số nguyên'),

  body('arrival_airport_id')
    .optional()
    .isInt().withMessage('arrival_airport_id phải là số nguyên'),

  body('departure_time')
    .optional()
    .isISO8601().withMessage('Giờ khởi hành phải đúng định dạng ISO 8601'),

  body('arrival_time')
    .optional()
    .isISO8601().withMessage('Giờ đến phải đúng định dạng ISO 8601'),

  body('base_price')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Giá cơ bản phải là số lớn hơn 0'),

  body('total_seats')
    .optional()
    .isInt({ gt: 0 }).withMessage('Tổng số ghế phải là số nguyên lớn hơn 0'),

  body().custom((_, { req }) => {
    if (req.body.departure_time && req.body.arrival_time) {
      if (new Date(req.body.arrival_time) <= new Date(req.body.departure_time)) {
        throw new Error('Giờ đến phải sau giờ khởi hành');
      }
    }
    return true;
  }),
];

export const updateFlightStatusValidation = [
  body('status')
    .notEmpty().withMessage('status là bắt buộc')
    .isIn(['scheduled', 'delayed', 'completed']).withMessage('status phải là scheduled, delayed hoặc completed'),
];
