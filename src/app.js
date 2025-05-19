/**
 * Aplicação principal
 */
const express = require('express');
const path = require('path');
const config = require('./config/config');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

// Inicializa o Express
const app = express();

// Middleware para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, TOKEN_CP');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Middleware para parsing de JSON
app.use(express.json());

// Middleware para parsing de formulários
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api', routes);

// Rota de status
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'API de integração XML para WMS está funcionando'
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicia o servidor
const PORT = config.server.port || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
