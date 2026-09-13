# BancoTecMi Backend

API REST de BancoTecMi preparada para publicar en Render y para consumir desde la web, la app móvil o el software de escritorio del proyecto.

La capa pública expone un conjunto de rutas REST sobre PostgreSQL usando Express y `pg`. Todas las rutas protegidas de lectura y escritura esperan un `Authorization: Bearer <TOKEN_JWT>` válido.

## URL pública

```text
https://bank-backend-flh4.onrender.com
```

## Base de la API

```text
https://bank-backend-flh4.onrender.com/api/v1
```

## Health check

```http
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

## Arquitectura

```text
Cliente web / app / escritorio
        |
        | HTTPS + JSON + JWT
        v
Render: BancoTecMi Backend
        |
        | Express + pg
        v
PostgreSQL (Supabase)
```

La idea es que los clientes no vean ni sepan el usuario y contraseña de PostgreSQL. En la capa de acceso solo se usa la URL pública del backend, el JSON y el JWT.

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

Respuesta:

```json
{
  "usuario": {
    "id_usuario": "uuid",
    "username": "ana.demo",
    "id_cliente": "uuid",
    "cliente": {
      "id_cliente": "uuid",
      "nombre": "Ana",
      "apellido_paterno": "Lopez",
      "apellido_materno": "Martinez",
      "email": "ana@example.com"
    }
  }
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

Respuesta esperada:

```json
{
  "token": "<TOKEN_JWT>",
  "usuario": {
    "id": "uuid",
    "username": "ana.demo",
    "idCliente": "uuid"
  }
}
```

El `token` se usa en el header:

```http
Authorization: Bearer <TOKEN_JWT>
```

### Ejemplo con curl

```bash
curl -X POST https://bank-backend-flh4.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"ana.demo","password":"UnaPasswordSegura123!"}'
```

### Ejemplo de consumo con token

```bash
curl https://bank-backend-flh4.onrender.com/api/v1/cuentas \
  -H "Authorization: Bearer <TOKEN_JWT>"
```

## CRUD general

El backend expone un router genérico con el patrón:

```text
GET    /api/v1/:recurso
GET    /api/v1/:recurso/:id
POST   /api/v1/:recurso
PUT    /api/v1/:recurso/:id
PATCH  /api/v1/:recurso/:id
DELETE /api/v1/:recurso/:id
```

Todas las rutas de `GET`, `POST`, `PUT`, `PATCH` y `DELETE` deben enviar el `Bearer` token válido del login.

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

Los recursos `usuario_acceso`, `usuario_roles` y `rol_permisos` se mantienen privados para evitar fuga de contraseñas y de privilegios de seguridad.

## Transferencias

La operación de transferencia usa la función transaccional de PostgreSQL llamada `fn_realizar_transferencia` y valida saldo, cuenta origen, cuenta destino y bloqueo de filas antes de generar el movimiento.

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

## Observaciones de seguridad

- Nunca publiques `.env` ni secretos de PostgreSQL.
- Nunca compartas tokens JWT en repositorios públicos.
- Los clientes usan solo la URL pública del backend y el header `Authorization`.
- El backend usa `helmet`, `cors`, `express-rate-limit` y `zod` para reforzar la API.

## Configuración local

```bash
npm install
npm run dev
```

El servidor local queda disponible en:

```text
http://localhost:4000
```

Para levantar el proyecto local y apuntar a tu base local, crea un `.env` a partir de `.env.example` y rellena:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
DB_SSL
JWT_SECRET
FRONTEND_ORIGINS
```

## Tecnologías

- Node.js
- Express 5
- PostgreSQL
- Supabase PostgreSQL
- `pg`
- `bcryptjs`
- `jsonwebtoken`
- `zod`
- `helmet`
- `cors`
- `express-rate-limit`
- Render
