const pool = require('../src/config/database');

(async () => {
  const res = await pool.query(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'public.auditoria_sistema'::regclass"
  );
  console.log(JSON.stringify(res.rows, null, 2));

  const res2 = await pool.query(
    "SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'auditoria_sistema'"
  );
  console.log(JSON.stringify(res2.rows, null, 2));

  await pool.end();
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
