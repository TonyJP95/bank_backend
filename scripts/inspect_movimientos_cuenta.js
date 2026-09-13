const pool = require('../src/config/database');
(async () => {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.movimientos_cuenta'::regclass
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
