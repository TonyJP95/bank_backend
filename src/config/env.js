const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default('postgres'),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().min(1),
  DB_SSL: z.enum(['true', 'false']).default('true'),
  JWT_SECRET: z.string().min(32),
  FRONTEND_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuracion de entorno invalida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = {
  ...parsed.data,
  DB_SSL: parsed.data.DB_SSL === 'true',
  FRONTEND_ORIGINS: parsed.data.FRONTEND_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
};