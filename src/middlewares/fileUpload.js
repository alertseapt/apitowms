/**
 * Middleware para upload de arquivos XML
 */
const multer = require('multer');
const path = require('path');
const config = require('../config/config');

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.xml');
  }
});

// Filtro para permitir apenas arquivos XML
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas arquivos XML são permitidos.'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: fileFilter
});

module.exports = upload;
