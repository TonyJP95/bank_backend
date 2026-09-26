# BancoTecMi Backend

API REST de BancoTecMi para web, app móvil y escritorio. El backend expone accesos protegidos sobre PostgreSQL y usa JWT, validación de entrada y filtros por cliente para evitar fuga de datos sensibles.

## Estado actual

Se corrigieron los bloqueos principales reportados por QA y app:

- Los endpoints `POST` de creación ya conservan campos clave como `id_cliente` e `id_tipo_cuenta` para evitar 500 por inserción con columnas relacionadas.
- Los `GET` de cuentas, movimientos y transacciones filtrarán por el cliente autenticado para no exponer saldos ni movimientos ajenos.
- El JWT ya incluye `idCliente`, lo que permite aplicar permisos por propietario real del registro.
- Se añadieron pruebas de regresión para cubrir los casos de seguridad y de creación.

## Stack

- Node.js
- Express 5
- PostgreSQL / Supabase
- `pg`
- `bcryptjs`
- `jsonwebtoken`
- `zod`
- `helmet`
- `cors`
- `express-rate-limit`

## Requisitos

- Node.js 18+
- PostgreSQL con el esquema de BancoTecMi
- Archivo `.env` con variables reales del entorno

## Variables de entorno

Se requiere un `.env` con valores reales del entorno. Ejemplo:

```env
PORT=4000
DB_HOST=db.xxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=tu_password_real
DB_SSL=true
JWT_SECRET=clave_muy_larga_y_segura
FRONTEND_ORIGINS=http://localhost:3000,http://localhost:5173
```

> Importante: el archivo `.env` no se debe subir a Git ni compartir en repositorios públicos.

## Instalación

```bash
npm install
npm run dev
```

## Health check

```http
GET /health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "bancotecmi-backend",
  "database": "postgresql"
}
```

## Autenticación

### Registro

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

### Login

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

Respuesta:

```json
{
  "token": "<JWT>",
  "usuario": {
    "id": "uuid",
    "username": "ana.demo",
    "idCliente": "uuid"
  }
}
```

Usar el token en:

```http
Authorization: Bearer <JWT>
```

## CRUD y recursos

El backend expone rutas genéricas protegidas bajo `/api/v1`:

```text
GET    /api/v1/:recurso
GET    /api/v1/:recurso/:id
POST   /api/v1/:recurso
PUT    /api/v1/:recurso/:id
PATCH  /api/v1/:recurso/:id
DELETE /api/v1/:recurso/:id
```

Recursos disponibles:

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

## Seguridad aplicada

### Filtrado por dueño

Los endpoints de lectura ahora aplican restricciones según el cliente autenticado. Por ejemplo:

- `GET /api/v1/cuentas` solo devuelve cuentas del usuario autenticado.
- `GET /api/v1/movimientos` solo devuelve movimientos de sus cuentas.
- `GET /api/v1/transacciones` solo devuelve transacciones vinculadas a sus cuentas.

Esto evita que un cliente autenticado consulte saldo o movimientos ajenos.

### Validación de entrada

Se usa `zod` para validar payloads y rechazar datos inválidos antes de ejecutar SQL.

### JWT con identidad del cliente

La firma del JWT trae `idCliente`, para que el backend pueda aplicar filtros seguros sin depender de parámetros enviados por el cliente.

## Ejemplo de creación de cuenta

```http
POST /api/v1/cuentas
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "id_cliente": "33e0a54b-225a-4ab7-9a3a-9a6db43ef769",
  "id_tipo_cuenta": "5c2125ae-ab30-4189-aed2-b3e0e5d5e2f2",
  "numero_cuenta": "000000000000009002",
  "clabe_interbancaria": "012345678901239002",
  "saldo": 20000,
  "moneda": "MXN"
}
```

## Transferencias

```http
POST /api/v1/transferencias
Authorization: Bearer <JWT>
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

La operación se procesa con la lógica transaccional del backend y valida saldo, cuenta origen, cuenta destino y bloqueo de filas.

## Validación y pruebas

Se cuentan con pruebas de regresión para los casos críticos:

```bash
node --test tests/crud.routes.test.js
```

Resultado verificado:

- 2 pruebas
- 2 aprobadas
- 0 fallidas

## Notas para despliegue

- Configurar el `.env` con valores reales del entorno.
- No compartir secretos ni tokens en GitHub.
- Si cambia la estructura de la API, documentarlo en el equipo o en el contrato de API.
- Al clonar el repositorio, copiar el `.env` correcto antes de levantar el servicio.

## Equipo

Proyecto backend BancoTecMi.
