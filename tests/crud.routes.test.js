const test = require('node:test');
const assert = require('node:assert/strict');

const { getInsertFields, buildResourceFilter } = require('../src/routes/crud.routes');
const { hashSessionToken } = require('../src/routes/auth.routes');

test('permite conservar campos de relación en inserciones de cuentas', () => {
  const fields = getInsertFields({
    id_cliente: '33e0a54b-225a-4ab7-9a3a-9a6db43ef769',
    id_tipo_cuenta: '5c2125ae-ab30-4189-aed2-b3e0e5d5e2f2',
    numero_cuenta: '000000000000009002',
    clabe_interbancaria: '012345678901239002',
    saldo: 20000,
    moneda: 'MXN'
  });

  assert.ok(fields.some(([field]) => field === 'id_cliente'));
  assert.ok(fields.some(([field]) => field === 'id_tipo_cuenta'));
  assert.deepEqual(fields.map(([field]) => field).slice(0, 3), ['id_cliente', 'id_tipo_cuenta', 'numero_cuenta']);
});

test('aplica filtro seguro por dueño para cuentas y movimientos', () => {
  const cuentasFilter = buildResourceFilter('cuentas', { user: { idCliente: 'client-1' }, query: {} });
  const movimientosFilter = buildResourceFilter('movimientos', { user: { idCliente: 'client-1' }, query: {} });

  assert.deepEqual(cuentasFilter, { where: 'WHERE id_cliente = $1', params: ['client-1'] });
  assert.deepEqual(movimientosFilter, {
    where: 'WHERE id_cuenta IN (SELECT id_cuenta FROM cuentas WHERE id_cliente = $1)',
    params: ['client-1']
  });
});

test('hash de sesión no excede la longitud de la columna y no expone el JWT', () => {
  const token = 'eyJhbGciOiJIUzI1NiJ9.' + 'a'.repeat(1200);
  const hash = hashSessionToken(token);

  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.match(hash, /^[a-f0-9]+$/);
});
