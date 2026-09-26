const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../config/database');
const env = require('../config/env');

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

async function recordAudit(ip, user, action, moduleName, tableName, recordId, result) {
  try {
    await pool.query(
      `INSERT INTO auditoria_sistema
        (id_usuario, accion, modulo, tabla_afectada, registro_id, ip_origen, tipo_origen, resultado, fecha_hora)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [user?.id_usuario || null, action, moduleName, tableName, recordId || user?.id_usuario || null, ip, 'LOGIN', result]
    );
  } catch (error) {
    console.warn('No se pudo guardar auditoria_sistema:', error.message);
  }
}

const registerSchema = z.object({
  usuario: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(128),
  nombre: z.string().trim().min(1).max(80),
  apellidoPaterno: z.string().trim().min(1).max(80),
  apellidoMaterno: z.string().trim().max(80).optional(),
  documentoIdentidad: z.string().trim().min(1).max(30),
  email: z.string().email().max(150)
});

const loginSchema = z.object({
  usuario: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128)
});

function issueToken(user) {
  return jwt.sign(
    { sub: user.id_usuario, username: user.username, idCliente: user.id_cliente },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function sendValidationError(res, error) {
  return res.status(400).json({
    error: 'Datos invalidos',
    details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
  });
}

router.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  const client = await pool.connect();
  try {
    const data = parsed.data;
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id_usuario FROM usuario_acceso WHERE username = $1',
      [data.usuario]
    );
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const clientResult = await client.query(
      `INSERT INTO clientes
        (nombre, apellido_paterno, apellido_materno, documento_identidad, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_cliente, nombre, apellido_paterno, apellido_materno, email`,
      [data.nombre, data.apellidoPaterno, data.apellidoMaterno || null, data.documentoIdentidad, data.email]
    );
    const customer = clientResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO usuario_acceso (id_cliente, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id_usuario, username, id_cliente`,
      [customer.id_cliente, data.usuario, passwordHash]
    );

    await client.query(
      `INSERT INTO usuario_roles (id_usuario, id_rol)
       SELECT $1, id_rol FROM roles WHERE nombre = 'CLIENTE'
       ON CONFLICT DO NOTHING`,
      [userResult.rows[0].id_usuario]
    );
    await client.query('COMMIT');

    return res.status(201).json({ usuario: { ...userResult.rows[0], cliente: customer } });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error);

    const ip = getClientIp(req);
    const result = await pool.query(
      `SELECT id_usuario, username, password_hash, estado, id_cliente
       FROM usuario_acceso WHERE username = $1`,
      [parsed.data.usuario]
    );
    const user = result.rows[0];
    const validPassword = user && await bcrypt.compare(parsed.data.password, user.password_hash);

    if (!user || !validPassword) {
      try {
        await pool.query(
          `INSERT INTO intentos_login
            (id_usuario, username_ingresado, ip_origen, exitoso, motivo, fecha_hora)
           VALUES ($1, $2, $3, false, $4, CURRENT_TIMESTAMP)`,
          [user?.id_usuario || null, parsed.data.usuario, ip, 'Credenciales invalidas']
        );
      } catch (error) {
        console.warn('No se pudo registrar intento_login:', error.message);
      }

      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    if (user.estado !== 'ACTIVO') {
      await pool.query(
        `INSERT INTO intentos_login
          (id_usuario, username_ingresado, ip_origen, exitoso, motivo, fecha_hora)
         VALUES ($1, $2, $3, false, $4, CURRENT_TIMESTAMP)`,
        [user.id_usuario, user.username, ip, 'Usuario no disponible']
      );
      return res.status(403).json({ error: 'Usuario no disponible' });
    }

    await pool.query(
      `UPDATE usuario_acceso
       SET ultimo_login = CURRENT_TIMESTAMP, intentos_fallidos = 0
       WHERE id_usuario = $1`,
      [user.id_usuario]
    );

    const token = issueToken(user);

    await pool.query(
      `INSERT INTO sesiones
        (id_usuario, id_dispositivo, token_hash, ip_origen, fecha_inicio, fecha_expiracion, revocada, fecha_revocacion)
       VALUES ($1, NULL, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour', false, NULL)`,
      [user.id_usuario, token, ip]
    );

    await recordAudit(ip, user, 'LOGIN', 'AUTH', 'usuario_acceso', user.id_usuario, 'OK');

    return res.json({
      token,
      usuario: { id: user.id_usuario, username: user.username, idCliente: user.id_cliente }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
