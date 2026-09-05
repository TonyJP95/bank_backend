function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Error interno del servidor'
  });
}

module.exports = { notFoundHandler, errorHandler };