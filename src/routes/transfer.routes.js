const { Router } = require('express');
const { z } = require('zod');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

const transferSchema = z.object({
  idCuentaOrigen: z.string().uuid(),
  idCuentaDestino: z.string().uuid(),
  monto: z.coerce.number().positive(),
  concepto: z.string().trim().max(140).optional(),
  referencia: z.string().trim().max(80).optional()
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos invalidos',
        details: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
      });
    }

    const data = parsed.data;
    const result = await pool.query(
      `SELECT fn_realizar_transferencia($1, $2, $3, $4, $5, $6) AS id_transaccion`,
      [data.idCuentaOrigen, data.idCuentaDestino, data.monto, req.user.sub, data.concepto || null, data.referencia || null]
    );

    return res.status(201).json({ idTransaccion: result.rows[0].id_transaccion });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
