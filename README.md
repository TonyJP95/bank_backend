# BancoTecMi Backend

API REST compartida por la aplicación web, la aplicación móvil y el software de escritorio de BancoTecMi.

Los clientes se conectan únicamente mediante HTTPS al backend. Ningún cliente debe conectarse directamente a PostgreSQL ni conocer las credenciales de la base de datos.

## URL pública

```text
https://bank-backend-flh4.onrender.com
```

Health check:

```text
GET https://bank-backend-flh4.onrender.com/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "bancotecmi-backend",
  "database": "postgresql"
}
```

Base de la API:

```text
https://bank-backend-flh4.onrender.com/api/v1
```

## Arquitectura de conexión

```text
Web / App / Software
        |
        | HTTPS + JSON + JWT
        v
Backend BancoTecMi en Render
        |
        | PostgreSQL privado
        v
Supabase PostgreSQL
```

Las aplicaciones consumidoras solo necesitan la URL pública del backend. No deben incluir `DB_HOST`, `DB_PASSWORD`, `DB_USER` ni ninguna credencial de PostgreSQL.

## Autenticación

### Registrar usuario

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "usuario": "ana.demo",
  "password": "UnaPasswordSegura123!",
  "nombre": "Ana",
  "apellidoPaterno": "Lopez",
  "apellidoMaterno": "Martinez",
  "documentoIdentidad": "DEMO-001",
  "email": "ana@example.com"
}
```

### Iniciar sesión

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "usuario": "ana.demo",
  "password": "UnaPasswordSegura123!"
}
```

La respuesta contiene un token JWT. Todas las rutas protegidas deben enviar ese token:

```http
Authorization: Bearer <TOKEN_JWT>
```

Ejemplo con `curl`:

```bash
curl -X POST https://bank-backend-flh4.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"ana.demo","password":"UnaPasswordSegura123!"}'
```

## Operaciones CRUD

Todas las operaciones CRUD requieren autenticación.

```text
GET    /api/v1/:recurso
GET    /api/v1/:recurso/:id
POST   /api/v1/:recurso
PUT    /api/v1/:recurso/:id
PATCH  /api/v1/:recurso/:id
DELETE /api/v1/:recurso/:id
```

Ejemplo para consultar cuentas:

```bash
curl https://bank-backend-flh4.onrender.com/api/v1/cuentas \
  -H "Authorization: Bearer <TOKEN_JWT>"
```

Ejemplo para consultar una cuenta específica:

```bash
curl https://bank-backend-flh4.onrender.com/api/v1/cuentas/<ID_CUENTA> \
  -H "Authorization: Bearer <TOKEN_JWT>"
```

Ejemplo para crear un beneficiario:

```bash
curl -X POST https://bank-backend-flh4.onrender.com/api/v1/beneficiarios \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "id_cliente": "<ID_CLIENTE>",
    "nombre": "Beneficiario Demo",
    "alias": "Demo",
    "banco": "Banco Escolar",
    "clabe_destino": "646180000000000002"
  }'
```

Ejemplo para actualizar un registro:

```bash
curl -X PATCH https://bank-backend-flh4.onrender.com/api/v1/beneficiarios/<ID_BENEFICIARIO> \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"alias":"Beneficiario principal"}'
```

Ejemplo para eliminar un registro:

```bash
curl -X DELETE https://bank-backend-flh4.onrender.com/api/v1/beneficiarios/<ID_BENEFICIARIO> \
  -H "Authorization: Bearer <TOKEN_JWT>"
```

### Recursos disponibles

```text
roles
permisos
clientes
direcciones
empleados
dispositivos
sesiones
actividades
intentos-login
tipos-cuenta
cuentas
beneficiarios
tipos-tarjeta
tarjetas
lineas-credito
transacciones
transferencias
movimientos
prestamos
pagos-prestamo
bloqueos
alertas
auditoria
estados-cuenta
notificaciones
```

Las tablas `usuario_acceso`, `usuario_roles` y `rol_permisos` no se exponen mediante el CRUD genérico para proteger contraseñas y relaciones de seguridad.

## Transferencias

Las transferencias usan la función transaccional `fn_realizar_transferencia` definida en el esquema PostgreSQL. La operación valida cuentas, saldo y bloqueo de filas antes de crear los movimientos.

```http
POST /api/v1/transferencias
Authorization: Bearer <TOKEN_JWT>
Content-Type: application/json
```

```json
{
  "idCuentaOrigen": "<ID_CUENTA_ORIGEN>",
  "idCuentaDestino": "<ID_CUENTA_DESTINO>",
  "monto": 1000,
  "concepto": "Pago escolar",
  "referencia": "PAGO-001"
}
```

## Configuración local

1. Copia `.env.example` como `.env`.
2. Completa las variables de PostgreSQL y `JWT_SECRET`.
3. Instala dependencias y arranca el backend:

```bash
npm install
npm run dev
```

El servidor local queda disponible en `http://localhost:4000`.

Nunca subas `.env`, contraseñas, tokens ni claves de PostgreSQL al repositorio. En Render, estas variables se configuran desde **Environment Variables**.

## Tecnologías

- Node.js
- Express
- PostgreSQL
- Supabase PostgreSQL
- `pg`
- bcrypt
- JWT
- Zod
- Helmet
- CORS
- Render
