const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/clinic',
  max: 1
});

(async () => {
  try {
    // Test 1: set_config + user query
    const r1 = await pool.query(
      "SELECT set_config('app.tenant_id', 'default', true); SELECT 1 AS found FROM users WHERE email = 'admin@clinic.com' LIMIT 1"
    );
    console.log('Test 1 - Multi-stmt (set_config + SELECT):');
    console.log('  rows:', JSON.stringify(r1.rows));
    console.log('  fields:', r1.fields.map(f => f.name));
    console.log('  rowCount:', r1.rowCount);

    // Test 2: set_config only
    const r2 = await pool.query("SELECT set_config('app.test', 'hello', true)");
    console.log('Test 2 - Single set_config:');
    console.log('  rows:', JSON.stringify(r2.rows));

    // Test 3: Regular insert + RETURNING
    const r3 = await pool.query(
      "SELECT set_config('app.tenant_id', 'test', true); SELECT id, email FROM users WHERE email = $1 LIMIT 1",
      ['admin@clinic.com']
    );
    console.log('Test 3 - Multi-stmt with params:');
    console.log('  rows:', JSON.stringify(r3.rows));
    console.log('  fields:', r3.fields.map(f => f.name));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
