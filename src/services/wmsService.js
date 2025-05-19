/**
 * Serviço para comunicação com a API WMS
 */
const axios = require('axios');
const config = require('../config/config');

/**
 * Envia requisição para o endpoint de cadastro de mercadorias
 * @param {Object} productsData - JSON formatado para cadastro de mercadorias
 * @returns {Promise<Object>} - Resposta da API WMS
 */
const sendProductsToWms = async (productsData) => {
  try {
    console.log('Enviando cadastro de mercadorias para o WMS...');
    
    const response = await axios.post(config.wmsEndpoint, productsData, {
      headers: {
        'Content-Type': 'application/json',
        'TOKEN_CP': config.wmsToken
      }
    });
    
    console.log('Resposta do WMS (Cadastro de Mercadorias):', response.data);
    
    // Verifica se a resposta contém erro
    if (response.data.CORPEM_WS_ERRO) {
      throw new Error(`Erro na API WMS: ${response.data.CORPEM_WS_ERRO}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // Erro de resposta da API
      console.error('Erro na resposta da API WMS:', error.response.data);
      throw new Error(`Erro na API WMS: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Erro de requisição (sem resposta)
      console.error('Erro na requisição para API WMS:', error.request);
      throw new Error('Erro de comunicação com a API WMS. Sem resposta do servidor.');
    } else {
      // Outros erros
      console.error('Erro ao enviar cadastro de mercadorias:', error.message);
      throw error;
    }
  }
};

/**
 * Envia requisição para o endpoint de entrada de NFe
 * @param {Object} invoiceData - JSON formatado para entrada de NFe
 * @returns {Promise<Object>} - Resposta da API WMS
 */
const sendInvoiceToWms = async (invoiceData) => {
  try {
    console.log('Enviando entrada de NFe para o WMS...');
    
    const response = await axios.post(config.wmsEndpoint, invoiceData, {
      headers: {
        'Content-Type': 'application/json',
        'TOKEN_CP': config.wmsToken
      }
    });
    
    console.log('Resposta do WMS (Entrada de NFe):', response.data);
    
    // Verifica se a resposta contém erro
    if (response.data.CORPEM_WS_ERRO) {
      throw new Error(`Erro na API WMS: ${response.data.CORPEM_WS_ERRO}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // Erro de resposta da API
      console.error('Erro na resposta da API WMS:', error.response.data);
      throw new Error(`Erro na API WMS: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Erro de requisição (sem resposta)
      console.error('Erro na requisição para API WMS:', error.request);
      throw new Error('Erro de comunicação com a API WMS. Sem resposta do servidor.');
    } else {
      // Outros erros
      console.error('Erro ao enviar entrada de NFe:', error.message);
      throw error;
    }
  }
};

/**
 * Processa a integração completa com o WMS
 * @param {Object} xmlData - Dados extraídos do XML
 * @param {Object} productsData - JSON formatado para cadastro de mercadorias
 * @param {Object} invoiceData - JSON formatado para entrada de NFe
 * @returns {Promise<Object>} - Resultado da integração
 */
const processWmsIntegration = async (xmlData, productsData, invoiceData) => {
  try {
    // Primeiro envia o cadastro de mercadorias
    const productsResponse = await sendProductsToWms(productsData);
    
    // Depois envia a entrada de NFe
    const invoiceResponse = await sendInvoiceToWms(invoiceData);
    
    // Retorna o resultado consolidado
    return {
      success: true,
      products: {
        status: 'success',
        message: 'Produtos cadastrados com sucesso',
        response: productsResponse
      },
      invoice: {
        status: 'success',
        message: 'Nota fiscal registrada com sucesso',
        response: invoiceResponse
      }
    };
  } catch (error) {
    console.error('Erro na integração com o WMS:', error.message);
    
    // Retorna o erro
    return {
      success: false,
      message: `Erro na integração com o WMS: ${error.message}`
    };
  }
};

module.exports = {
  sendProductsToWms,
  sendInvoiceToWms,
  processWmsIntegration
};
