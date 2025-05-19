/**
 * Rotas da API
 */
const express = require('express');
const router = express.Router();
const upload = require('../middlewares/fileUpload');
const integrationController = require('../controllers/integrationController');

// Endpoint para receber o arquivo XML
router.post('/integration', upload.single('file'), integrationController.processXmlIntegration);

module.exports = router;
