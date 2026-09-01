const db = require('/app/dist/shared/db.js');

async function test() {
  try {
    // Test pool connection
    const r0 = await db.pool.query('SELECT current_database() as db, inet_server_addr() as server');
    console.log('Pool connects to:', JSON.stringify(r0.rows[0]));

    // Test readPool
    console.log('readPool is same as pool:', db.readPool === db.pool);
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('DATABASE_URL_READ_ONLY:', process.env.DATABASE_URL_READ_ONLY || '(not set)');

    // Try the exact login query
    const r1 = await db.readPool.query(
      `SELECT id, email, name, role, tenant_id, active FROM users WHERE email = $1 AND (tenant_id = $2 OR (role = 'superadmin' AND tenant_id IS NULL))`,
      ['admin@clinic.com', 'default']
    );
    console.log('Login query result:', JSON.stringify(r1.rows));

    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error('Code:', e.code);
    console.error('Stack:', e.stack.substring(0, 500));
    process.exit(1);
  }
}

test();
