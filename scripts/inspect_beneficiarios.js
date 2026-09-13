const pool = require('../src/config/database');
(async () => {
  const sql = `
    SELECT table_name, column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beneficiarios'
    ORDER BY ordinal_position
  `;
  const res = await pool.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})();
