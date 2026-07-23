const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const tables = ['bookings','users','doctors','specialties','invoices','invoice_items','lab_requests','lab_tests'];
  for (const t of tables) {
    try {
      const r = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position', [t]);
      console.log(t + ': ' + r.rows.map(x=>x.column_name).join(', '));
    } catch(e) {
      console.log(t + ': ERROR ' + e.message);
    }
  }
  await pool.end();
}
check();
