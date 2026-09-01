const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
p.query('SELECT 1 as ok').then(function(r){console.log('DB OK:',JSON.stringify(r.rows));process.exit(0)}).catch(function(e){console.error('DB FAIL:',e.message,e.code);process.exit(1)});
setTimeout(function(){process.exit(2)},5000);
