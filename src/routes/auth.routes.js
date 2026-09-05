const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../config/database');
const env = require('../config/env');

const router = Router();

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
    { sub: user.id_usuario, username: user.username },
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

    const result = await pool.query(
      `SELECT id_usuario, username, password_hash, estado, id_cliente
       FROM usuario_acceso WHERE username = $1`,
      [parsed.data.usuario]
    );
    const user = result.rows[0];
    const validPassword = user && await bcrypt.compare(parsed.data.password, user.password_hash);

    if (!user || !validPassword) return res.status(401).json({ error: 'Credenciales invalidas' });
    if (user.estado !== 'ACTIVO') return res.status(403).json({ error: 'Usuario no disponible' });

    await pool.query(
      `UPDATE usuario_acceso
       SET ultimo_login = CURRENT_TIMESTAMP, intentos_fallidos = 0
       WHERE id_usuario = $1`,
      [user.id_usuario]
    );

    return res.json({
      token: issueToken(user),
      usuario: { id: user.id_usuario, username: user.username, idCliente: user.id_cliente }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
