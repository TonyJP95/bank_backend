const pool = require('../src/config/database');

(async () => {
  const tables = ['empleados','direcciones_clientes','sesiones','intentos_login','auditoria_sistema','actividad_usuarios','notificaciones','alertas_seguridad','prestamos','pagos_prestamo','bloqueos_clientes','lineas_credito','tarjetas','beneficiarios','transacciones','transferencias','movimientos_cuenta','estados_cuenta'];
  const res = await pool.query(
    "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1) ORDER BY table_name, ordinal_position",
    [tables]
  );
  for (const row of res.rows) {
    console.log(row.table_name + ' | ' + row.column_name + ' | ' + row.data_type + ' | ' + row.is_nullable);
  }
  await pool.end();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
