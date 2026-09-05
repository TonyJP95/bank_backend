# Backend BancoTecMi

API compartida por la web, la app y el software de escritorio. La persistencia se realiza mediante una conexión PostgreSQL directa a Supabase; no se usa una base de usuarios en memoria.

## Configuracion local

1. Copia `.env.example` como `.env`.
2. Completa `DB_PASSWORD` con la contraseña de PostgreSQL. No la escribas en el código ni la subas al repositorio.
3. Genera un `JWT_SECRET` aleatorio de al menos 32 caracteres.
4. Ejecuta:

```bash
npm install
npm run dev
```

El health check queda disponible en `GET http://localhost:4000/health`.

## Endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/transferencias
```

El registro crea un cliente en `clientes` y su acceso en `usuario_acceso`. Las contrasenas se almacenan como hash bcrypt; el token de respuesta es un JWT firmado por el backend.

Todos los recursos CRUD siguientes requieren `Authorization: Bearer <token>`:

```text
GET    /api/v1/:recurso
GET    /api/v1/:recurso/:id
POST   /api/v1/:recurso
PUT    /api/v1/:recurso/:id
PATCH  /api/v1/:recurso/:id
DELETE /api/v1/:recurso/:id
```

Recursos: `roles`, `permisos`, `clientes`, `direcciones`, `empleados`, `dispositivos`, `sesiones`, `actividades`, `intentos-login`, `tipos-cuenta`, `cuentas`, `beneficiarios`, `tipos-tarjeta`, `tarjetas`, `lineas-credito`, `transacciones`, `transferencias`, `movimientos`, `prestamos`, `pagos-prestamo`, `bloqueos`, `alertas`, `auditoria`, `estados-cuenta` y `notificaciones`.

Las tablas puente `rol_permisos` y `usuario_roles`, y `usuario_acceso`, se manejan mediante operaciones específicas para evitar exponer contraseñas o claves compuestas como un CRUD ambiguo.

El endpoint de transferencias ejecuta `fn_realizar_transferencia` del `schema.sql`, incluyendo el bloqueo de cuentas y los movimientos contables. El CRUD genérico sirve como puente inicial y no reemplaza las validaciones de negocio o RBAC.