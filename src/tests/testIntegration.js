/**
 * Script para testar o fluxo completo da integração
 */
const fs = require('fs');
const path = require('path');
const xmlParser = require('../services/xmlParser');
const productMapper = require('../services/productMapper');
const invoiceMapper = require('../services/invoiceMapper');
const wmsService = require('../services/wmsService');

// Caminho para o arquivo XML de exemplo
const xmlFilePath = path.join(__dirname, '../../uploads/exemplo_nfe.xml');

// Função principal de teste
async function testIntegration() {
  try {
    console.log('Iniciando teste de integração...');
    
    // Verifica se o arquivo XML existe
    if (!fs.existsSync(xmlFilePath)) {
      console.error('Arquivo XML de exemplo não encontrado!');
      return;
    }
    
    console.log('Arquivo XML encontrado. Iniciando processamento...');
    
    // Extrai dados do XML
    const xmlData = await xmlParser.extractDataFromXml(xmlFilePath);
    console.log('XML extraído com sucesso.');
    
    // Valida os dados extraídos
    const validatedData = xmlParser.validateXmlData(xmlData);
    console.log('Dados validados com sucesso.');
    
    // Mapeia para o formato JSON de cadastro de mercadorias
    const productsJson = productMapper.mapProductsData(validatedData.data);
    console.log('JSON de cadastro de mercadorias gerado:');
    console.log(JSON.stringify(productsJson, null, 2));
    
    // Mapeia para o formato JSON de entrada de NFe
    const invoiceJson = invoiceMapper.mapInvoiceData(validatedData.data);
    console.log('JSON de entrada de NFe gerado:');
    console.log(JSON.stringify(invoiceJson, null, 2));
    
    // Simula o envio para a API WMS (comentado para não fazer requisições reais)
    console.log('Em um ambiente real, os JSONs seriam enviados para a API WMS.');
    console.log('Teste concluído com sucesso!');
    
    // Salva os JSONs gerados para verificação
    fs.writeFileSync(
      path.join(__dirname, '../../uploads/produtos_gerado.json'),
      JSON.stringify(productsJson, null, 2)
    );
    
    fs.writeFileSync(
      path.join(__dirname, '../../uploads/nfe_gerado.json'),
      JSON.stringify(invoiceJson, null, 2)
    );
    
    console.log('JSONs gerados foram salvos na pasta uploads para verificação.');
    
  } catch (error) {
    console.error('Erro durante o teste de integração:', error);
  }
}

// Executa o teste
testIntegration();
