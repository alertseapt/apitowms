/**
 * Configurações da aplicação
 */
module.exports = {
  // Endpoint da API WMS
  wmsEndpoint: 'http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc',
  
  // Token de autenticação para a API WMS
  // Este token deve ser configurado conforme fornecido pelo sistema WMS
  wmsToken: 'X12X4X58S4D5sde57A4d347pqW6rTZ', // Exemplo - substituir pelo token real
  
  // Configurações do servidor
  server: {
    port: 3000
  },
  
  // Configurações de upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['text/xml', 'application/xml']
  }
};
