const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function uid() {
  return crypto.randomUUID();
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cuentaCorriente = await client.query(
      "SELECT id_tipo_cuenta FROM tipos_cuenta WHERE nombre = 'Cuenta Corriente' LIMIT 1"
    );
    const ahorro = await client.query(
      "SELECT id_tipo_cuenta FROM tipos_cuenta WHERE nombre = 'Cuenta de Ahorro' LIMIT 1"
    );
    const debitType = await client.query(
      "SELECT id_tipo_tarjeta FROM tipos_tarjeta WHERE nombre = 'Tarjeta de Débito' LIMIT 1"
    );
    const clientRole = await client.query(
      "SELECT id_rol FROM roles WHERE nombre = 'CLIENTE' LIMIT 1"
    );

    const currentType = cuentaCorriente.rows[0]?.id_tipo_cuenta;
    const ahorroType = ahorro.rows[0]?.id_tipo_cuenta;
    const cardType = debitType.rows[0]?.id_tipo_tarjeta;
    const roleId = clientRole.rows[0]?.id_rol;

    // 1) Create a sample employee for audit / approval references
    const employee = await client.query(
      `INSERT INTO empleados
       (id_empleado, numero_empleado, nombre, apellido_paterno, apellido_materno, email, telefono, puesto, departamento, estado, fecha_ingreso, fecha_baja, fecha_creacion, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE
       SET numero_empleado = EXCLUDED.numero_empleado,
           nombre = EXCLUDED.nombre,
           apellido_paterno = EXCLUDED.apellido_paterno,
           apellido_materno = EXCLUDED.apellido_materno,
           telefono = EXCLUDED.telefono,
           puesto = EXCLUDED.puesto,
           departamento = EXCLUDED.departamento,
           estado = EXCLUDED.estado,
           fecha_actualizacion = CURRENT_TIMESTAMP
       RETURNING id_empleado, email`,
      [uid(), 'EMP-1002', 'Sofia', 'Martinez', 'Lopez', 'sofia.martinez@bancotecmi.mx', '5559800101', 'Analista', 'Operaciones', 'ACTIVO']
    );

    // 2) Create a second demo customer and account
    const newCustomer = await client.query(
      `INSERT INTO clientes
       (id_cliente, nombre, apellido_paterno, apellido_materno, documento_identidad, email, telefono, fecha_nacimiento, curp, rfc, estado, nivel_riesgo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
       RETURNING id_cliente`,
      [uid(), 'Lucia', 'Gomez', 'Santos', 'DEMO-002', 'lucia.gomez@example.com', '5552223344', '1995-02-21', 'GOSL950221HDFRZLA2', 'GOSL950221A2', 'ACTIVO', 'MEDIO']
    );

    const customerId = newCustomer.rows[0].id_cliente;

    const passwordHash = await bcrypt.hash('UnaPasswordSegura123!', 12);
    const newUser = await client.query(
      `INSERT INTO usuario_acceso
       (id_usuario, id_cliente, username, password_hash, estado, intentos_fallidos, ultimo_login, fecha_creacion)
       VALUES ($1, $2, $3, $4, 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           id_cliente = EXCLUDED.id_cliente,
           estado = EXCLUDED.estado,
           ultimo_login = CURRENT_TIMESTAMP
       RETURNING id_usuario, username, id_cliente`,
      [uid(), customerId, 'lucia.demo', passwordHash]
    );

    await client.query(
      `INSERT INTO usuario_roles (id_usuario, id_rol)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [newUser.rows[0].id_usuario, roleId]
    );

    const newAccount = await client.query(
      `INSERT INTO cuentas
       (id_cuenta, id_cliente, id_tipo_cuenta, numero_cuenta, clabe_interbancaria, saldo, moneda, estado, fecha_apertura, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (numero_cuenta) DO UPDATE
       SET id_cliente = EXCLUDED.id_cliente,
           id_tipo_cuenta = EXCLUDED.id_tipo_cuenta,
           clabe_interbancaria = EXCLUDED.clabe_interbancaria,
           saldo = EXCLUDED.saldo,
           moneda = EXCLUDED.moneda,
           estado = EXCLUDED.estado,
           fecha_actualizacion = CURRENT_TIMESTAMP
       RETURNING id_cuenta, numero_cuenta`,
      [uid(), customerId, currentType, '000000000000000002', '012345678901234568', 9800.00, 'MXN', 'ACTIVA']
    );

    const newAhorro = await client.query(
      `INSERT INTO cuentas
       (id_cuenta, id_cliente, id_tipo_cuenta, numero_cuenta, clabe_interbancaria, saldo, moneda, estado, fecha_apertura, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (numero_cuenta) DO UPDATE
       SET id_cliente = EXCLUDED.id_cliente,
           id_tipo_cuenta = EXCLUDED.id_tipo_cuenta,
           clabe_interbancaria = EXCLUDED.clabe_interbancaria,
           saldo = EXCLUDED.saldo,
           moneda = EXCLUDED.moneda,
           estado = EXCLUDED.estado,
           fecha_actualizacion = CURRENT_TIMESTAMP
       RETURNING id_cuenta, numero_cuenta`,
      [uid(), customerId, ahorroType, '000000000000000003', '012345678901234569', 5500.00, 'MXN', 'ACTIVA']
    );

    // 3) Seed related records in several tables
    await client.query(
      `INSERT INTO direcciones_clientes
       (id_direccion, id_cliente, tipo, calle, numero_exterior, numero_interior, colonia, municipio, ciudad, estado, codigo_postal, pais, principal, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), customerId, 'DOMICILIO', 'Calle Reforma', '456', 'B', 'Roma Norte', 'Cuauhtemoc', 'Ciudad de México', 'CDMX', '06700', 'México', true]
    );

    await client.query(
      `INSERT INTO beneficiarios
       (id_beneficiario, id_cliente, nombre, alias, banco, clabe_destino, cuenta_destino, activo, fecha_registro)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), customerId, 'Jorge Gomez', 'Jorge', 'Santander', '044345678901234567', newAhorro.rows[0].numero_cuenta, true]
    );

    await client.query(
      `INSERT INTO tarjetas
       (id_tarjeta, id_cuenta, id_tipo_tarjeta, identificador_tarjeta_hash, ultimos_4, nombre_titular, fecha_emision, fecha_vencimiento, estado, limite_diario, fecha_bloqueo)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE + INTERVAL '4 years', $7, $8, NULL)
       ON CONFLICT DO NOTHING`,
      [uid(), newAccount.rows[0].id_cuenta, cardType, 'hash-card-demo-002', '3344', 'Lucia Gomez', 'ACTIVA', 5000]
    );

    await client.query(
      `INSERT INTO lineas_credito
       (id_linea_credito, id_cliente, id_tarjeta, limite_credito, saldo_utilizado, tasa_anual, pago_minimo, fecha_corte, dia_pago, estado, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), customerId, null, 12000, 500, 14.5, 800, 10, 23, 'ACTIVA']
    );

    await client.query(
      `INSERT INTO notificaciones
       (id_notificacion, id_usuario, tipo, titulo, mensaje, leida, fecha_lectura, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newUser.rows[0].id_usuario, 'SISTEMA', 'Bienvenida', 'Tu cuenta demo fue creada con éxito.', false]
    );

    await client.query(
      `INSERT INTO prestamos
       (id_prestamo, id_cliente, tipo_prestamo, monto_solicitado, monto_aprobado, tasa_interes, plazo_meses, saldo_pendiente, pago_mensual, estado, aprobado_por, motivo_rechazo, fecha_solicitud, fecha_aprobacion, fecha_liquidacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
       ON CONFLICT DO NOTHING`,
      [uid(), customerId, 'PERSONAL', 15000, 15000, 11.5, 12, 13500, 1250, 'APROBADO', employee.rows[0].id_empleado]
    );

    const loan = await client.query(
      `SELECT id_prestamo FROM prestamos WHERE id_cliente = $1 LIMIT 1`,
      [customerId]
    );
    if (loan.rowCount > 0) {
      await client.query(
        `INSERT INTO pagos_prestamo
         (id_pago, id_prestamo, numero_pago, monto_total, capital, intereses, recargos, fecha_vencimiento, fecha_pago, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + INTERVAL '1 month', CURRENT_TIMESTAMP, 'PAGADO')
         ON CONFLICT DO NOTHING`,
        [uid(), loan.rows[0].id_prestamo, 1, 1250, 1100, 100, 50]
      );
    }

    await client.query(
      `INSERT INTO alertas_seguridad
       (id_alerta, id_cliente, id_cuenta, id_transaccion, id_actividad, tipo_alerta, nivel_riesgo, descripcion, puntaje_riesgo, estado, creada_automaticamente, creada_por, revisada_por, comentarios_revision, fecha_creacion, fecha_revision)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5, $6, $7, $8, true, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), customerId, newAccount.rows[0].id_cuenta, 'INICIO_SESION', 'MEDIO', 'Nuev ubic. login', 40, 'ABIERTA']
    );

    await client.query(
      `INSERT INTO actividad_usuarios
       (id_actividad, id_usuario, id_empleado, id_dispositivo, tipo_actividad, endpoint, metodo_http, ip_origen, latitud, longitud, precision_metros, ciudad, estado_region, pais, sistema_operativo, navegador, software, version_software, tipo_origen, exitoso, metadata, fecha_hora)
       VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newUser.rows[0].id_usuario, 'LOGIN', '/api/v1/auth/login', 'POST', '127.0.0.1', 19.43, -99.13, 10, 'Ciudad de México', 'CDMX', 'México', 'Windows 11', 'Chrome', 'BankTecMi', '1.0.0', 'API', true, '{"source":"demo"}']
    );

    await client.query(
      `INSERT INTO sesiones
       (id_sesion, id_usuario, id_dispositivo, token_hash, ip_origen, fecha_inicio, fecha_expiracion, revocada, fecha_revocacion)
       VALUES ($1, $2, NULL, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour', false, NULL)
       ON CONFLICT DO NOTHING`,
      [uid(), newUser.rows[0].id_usuario, 'hash-demo-session-2', '127.0.0.1']
    );

    await client.query(
      `INSERT INTO intentos_login
       (id_intento, id_usuario, username_ingresado, ip_origen, id_dispositivo, latitud, longitud, exitoso, motivo, fecha_hora)
       VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newUser.rows[0].id_usuario, 'lucia.demo', '127.0.0.1', 19.43, -99.13, false, 'Intento demo']
    );

    await client.query(
      `INSERT INTO auditoria_sistema
       (id_auditoria, id_usuario, id_empleado, accion, modulo, tabla_afectada, registro_id, ip_origen, latitud, longitud, tipo_origen, datos_anteriores, datos_nuevos, metadata, resultado, fecha_hora)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, NULL, NULL, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newUser.rows[0].id_usuario, 'LOGIN', 'AUTH', 'usuario_acceso', newUser.rows[0].id_usuario, '127.0.0.1', 'LOGIN', '{"username":"lucia.demo"}', '{"username":"lucia.demo"}', '{"source":"demo"}', 'OK']
    );

    await client.query(
      `INSERT INTO transacciones
       (id_transaccion, id_cuenta_origen, id_cuenta_destino, id_usuario, id_beneficiario, id_tarjeta, monto, comision, moneda, tipo_transaccion, canal, estado, referencia_operacion, descripcion, fecha_hora, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newAccount.rows[0].id_cuenta, newAhorro.rows[0].id_cuenta, newUser.rows[0].id_usuario, 250, 0, 'MXN', 'TRANSFERENCIA', 'WEB', 'COMPLETADA', 'TX-DEMO-002', 'Transferencia de ejemplo']
    );

    const txDemo = await client.query(
      `INSERT INTO transacciones
       (id_transaccion, id_cuenta_origen, id_cuenta_destino, id_usuario, id_beneficiario, id_tarjeta, monto, comision, moneda, tipo_transaccion, canal, estado, referencia_operacion, descripcion, fecha_hora, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING
       RETURNING id_transaccion`,
      [uid(), newAccount.rows[0].id_cuenta, newAhorro.rows[0].id_cuenta, newUser.rows[0].id_usuario, 250, 0, 'MXN', 'TRANSFERENCIA', 'WEB', 'COMPLETADA', 'TX-DEMO-003', 'Transferencia de ejemplo 2']
    );

    await client.query(
      `INSERT INTO transferencias
       (id_transferencia, id_transaccion, clabe_origen, clabe_destino, concepto, referencia_numerica, fecha_ejecucion, fecha_confirmacion)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), txDemo.rows[0].id_transaccion, '012345678901234568', '012345678901234569', 'Transferencia demo 2', 'REF-1002']
    );

    await client.query(
      `INSERT INTO movimientos_cuenta
       (id_movimiento, id_cuenta, id_transaccion, tipo_movimiento, monto, saldo_anterior, saldo_posterior, concepto, fecha_hora)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newAccount.rows[0].id_cuenta, txDemo.rows[0].id_transaccion, 'ABONO', 250, 9800, 10050, 'Apertura demo extra']
    );

    await client.query(
      `INSERT INTO estados_cuenta
       (id_estado_cuenta, id_cuenta, periodo_inicio, periodo_fin, saldo_inicial, saldo_final, total_abonos, total_cargos, fecha_generacion)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [uid(), newAccount.rows[0].id_cuenta, 9800, 10050, 250, 0]
    );

    await client.query('COMMIT');
    console.log('SEED_MORE_OK');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
