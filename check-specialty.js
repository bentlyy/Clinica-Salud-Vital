const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const r1 = await pool.query("SELECT id, name, specialty FROM doctors LIMIT 3");
  console.log('doctors:', JSON.stringify(r1.rows));
  const r2 = await pool.query("SELECT id, name FROM specialties LIMIT 3");
  console.log('specialties:', JSON.stringify(r2.rows));
  await pool.end();
}
check();
