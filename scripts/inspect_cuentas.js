const pool = require('../src/config/database');

(async () => {
  const result = await pool.query(
    "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cuentas' ORDER BY ordinal_position"
  );

  console.log('TABLE cuentas');
  console.log(JSON.stringify(result.rows, null, 2));

  const sample = await pool.query(
    "SELECT id_cliente, numero_cuenta, saldo, estado FROM cuentas LIMIT 10"
  );

  console.log('\nSAMPLE:', JSON.stringify(sample.rows, null, 2));

  await pool.end();
})();
