import 'dotenv/config';
import supabase from '../src/config/database';

/**
 * Keep-alive script cho Supabase free tier.
 * Supabase pause project sau 7 ngày không có activity.
 * Chạy query đơn giản để reset timer.
 *
 * Cách chạy:
 *   npx ts-node scripts/keep-alive.ts
 *
 * Tự động định kỳ (khuyến nghị):
 *   - GitHub Actions cron (xem .github/workflows/keep-alive.yml)
 *   - Windows Task Scheduler chạy scripts/keep-alive.bat
 *   - cron trên Linux/Mac
 */

async function keepAlive() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Ping Supabase...`);

  // Query đơn giản: count users (nhẹ, không ảnh hưởng data)
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`❌ Keep-alive failed:`, error.message);
    process.exit(1);
  }

  console.log(`✅ OK — users count: ${count}`);
}

keepAlive().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
