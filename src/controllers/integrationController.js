/**
 * Atualiza o controller para integrar todos os serviços
 */
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const xmlParser = require('../services/xmlParser');
const productMapper = require('../services/productMapper');
const invoiceMapper = require('../services/invoiceMapper');
const wmsService = require('../services/wmsService');

/**
 * Processa o arquivo XML e envia para a API WMS
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
const processXmlIntegration = async (req, res, next) => {
  try {
    // Verifica se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo XML foi enviado'
      });
    }

    // Caminho do arquivo
    const filePath = req.file.path;
    
    // Registra recebimento do arquivo
    console.log(`Arquivo XML recebido: ${req.file.originalname}`);
    
    // Resposta inicial para o cliente
    res.status(202).json({
      success: true,
      message: 'Arquivo XML recebido com sucesso. Processamento iniciado.',
      file: {
        name: req.file.originalname,
        size: req.file.size
      }
    });
    
    try {
      // Extrai dados do XML
      const xmlData = await xmlParser.extractDataFromXml(filePath);
      
      // Valida os dados extraídos
      const validatedData = xmlParser.validateXmlData(xmlData);
      
      // Mapeia para o formato JSON de cadastro de mercadorias
      const productsJson = productMapper.mapProductsData(validatedData.data);
      
      // Mapeia para o formato JSON de entrada de NFe
      const invoiceJson = invoiceMapper.mapInvoiceData(validatedData.data);
      
      // Envia para a API WMS
      const result = await wmsService.processWmsIntegration(
        validatedData.data,
        productsJson,
        invoiceJson
      );
      
      // Registra o resultado
      console.log('Integração concluída:', result);
      
      // Limpeza do arquivo (opcional)
      // fs.unlinkSync(filePath);
      
    } catch (error) {
      console.error('Erro no processamento assíncrono:', error);
      // Como a resposta já foi enviada, não podemos enviar outro status HTTP
      // Aqui poderíamos implementar uma notificação ou log do erro
    }
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processXmlIntegration
};
