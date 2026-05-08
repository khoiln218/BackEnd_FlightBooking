import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { Airport, CreateAirportRequest, UpdateAirportRequest } from './airport.types';

/**
 * GET /api/airports — Public
 * Trả danh sách tất cả airports, sắp xếp theo city.
 */
export async function getAllAirports(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('airports')
      .select('id, name, code, city, country')
      .order('city', { ascending: true });

    if (error) {
      console.error('[Airport] getAllAirports - error:', error.message);
      throw new AppError(error.message, 500);
    }

    res.status(200).json({ data: (data ?? []) as Airport[] });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/airports — Admin
 * Tạo sân bay mới.
 */
export async function createAirport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code, city, country } = req.body as CreateAirportRequest;
    console.log('[Airport] createAirport - code:', code, 'city:', city);

    const { data, error } = await supabase
      .from('airports')
      .insert({ name, code, city, country })
      .select()
      .single();

    if (error) {
      console.error('[Airport] createAirport - error:', error.message, 'code:', error.code);
      if (error.code === '23505') throw new AppError('Mã sân bay đã tồn tại', 409);
      throw new AppError(error.message, 500);
    }

    res.status(201).json({ airport: data });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/airports/:id — Admin
 * Cập nhật sân bay.
 */
export async function updateAirport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body as UpdateAirportRequest;

    const allowedFields: (keyof UpdateAirportRequest)[] = ['name', 'code', 'city', 'country'];
    const updateData: Record<string, string> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] as string;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('Không có trường nào để cập nhật', 400);
    }

    const { data: updated, error } = await supabase
      .from('airports')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Airport] updateAirport - error:', error.message, 'code:', error.code);
      if (error.code === '23505') throw new AppError('Mã sân bay đã tồn tại', 409);
      throw new AppError(error.message, 500);
    }

    if (!updated || updated.length === 0) {
      throw new AppError('Sân bay không tồn tại', 404);
    }

    res.status(200).json({ airport: updated[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/airports/:id — Admin
 * Xóa sân bay. Fail nếu còn flights tham chiếu đến.
 */
export async function deleteAirport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('airports')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Airport] deleteAirport - error:', error.message, 'code:', error.code);
      if (error.code === '23503') {
        throw new AppError('Không thể xóa sân bay đang có chuyến bay', 409);
      }
      throw new AppError(error.message, 500);
    }

    if (!data || data.length === 0) {
      throw new AppError('Sân bay không tồn tại', 404);
    }

    res.status(200).json({ message: 'Xóa sân bay thành công' });
  } catch (error) {
    next(error);
  }
}
