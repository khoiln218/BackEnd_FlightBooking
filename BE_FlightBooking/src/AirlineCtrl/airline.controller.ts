import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { Airline, CreateAirlineRequest, UpdateAirlineRequest } from './airline.types';

/**
 * GET /api/airlines — Public
 * Trả danh sách tất cả hãng bay, sắp xếp theo name.
 */
export async function getAllAirlines(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('airlines')
      .select('id, name, code, logo_url')
      .order('name', { ascending: true });

    if (error) {
      console.error('[Airline] getAllAirlines - error:', error.message);
      throw new AppError(error.message, 500);
    }

    res.status(200).json({ data: (data ?? []) as Airline[] });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/airlines — Admin
 * Tạo hãng bay mới.
 */
export async function createAirline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code, logo_url } = req.body as CreateAirlineRequest;
    console.log('[Airline] createAirline - name:', name, 'code:', code);

    const { data, error } = await supabase
      .from('airlines')
      .insert({ name, code, logo_url: logo_url ?? null })
      .select()
      .single();

    if (error) {
      console.error('[Airline] createAirline - error:', error.message, 'code:', error.code);
      if (error.code === '23505') throw new AppError('Mã hãng bay đã tồn tại', 409);
      throw new AppError(error.message, 500);
    }

    res.status(201).json({ airline: data });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/airlines/:id — Admin
 * Cập nhật hãng bay.
 */
export async function updateAirline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body as UpdateAirlineRequest;

    const allowedFields: (keyof UpdateAirlineRequest)[] = ['name', 'code', 'logo_url'];
    const updateData: Record<string, string | null> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] as string | null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('Không có trường nào để cập nhật', 400);
    }

    const { data: updated, error } = await supabase
      .from('airlines')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Airline] updateAirline - error:', error.message, 'code:', error.code);
      if (error.code === '23505') throw new AppError('Mã hãng bay đã tồn tại', 409);
      throw new AppError(error.message, 500);
    }

    if (!updated || updated.length === 0) {
      throw new AppError('Hãng bay không tồn tại', 404);
    }

    res.status(200).json({ airline: updated[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/airlines/:id — Admin
 * Xóa hãng bay. Fail nếu còn flights tham chiếu đến.
 */
export async function deleteAirline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('airlines')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Airline] deleteAirline - error:', error.message, 'code:', error.code);
      // 23503 = FK violation (còn flights tham chiếu)
      if (error.code === '23503') {
        throw new AppError('Không thể xóa hãng bay đang có chuyến bay', 409);
      }
      throw new AppError(error.message, 500);
    }

    if (!data || data.length === 0) {
      throw new AppError('Hãng bay không tồn tại', 404);
    }

    res.status(200).json({ message: 'Xóa hãng bay thành công' });
  } catch (error) {
    next(error);
  }
}
