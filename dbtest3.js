const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});

async function test() {
  try {
    const r1 = await p.query('SELECT current_database() as db');
    console.log('Database:', JSON.stringify(r1.rows));

    const r2 = await p.query("SELECT id, email, role, tenant_id FROM users WHERE email = 'admin@clinic.com'");
    console.log('User:', JSON.stringify(r2.rows));

    const r3 = await p.query("SELECT password FROM users WHERE email = 'admin@clinic.com'");
    console.log('Has password:', r3.rows.length > 0 ? r3.rows[0].password.substring(0,10) + '...' : 'none');

    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message, e.code);
    process.exit(1);
  }
}

test();
