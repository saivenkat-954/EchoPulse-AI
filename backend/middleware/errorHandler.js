function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number(err.status || err.statusCode || 500);
  const isProd = process.env.NODE_ENV === 'production';

  console.error('[API Error]', {
    method: req.method,
    path: req.originalUrl,
    status,
    message: err.message,
    code: err.code
  });

  res.status(status).json({
    success: false,
    error: {
      code: err.publicCode || (status === 400 ? 'BAD_REQUEST' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
      message: err.publicMessage || (isProd && status >= 500 ? 'Something went wrong. Please try again.' : err.message || 'Unexpected server error.')
    }
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found.` }
  });
}

module.exports = { errorHandler, notFound };
