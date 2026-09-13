const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cliente = await client.query(
      `INSERT INTO clientes (nombre, apellido_paterno, apellido_materno, documento_identidad, email, telefono, fecha_nacimiento, curp, rfc, estado, nivel_riesgo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (documento_identidad) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           apellido_paterno = EXCLUDED.apellido_paterno,
           apellido_materno = EXCLUDED.apellido_materno,
           email = EXCLUDED.email,
           telefono = EXCLUDED.telefono,
           fecha_nacimiento = EXCLUDED.fecha_nacimiento,
           curp = EXCLUDED.curp,
           rfc = EXCLUDED.rfc,
           estado = EXCLUDED.estado,
           nivel_riesgo = EXCLUDED.nivel_riesgo
       RETURNING id_cliente, nombre, apellido_paterno, email`
      , ['Ana', 'Lopez', 'Martinez', 'DEMO-001', 'ana.demo@example.com', '5551112233', '1998-05-14', 'LOPA980514HDFRZNA1', 'LOPA980514A1', 'ACTIVO', 'BAJO']
    );

    const customer = cliente.rows[0];

    const hash = await bcrypt.hash('UnaPasswordSegura123!', 12);
    const user = await client.query(
      `INSERT INTO usuario_acceso (id_cliente, username, password_hash, estado)
       VALUES ($1, $2, $3, 'ACTIVO')
       ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           id_cliente = EXCLUDED.id_cliente,
           estado = EXCLUDED.estado
       RETURNING id_usuario, username, id_cliente`
      , [customer.id_cliente, 'ana.demo', hash]
    );

    await client.query(
      `INSERT INTO usuario_roles (id_usuario, id_rol)
       SELECT $1, id_rol FROM roles WHERE nombre = 'CLIENTE'
       ON CONFLICT DO NOTHING`,
      [user.rows[0].id_usuario]
    );

    const type = await client.query(
      `SELECT id_tipo_cuenta FROM tipos_cuenta WHERE nombre = 'Cuenta Corriente' LIMIT 1`
    );

    if (type.rowCount > 0) {
      await client.query(
        `INSERT INTO cuentas (id_cliente, id_tipo_cuenta, numero_cuenta, clabe_interbancaria, saldo, moneda, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (numero_cuenta) DO UPDATE
         SET id_cliente = EXCLUDED.id_cliente,
             id_tipo_cuenta = EXCLUDED.id_tipo_cuenta,
             clabe_interbancaria = EXCLUDED.clabe_interbancaria,
             saldo = EXCLUDED.saldo,
             moneda = EXCLUDED.moneda,
             estado = EXCLUDED.estado`
        , [customer.id_cliente, type.rows[0].id_tipo_cuenta, '000000000000000001', '012345678901234567', 15000.00, 'MXN', 'ACTIVA']
      );
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ cliente: customer, usuario: user.rows[0] }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
