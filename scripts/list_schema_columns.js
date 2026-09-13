const pool = require('../src/config/database');

(async () => {
  const list = ['sesiones', 'intentos_login', 'auditoria_sistema', 'usuario_acceso'];
  const res = await pool.query(
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1) ORDER BY table_name, ordinal_position",
    [list]
  );
  for (const row of res.rows) {
    console.log(row.table_name + ' | ' + row.column_name + ' | ' + row.data_type);
  }
  await pool.end();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
