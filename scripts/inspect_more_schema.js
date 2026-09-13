const pool = require('../src/config/database');
(async () => {
  const tables = [
    'beneficiarios', 'tarjetas', 'lineas_credito', 'notificaciones',
    'prestamos', 'pagos_prestamo', 'alertas_seguridad', 'actividad_usuarios',
    'sesiones', 'intentos_login', 'auditoria_sistema', 'transacciones', 'transferencias',
    'movimientos_cuenta', 'estados_cuenta'
  ];
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position
  `, [tables]);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
