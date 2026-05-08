import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AppError } from '../shared/utils/AppError';
import { debugLog, errorLog } from '../shared/utils/debug';
import { RevenueByAirline, RevenueByRoute, MonthlyRevenue } from './report.types';

export async function getRevenueByAirline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    debugLog('Report', 'getRevenueByAirline - startDate:', startDate, 'endDate:', endDate);

    const { data, error } = await supabase.rpc('get_revenue_by_airline', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      errorLog('Report', 'getRevenueByAirline', 'RPC error:', error.message, 'code:', error.code);
      throw new AppError(error.message, 500);
    }

    debugLog('Report', 'getRevenueByAirline - success, rows:', (data ?? []).length);
    res.status(200).json({ data: (data ?? []) as RevenueByAirline[] });
  } catch (error) {
    next(error);
  }
}

export async function getRevenueByRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    debugLog('Report', 'getRevenueByRoute - startDate:', startDate, 'endDate:', endDate);

    const { data, error } = await supabase.rpc('get_revenue_by_route', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      errorLog('Report', 'getRevenueByRoute', 'RPC error:', error.message, 'code:', error.code);
      throw new AppError(error.message, 500);
    }

    debugLog('Report', 'getRevenueByRoute - success, rows:', (data ?? []).length);
    res.status(200).json({ data: (data ?? []) as RevenueByRoute[] });
  } catch (error) {
    next(error);
  }
}

export async function getRevenueByMonth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = Number(req.query.year);
    debugLog('Report', 'getRevenueByMonth - year:', year);

    const { data: rows, error } = await supabase.rpc('get_revenue_by_month', {
      p_year: year,
    });

    if (error) {
      errorLog('Report', 'getRevenueByMonth', 'RPC error:', error.message, 'code:', error.code);
      throw new AppError(error.message, 500);
    }

    // Build full 12-month result, filling missing months with 0
    const rpcRows = (rows ?? []) as { month: number; totalBookings: number; totalRevenue: number }[];
    const monthMap = new Map(rpcRows.map(r => [r.month, r]));
    const data: MonthlyRevenue[] = [];
    for (let m = 1; m <= 12; m++) {
      const row = monthMap.get(m);
      data.push({
        month: m,
        year,
        totalRevenue: row?.totalRevenue ?? 0,
        totalBookings: row?.totalBookings ?? 0,
      });
    }

    debugLog('Report', 'getRevenueByMonth - success, rows:', data.length);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
