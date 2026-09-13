const pool = require('../src/config/database');

(async () => {
  const tables = ['clientes', 'cuentas', 'usuario_acceso', 'roles', 'usuario_roles', 'transferencias', 'transacciones'];

  for (const table of tables) {
    const result = await pool.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [table]
    );

    console.log('\nTABLE ' + table);
    console.log(JSON.stringify(result.rows, null, 2));
  }

  await pool.end();
})();
