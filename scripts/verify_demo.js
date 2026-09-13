const pool = require('../src/config/database');

async function main() {
  const res1 = await pool.query("SELECT COUNT(*) AS n FROM clientes WHERE documento_identidad = $1", ['DEMO-001']);
  const res2 = await pool.query("SELECT COUNT(*) AS n FROM usuario_acceso WHERE username = $1", ['ana.demo']);
  const res3 = await pool.query("SELECT COUNT(*) AS n FROM cuentas WHERE numero_cuenta = $1", ['000000000000000001']);

  console.log('DB_COUNTS', JSON.stringify({
    clientes: Number(res1.rows[0].n),
    usuarios: Number(res2.rows[0].n),
    cuentas: Number(res3.rows[0].n)
  }, null, 2));

  const login = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'ana.demo', password: 'UnaPasswordSegura123!' })
  });

  const auth = await login.json();
  console.log('LOGIN_STATUS', login.status);
  console.log('TOKEN_PRESENT', Boolean(auth.token));

  const resource = await fetch('http://localhost:4000/api/v1/cuentas', {
    headers: { Authorization: 'Bearer ' + auth.token }
  });

  const text = await resource.text();
  console.log('RESOURCE_STATUS', resource.status);
  console.log('RESOURCE_PAYLOAD', text);

  await pool.end();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
