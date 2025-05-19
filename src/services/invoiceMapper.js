/**
 * Serviço para mapear dados do XML para o formato JSON de entrada de NFe
 */
const config = require('../config/config');

/**
 * Mapeia os dados do XML para o formato JSON de entrada de NFe
 * @param {Object} xmlData - Dados extraídos do XML
 * @returns {Object} - JSON formatado para entrada de NFe
 */
const mapInvoiceData = (xmlData) => {
  try {
    // Extrai os dados relevantes do XML
    // Nota: A estrutura exata dependerá do formato do XML recebido
    // Este é um exemplo genérico que deve ser adaptado ao XML real
    
    // Extrai informações do cabeçalho da nota fiscal
    const nfeInfo = extractNfeInfoFromXml(xmlData);
    
    // Extrai os itens da nota fiscal
    const items = extractItemsFromXml(xmlData);
    
    // Cria o objeto JSON no formato esperado pelo WMS
    const nfeJson = {
      CORPEM_ERP_DOC_ENT: {
        CGCCLIWMS: nfeInfo.cnpjDestinatario || "",
        CGCREM: nfeInfo.cnpjEmitente || "",
        OBSRESDP: `N.F.: ${nfeInfo.numeroNF}`,
        TPDESTNF: "2", // Cliente - Normal (padrão)
        DEV: "0", // Nota normal (não é devolução)
        NUMNF: nfeInfo.numeroNF || "",
        SERIENF: nfeInfo.serieNF || "",
        DTEMINF: nfeInfo.dataEmissao || "",
        VLTOTALNF: nfeInfo.valorTotal || "",
        NUMEPEDCLI: `N.F. ${nfeInfo.numeroNF}`,
        CHAVENF: nfeInfo.chaveNFe || "",
        CHAVENF_DEV: "", // Não é devolução
        ITENS: items.map((item, index) => ({
          NUMSEQ: (index + 1).toString(),
          CODPROD: item.codigo || "",
          QTPROD: item.quantidade || "",
          VLTOTPROD: item.valorTotal || "",
          NUMPED_COMPRA: "",
          LOTFAB: item.lote || "",
          DTVEN: item.dataVencimento || "",
          NUMSEQ_DEV: ""
        }))
      }
    };
    
    return nfeJson;
  } catch (error) {
    throw new Error(`Erro ao mapear dados para entrada de NFe: ${error.message}`);
  }
};

/**
 * Extrai informações da nota fiscal do XML
 * @param {Object} xmlData - Dados extraídos do XML
 * @returns {Object} - Informações da nota fiscal
 */
const extractNfeInfoFromXml = (xmlData) => {
  // Implementação depende da estrutura do XML
  // Este é um exemplo genérico
  try {
    // Busca as informações da nota fiscal no XML
    const infNFe = xmlData?.NFe?.infNFe || 
                   xmlData?.nfeProc?.NFe?.infNFe || 
                   {};
    
    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest || {};
    const total = infNFe.total?.ICMSTot || {};
    
    // Formata a data de emissão (AAAA-MM-DD para DD/MM/AAAA)
    let dataEmissao = "";
    if (ide.dhEmi) {
      const data = new Date(ide.dhEmi);
      dataEmissao = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`;
    }
    
    return {
      cnpjEmitente: emit.CNPJ ? emit.CNPJ.replace(/\D/g, "") : "",
      cnpjDestinatario: dest.CNPJ ? dest.CNPJ.replace(/\D/g, "") : "",
      numeroNF: ide.nNF || "",
      serieNF: ide.serie || "",
      dataEmissao: dataEmissao,
      valorTotal: total.vNF || "",
      chaveNFe: infNFe.Id ? infNFe.Id.replace(/[^0-9]/g, "") : ""
    };
  } catch (error) {
    console.error("Erro ao extrair informações da nota fiscal:", error);
    return {};
  }
};

/**
 * Extrai os itens da nota fiscal do XML
 * @param {Object} xmlData - Dados extraídos do XML
 * @returns {Array} - Lista de itens da nota fiscal
 */
const extractItemsFromXml = (xmlData) => {
  // Implementação depende da estrutura do XML
  // Este é um exemplo genérico
  try {
    // Busca os itens da nota fiscal no XML
    const items = xmlData?.NFe?.infNFe?.det || 
                  xmlData?.nfeProc?.NFe?.infNFe?.det || 
                  [];
    
    // Converte para array se não for
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Mapeia os itens para o formato esperado
    return itemsArray.map(item => {
      const prod = item.prod || {};
      
      return {
        codigo: prod.cProd || "",
        quantidade: prod.qCom || "",
        valorTotal: prod.vProd || "",
        lote: "", // Não disponível diretamente no XML
        dataVencimento: "" // Não disponível diretamente no XML
      };
    });
  } catch (error) {
    console.error("Erro ao extrair itens da nota fiscal:", error);
    return [];
  }
};

module.exports = {
  mapInvoiceData
};
