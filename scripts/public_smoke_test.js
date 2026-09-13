const base = 'https://bank-backend-flh4.onrender.com/api/v1';
const suffix = String(Date.now()).slice(-6);
const payload = {
  usuario: `pruebanuevo${suffix}`,
  password: 'Password123!',
  nombre: 'Prueba',
  apellidoPaterno: 'Nuevo',
  apellidoMaterno: 'Usuario',
  documentoIdentidad: `ID${suffix}`,
  email: `pruebanuevo${suffix}@example.com`
};

(async () => {
  try {
    const reg = await fetch(base + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const regText = await reg.text();
    console.log('REGISTER_STATUS', reg.status);
    console.log('REGISTER_BODY', regText);

    const login = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: payload.usuario, password: payload.password })
    });
    const loginText = await login.text();
    console.log('LOGIN_STATUS', login.status);
    console.log('LOGIN_BODY', loginText);

    if (!login.ok) {
      process.exitCode = 1;
      return;
    }

    const loginJson = JSON.parse(loginText);
    const resources = await fetch(base + '/cuentas', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + loginJson.token }
    });
    const resourceText = await resources.text();
    console.log('RESOURCE_STATUS', resources.status);
    console.log('RESOURCE_BODY', resourceText.slice(0, 500));
    process.exitCode = resources.ok ? 0 : 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
})();
