const { Router } = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

const resources = {
  roles: ['roles', 'id_rol'],
  permisos: ['permisos', 'id_permiso'],
  clientes: ['clientes', 'id_cliente'],
  direcciones: ['direcciones_clientes', 'id_direccion'],
  empleados: ['empleados', 'id_empleado'],
  dispositivos: ['dispositivos', 'id_dispositivo'],
  sesiones: ['sesiones', 'id_sesion'],
  actividades: ['actividad_usuarios', 'id_actividad'],
  'intentos-login': ['intentos_login', 'id_intento'],
  'tipos-cuenta': ['tipos_cuenta', 'id_tipo_cuenta'],
  cuentas: ['cuentas', 'id_cuenta'],
  beneficiarios: ['beneficiarios', 'id_beneficiario'],
  'tipos-tarjeta': ['tipos_tarjeta', 'id_tipo_tarjeta'],
  tarjetas: ['tarjetas', 'id_tarjeta'],
  'lineas-credito': ['lineas_credito', 'id_linea_credito'],
  transacciones: ['transacciones', 'id_transaccion'],
  transferencias: ['transferencias', 'id_transferencia'],
  movimientos: ['movimientos_cuenta', 'id_movimiento'],
  prestamos: ['prestamos', 'id_prestamo'],
  'pagos-prestamo': ['pagos_prestamo', 'id_pago'],
  bloqueos: ['bloqueos_clientes', 'id_bloqueo'],
  alertas: ['alertas_seguridad', 'id_alerta'],
  auditoria: ['auditoria_sistema', 'id_auditoria'],
  'estados-cuenta': ['estados_cuenta', 'id_estado_cuenta'],
  notificaciones: ['notificaciones', 'id_notificacion']
};

const ignoredFields = new Set([
  'id_rol', 'id_permiso', 'id_cliente', 'id_direccion', 'id_empleado', 'id_dispositivo',
  'id_sesion', 'id_actividad', 'id_intento', 'id_tipo_cuenta', 'id_cuenta', 'id_beneficiario',
  'id_tipo_tarjeta', 'id_tarjeta', 'id_linea_credito', 'id_transaccion', 'id_transferencia',
  'id_movimiento', 'id_prestamo', 'id_pago', 'id_bloqueo', 'id_alerta', 'id_auditoria',
  'id_estado_cuenta', 'id_notificacion', 'password_hash', 'fecha_creacion', 'fecha_actualizacion',
  'fecha_registro', 'fecha_hora', 'fecha_apertura', 'fecha_solicitud'
]);

const insertIgnoredFields = new Set([
  'password_hash', 'fecha_creacion', 'fecha_actualizacion', 'fecha_registro', 'fecha_hora',
  'fecha_apertura', 'fecha_solicitud'
]);

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Identificador SQL no permitido');
  return `"${value}"`;
}

function getResource(req, res) {
  const resource = resources[req.params.resource];
  if (!resource) {
    res.status(404).json({ error: 'Recurso no encontrado' });
    return null;
  }
  return resource;
}

function buildScope(resourceName, user, startIndex = 1) {
  if (!resourceName || !user || !user.idCliente) {
    return { sql: '', params: [], nextIndex: startIndex };
  }

  switch (resourceName) {
    case 'cuentas':
      return {
        sql: `id_cliente = $${startIndex}`,
        params: [user.idCliente],
        nextIndex: startIndex + 1
      };
    case 'movimientos':
      return {
        sql: `id_cuenta IN (SELECT id_cuenta FROM cuentas WHERE id_cliente = $${startIndex})`,
        params: [user.idCliente],
        nextIndex: startIndex + 1
      };
    case 'transacciones':
      return {
        sql: `(id_cuenta_origen IN (SELECT id_cuenta FROM cuentas WHERE id_cliente = $${startIndex}) OR id_cuenta_destino IN (SELECT id_cuenta FROM cuentas WHERE id_cliente = $${startIndex}))`,
        params: [user.idCliente],
        nextIndex: startIndex + 1
      };
    default:
      return { sql: '', params: [], nextIndex: startIndex };
  }
}

function buildResourceFilter(resourceName, { user } = {}) {
  const scope = buildScope(resourceName, user, 1);
  return {
    where: scope.sql ? `WHERE ${scope.sql}` : '',
    params: scope.params
  };
}

function getFields(body, { allowIdentifiers = false } = {}) {
  const skipSet = allowIdentifiers ? insertIgnoredFields : ignoredFields;
  return Object.entries(body || {})
    .filter(([field, value]) => !skipSet.has(field) && /^[a-z_][a-z0-9_]*$/.test(field) && value !== undefined)
    .map(([field, value]) => [field, value]);
}

function getInsertFields(body) {
  return getFields(body, { allowIdentifiers: true });
}

router.use(authenticate);

router.get('/:resource', async (req, res, next) => {
  try {
    const resource = getResource(req, res);
    if (!resource) return;
    const [table] = resource;
    const requestedClientId = req.query.id_cliente ?? req.query.idCliente ?? null;
    if (requestedClientId && requestedClientId !== req.user.idCliente) {
      return res.status(403).json({ error: 'No autorizado para consultar registros de otro cliente' });
    }

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const scope = buildScope(req.params.resource, req.user, 1);
    const whereClause = scope.sql ? `WHERE ${scope.sql}` : '';
    const values = [...scope.params, limit, offset];

    const result = await pool.query(
      `SELECT * FROM ${quoteIdentifier(table)} ${whereClause} LIMIT $${scope.nextIndex} OFFSET $${scope.nextIndex + 1}`,
      values
    );
    return res.json({ data: result.rows, limit, offset });
  } catch (error) {
    return next(error);
  }
});

router.get('/:resource/:id', async (req, res, next) => {
  try {
    const resource = getResource(req, res);
    if (!resource) return;
    const [table, primaryKey] = resource;
    const scope = buildScope(req.params.resource, req.user, 2);
    const whereClause = scope.sql ? `AND ${scope.sql}` : '';
    const result = await pool.query(
      `SELECT * FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(primaryKey)} = $1${whereClause}`,
      [req.params.id, ...scope.params]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.post('/:resource', async (req, res, next) => {
  try {
    const resource = getResource(req, res);
    if (!resource) return;
    const [table] = resource;
    const fields = getFields(req.body, { allowIdentifiers: true });
    if (fields.length === 0) return res.status(400).json({ error: 'El cuerpo no contiene campos validos' });
    const columns = fields.map(([field]) => quoteIdentifier(field));
    const values = fields.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const result = await pool.query(
      `INSERT INTO ${quoteIdentifier(table)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

async function updateResource(req, res, next) {
  try {
    const resource = getResource(req, res);
    if (!resource) return;
    const [table, primaryKey] = resource;
    const fields = getFields(req.body);
    if (fields.length === 0) return res.status(400).json({ error: 'El cuerpo no contiene campos actualizables' });
    const values = fields.map(([, value]) => value);
    const assignments = fields.map(([field], index) => `${quoteIdentifier(field)} = $${index + 1}`);
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE ${quoteIdentifier(table)} SET ${assignments.join(', ')} WHERE ${quoteIdentifier(primaryKey)} = $${values.length} RETURNING *`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

router.patch('/:resource/:id', updateResource);
router.put('/:resource/:id', updateResource);

router.delete('/:resource/:id', async (req, res, next) => {
  try {
    const resource = getResource(req, res);
    if (!resource) return;
    const [table, primaryKey] = resource;
    const result = await pool.query(
      `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(primaryKey)} = $1 RETURNING ${quoteIdentifier(primaryKey)}`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.router = router;
module.exports.resources = resources;
module.exports.quoteIdentifier = quoteIdentifier;
module.exports.buildScope = buildScope;
module.exports.buildResourceFilter = buildResourceFilter;
module.exports.getFields = getFields;
module.exports.getInsertFields = getInsertFields;
