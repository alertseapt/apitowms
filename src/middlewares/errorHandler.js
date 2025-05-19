/**
 * Middleware para tratamento de erros
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Erro de validação do Multer (tipo de arquivo ou tamanho)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Arquivo muito grande. Tamanho máximo permitido é 10MB.'
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor'
  });
};

module.exports = errorHandler;
