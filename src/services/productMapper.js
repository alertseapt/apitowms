/**
 * Serviço para mapear dados do XML para o formato JSON de cadastro de mercadorias
 */
const config = require('../config/config');

/**
 * Mapeia os dados do XML para o formato JSON de cadastro de mercadorias
 * @param {Object} xmlData - Dados extraídos do XML
 * @returns {Object} - JSON formatado para cadastro de mercadorias
 */
const mapProductsData = (xmlData) => {
  try {
    // Extrai os dados relevantes do XML
    // Nota: A estrutura exata dependerá do formato do XML recebido
    // Este é um exemplo genérico que deve ser adaptado ao XML real
    
    const products = extractProductsFromXml(xmlData);
    
    // Cria o objeto JSON no formato esperado pelo WMS
    const mercadoriasJson = {
      CORPEM_ERP_MERC: {
        CGCCLIWMS: extractCnpjFromXml(xmlData),
        PRODUTOS: products.map(product => ({
          CODPROD: product.codigo || "",
          NOMEPROD: product.descricao || "",
          IWS_ERP: "1",
          TPOLRET: product.politicaRetirada || "1",
          IAUTODTVEN: product.calcularDataVencimento || "0",
          QTDDPZOVEN: product.diasParaVencimento || "",
          ILOTFAB: product.controleLote || "0",
          IDTFAB: product.controleDataFabricacao || "0",
          IDTVEN: product.controleDataVencimento || "0",
          INSER: product.controleNumeroSerie || "0",
          SEM_LOTE_CKO: product.ignorarLoteCheckout || "0",
          SEM_DTVEN_CKO: product.ignorarDataVencimentoCheckout || "0",
          CODFAB: product.codigoFabricante || "",
          NOMEFAB: product.nomeFabricante || "",
          CODGRU: product.codigoGrupo || "",
          NOMEGRU: product.nomeGrupo || "",
          CODPROD_FORN: product.codigoProdutoFornecedor || "",
          NCM: product.ncm || "",
          EMBALAGENS: mapProductPackaging(product.embalagens)
        }))
      }
    };
    
    return mercadoriasJson;
  } catch (error) {
    throw new Error(`Erro ao mapear dados para cadastro de mercadorias: ${error.message}`);
  }
};

/**
 * Extrai o CNPJ do cliente WMS do XML
 * @param {Object} xmlData - Dados extraídos do XML
 * @returns {string} - CNPJ do cliente WMS
 */
const extractCnpjFromXml = (xmlData) => {
  // Implementação depende da estrutura do XML
  // Este é um exemplo genérico
  try {
    // Busca o CNPJ no XML
    const cnpj = xmlData?.NFe?.infNFe?.emit?.CNPJ || 
                 xmlData?.nfeProc?.NFe?.infNFe?.emit?.CNPJ ||
                 "";
    
    // Remove caracteres não numéricos
    return cnpj.replace(/\D/g, "");
  } catch (error) {
    console.error("Erro ao extrair CNPJ:", error);
    return "";
  }
};

/**
 * Extrai os produtos do XML
 * @param {Object} xmlData - Dados extraídos do XML
 * @returns {Array} - Lista de produtos
 */
const extractProductsFromXml = (xmlData) => {
  // Implementação depende da estrutura do XML
  // Este é um exemplo genérico
  try {
    // Busca os itens da nota fiscal no XML
    const items = xmlData?.NFe?.infNFe?.det || 
                  xmlData?.nfeProc?.NFe?.infNFe?.det || 
                  [];
    
    // Converte para array se não for
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Mapeia os itens para o formato de produtos
    return itemsArray.map(item => {
      const prod = item.prod || {};
      
      return {
        codigo: prod.cProd || "",
        descricao: prod.xProd || "",
        ncm: prod.NCM ? prod.NCM.replace(/\D/g, "") : "",
        codigoFabricante: "",  // Não disponível diretamente no XML
        nomeFabricante: "",    // Não disponível diretamente no XML
        codigoGrupo: "",       // Não disponível diretamente no XML
        nomeGrupo: "",         // Não disponível diretamente no XML
        codigoProdutoFornecedor: "",  // Não disponível diretamente no XML
        politicaRetirada: "1",  // Valor padrão
        calcularDataVencimento: "0",  // Valor padrão
        diasParaVencimento: "",  // Valor padrão
        controleLote: "0",  // Valor padrão
        controleDataFabricacao: "0",  // Valor padrão
        controleDataVencimento: "0",  // Valor padrão
        controleNumeroSerie: "0",  // Valor padrão
        ignorarLoteCheckout: "0",  // Valor padrão
        ignorarDataVencimentoCheckout: "0",  // Valor padrão
        embalagens: [{
          unidade: prod.uCom || "",
          fator: "1",
          codigoBarras: prod.cEAN || "",
          pesoLiquido: prod.pesoL || "",
          pesoBruto: prod.pesoB || "",
          altura: "",
          largura: "",
          comprimento: "",
          volume: ""
        }]
      };
    });
  } catch (error) {
    console.error("Erro ao extrair produtos:", error);
    return [];
  }
};

/**
 * Mapeia as embalagens do produto
 * @param {Array} embalagens - Lista de embalagens do produto
 * @returns {Array} - Lista de embalagens no formato esperado pelo WMS
 */
const mapProductPackaging = (embalagens) => {
  if (!embalagens || !Array.isArray(embalagens)) {
    return [];
  }
  
  return embalagens.map(emb => ({
    CODUNID: emb.unidade || "",
    FATOR: emb.fator || "1",
    CODBARRA: emb.codigoBarras || "",
    PESOLIQ: emb.pesoLiquido || "",
    PESOBRU: emb.pesoBruto || "",
    ALT: emb.altura || "",
    LAR: emb.largura || "",
    COMP: emb.comprimento || "",
    VOL: emb.volume || "",
    IEMB_ENT: emb.embalagemEntrada || "1",
    IEMB_SAI: emb.embalagemSaida || "1"
  }));
};

module.exports = {
  mapProductsData
};
