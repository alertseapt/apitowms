const express = require('express');
const multer = require('multer');
const xml2js = require('xml2js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Endpoint do WMS
const CORPEM_ENDPOINT = process.env.CORPEM_ENDPOINT || 'http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc';

// Token de autenticação
const TOKEN_CP = process.env.TOKEN_CP || '6cnc3';

// CNPJ do Cliente WMS (Operador/Dono do estoque no WMS)
// Este CNPJ é usado para identificar a qual cliente WMS os produtos pertencem.
const CNPJ_CLIENTE_WMS_OPERADOR = process.env.CNPJ_CLIENTE_WMS_OPERADOR || '07876967000180'; // Usar o CNPJ correto da empresa

app.post('/nfe', upload.single('xml'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo XML foi enviado.' });
  }

  let resultadosCadastroProdutos = []; // Array para armazenar os resultados do cadastro de cada produto

  try {
    const xmlFilePath = path.resolve(req.file.path);
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
    console.log('Conteúdo XML (início):', xmlData.substring(0, 200));

    const result = await xml2js.parseStringPromise(xmlData, { explicitArray: false, trim: true });
    console.log('Resultado do parsing XML (nfeProc): ', JSON.stringify(result?.nfeProc, null, 2));

    const nfeProc = result.nfeProc;
    const infNFe = nfeProc?.NFe?.infNFe;
    console.log('Objeto infNFe:', JSON.stringify(infNFe, null, 2));

    if (!infNFe) {
      console.error('Erro: Estrutura XML inválida ou infNFe não encontrado após parsing.');
      return res.status(400).json({ erro: 'XML inválido ou estrutura inesperada.' });
    }

    const ide = infNFe.ide;
    const emit = infNFe.emit;
    const dest = infNFe.dest;
    const itemsXml = Array.isArray(infNFe.det) ? infNFe.det : (infNFe.det ? [infNFe.det] : []);

    console.log(`CNPJ do Cliente WMS (Operador) que será utilizado para cadastro de produtos: ${CNPJ_CLIENTE_WMS_OPERADOR}`);

    // Etapa 1: Cadastrar cada produto do XML no WMS
    console.log('Iniciando cadastro de produtos no WMS...');
    for (const item of itemsXml) {
      // O 'item' aqui é o <det> do XML, o produto está em item.prod
      const produtoXml = item.prod;
      if (!produtoXml) {
        console.warn('Item <det> sem dados de produto (<prod>) no XML, pulando cadastro deste item:', JSON.stringify(item, null, 2));
        continue;
      }

      const codProd = produtoXml.cProd || '';
      const nomeProd = produtoXml.xProd || '';
      // NCM: remover não dígitos e garantir que tenha no máximo 8 caracteres.
      // A documentação pede 8 dígitos, sem máscara. O XML geralmente já vem assim.
      const ncmProd = (produtoXml.NCM || '').replace(/\D/g, '').substring(0, 8);
      const codUnid = produtoXml.uCom || 'UN'; // Default para UN se não houver
      const codBarra = produtoXml.cEAN || '';

      if (!codProd) {
        console.error('Produto sem código (cProd) no XML. Item:', JSON.stringify(item, null, 2));
        return res.status(400).json({
            erro: 'Falha no cadastro de produtos.',
            detalhe: `Um dos produtos no XML está sem código (cProd). Item: ${item.$?.nItem || JSON.stringify(produtoXml)}`
        });
      }
      if (!ncmProd || ncmProd.length < 2) { // NCM pode ter de 2 a 8 dígitos, mas aqui a API pede 8. A API pode ser flexível.
        console.warn(`Produto ${codProd} com NCM inválido ou ausente: "${produtoXml.NCM}". Será enviado como "${ncmProd}".`);
      }


      const produtoPayloadCadastro = {
        CORPEM_ERP_MERC: {
          CGCCLIWMS: CNPJ_CLIENTE_WMS_OPERADOR, // CNPJ da empresa operadora do WMS
          CODPROD: codProd,
          NOMEPROD: nomeProd,
          IWS_ERP: "1", // Indicador WMS/ERP
          TPOLRET: "1", // Política de retirada: FIFO (First In, First Out)
          IAUTODTVEN: "0", // Calcular Data de vencimento automaticamente: Não
          QTDDPZOVEN: "",   // Quantidade de dias para data de vencimento automática
          ILOTFAB: "0", // Controla lote: Não (simplificado)
          IDTFAB: "0",  // Controla data de fabricação: Não (simplificado)
          IDTVEN: "0",  // Controla data de vencimento: Não (simplificado)
          INSER: "0",   // Controla número de série: Não (simplificado)
          SEM_LOTE_CKO: "0", // Ignorar Lote no Checkout: Não
          SEM_DTVEN_CKO: "0",// Ignorar Data Vencimento no Checkout: Não
          CODFAB: "",        // Código do Fabricante (opcional)
          NOMEFAB: "",       // Nome do Fabricante (opcional)
          CODGRU: "",        // Código do Grupo (opcional)
          NOMEGRU: "",       // Nome do Grupo (opcional)
          CODPROD_FORN: "",  // Código da mercadoria no Fornecedor (opcional)
          NCM: ncmProd,      // NCM com 8 dígitos, sem máscara
          EMBALAGENS: [
            {
              CODUNID: codUnid,       // Unidade de medida (ex: UN, CX)
              FATOR: "1",             // Fator de conversão para unidade base
              CODBARRA: codBarra,     // Código de barras EAN
              PESOLIQ: "0.000",       // Peso Líquido (opcional)
              PESOBRU: "0.000",       // Peso Bruto (opcional)
              ALT: "0.000",           // Altura em metros (opcional)
              LAR: "0.000",           // Largura em metros (opcional)
              COMP: "0.000",          // Comprimento em metros (opcional)
              VOL: "0.000",           // Volume em m³ (opcional)
              IEMB_ENT: "1",          // Embalagem de entrada: Sim
              IEMB_SAI: "1"           // Embalagem de saída: Sim
            }
          ]
        }
      };

      console.log(`Tentando cadastrar/atualizar produto: ${codProd} - ${nomeProd}`);
      console.log('Payload cadastro produto:', JSON.stringify(produtoPayloadCadastro, null, 2));

      let resultadoCadastroItem = { // Objeto para armazenar o resultado deste item
        codigo_produto: codProd,
        nome_produto: nomeProd,
        payload_enviado: produtoPayloadCadastro,
        resposta_wms: null,
        status: ''
      };

      try {
        const responseCadastro = await axios.post(CORPEM_ENDPOINT, produtoPayloadCadastro, {
          headers: { 'Content-Type': 'application/json', 'TOKEN_CP': TOKEN_CP }
        });
        console.log(`Resposta do WMS para cadastro do produto ${codProd}:`, JSON.stringify(responseCadastro.data, null, 2));
        resultadoCadastroItem.resposta_wms = responseCadastro.data;

        if (responseCadastro.data && responseCadastro.data.CORPEM_WS_ERRO) {
          resultadoCadastroItem.status = 'ERRO_WMS';
          resultadosCadastroProdutos.push(resultadoCadastroItem);
          // Se o WMS retornar um erro específico, trata como falha no cadastro do produto
          throw new Error(`Erro do WMS ao cadastrar/atualizar produto ${codProd}: ${responseCadastro.data.CORPEM_WS_ERRO}`);
        }
        // Se não houver CORPEM_WS_ERRO, considera-se sucesso.
        console.log(`Produto ${codProd} cadastrado/atualizado com sucesso no WMS.`);
        resultadoCadastroItem.status = 'SUCESSO';

      } catch (errorCadastro) {
        console.error(`Erro crítico ao cadastrar/atualizar produto ${codProd} no WMS:`);
        let errorMessage = errorCadastro.message;
        let errorDetailJson = null;
        resultadoCadastroItem.status = 'ERRO_APLICACAO';

        if (errorCadastro.response) {
          console.error('Data:', JSON.stringify(errorCadastro.response.data, null, 2));
          console.error('Status:', errorCadastro.response.status);
          console.error('Headers:', JSON.stringify(errorCadastro.response.headers, null, 2));
          errorDetailJson = errorCadastro.response.data; // Captura o JSON do erro
          resultadoCadastroItem.resposta_wms = errorDetailJson;
          if (errorDetailJson && errorDetailJson.CORPEM_WS_ERRO) {
            errorMessage = `WMS Error: ${errorDetailJson.CORPEM_WS_ERRO}`;
            resultadoCadastroItem.status = 'ERRO_WMS'; // Sobrescreve se for erro específico do WMS
          } else if (typeof errorDetailJson === 'string') {
            errorMessage = `WMS Error: ${errorDetailJson}`;
          }
        } else if (errorCadastro.request) {
          console.error('Request feita mas sem resposta do WMS para cadastro de produto:', errorCadastro.request);
          errorMessage = 'Serviço WMS não respondeu à tentativa de cadastro de produto.';
        }
        // Adiciona o resultado mesmo em caso de erro antes de retornar
        resultadosCadastroProdutos.push(resultadoCadastroItem);

        // Interromper o processo da NF-e se um produto falhar
        return res.status(500).json({
          erro: `Falha crítica ao cadastrar/atualizar produto ${codProd} no WMS.`,
          detalhe: errorMessage,
          // produto_payload: produtoPayloadCadastro, // O payload já está em resultadosCadastroProdutos
          // resposta_wms: errorDetailJson, // A resposta já está em resultadosCadastroProdutos
          detalhes_cadastro_produtos: resultadosCadastroProdutos // Inclui os resultados até o ponto da falha
        });
      }
      resultadosCadastroProdutos.push(resultadoCadastroItem); // Adiciona o resultado de sucesso
    }
    console.log('Todos os produtos do XML foram processados para cadastro/atualização no WMS.');

    // Etapa 2: Preparar e enviar a NF-e (código existente adaptado)
    console.log('Iniciando preparação para envio da NF-e ao WMS...');

    // Extrair a Chave NF-e dinamicamente do XML processado
    let chaveNFeExtraida = '';
    if (nfeProc && nfeProc.protNFe && nfeProc.protNFe.infProt && nfeProc.protNFe.infProt.chNFe) {
      chaveNFeExtraida = nfeProc.protNFe.infProt.chNFe;
      console.log('Chave NF-e extraída de protNFe.infProt.chNFe:', chaveNFeExtraida);
    } else if (infNFe && infNFe.Id && typeof infNFe.Id === 'string' && infNFe.Id.startsWith('NFe')) {
      chaveNFeExtraida = infNFe.Id.substring(3);
      console.log('Chave NF-e extraída de infNFe.Id (removendo "NFe"):', chaveNFeExtraida);
    } else if (infNFe && infNFe.Id && typeof infNFe.Id === 'string' && infNFe.Id.length === 44) {
      // Fallback caso o ID não tenha o prefixo "NFe" mas tenha o tamanho correto
      chaveNFeExtraida = infNFe.Id;
      console.log('Chave NF-e extraída de infNFe.Id (sem prefixo, tamanho 44):', chaveNFeExtraida);
    }

    if (!chaveNFeExtraida || chaveNFeExtraida.length !== 44) {
      console.error(`Erro: Não foi possível extrair uma Chave NF-e válida (44 dígitos) do XML. Chave encontrada: "${chaveNFeExtraida}"`);
      // Limpa o arquivo XML da pasta uploads antes de retornar o erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        erro: 'Não foi possível extrair uma Chave NF-e válida (44 dígitos) do XML.',
        chave_extraida: chaveNFeExtraida,
        detalhes_cadastro_produtos: resultadosCadastroProdutos 
      });
    }
    console.log('CHAVE NF-e UTILIZADA para envio ao WMS:', chaveNFeExtraida);

    let somaTotalItens = 0;
    const itensJSON_NFe = itemsXml.map((item, idx) => {
      const vProd = parseFloat(item.prod?.vProd || '0');
      somaTotalItens += vProd;
      return {
        NUMSEQ: (idx + 1).toString(),
        CODPROD: item.prod?.cProd || '',
        QTPROD: item.prod?.qCom || '0',
        VLTOTPROD: vProd.toFixed(2),
        NUMSEQ_DEV: (idx + 1).toString() // Verificar se esta lógica de NUMSEQ_DEV é adequada
      };
    });

    const vltotalnfCalculado = somaTotalItens.toFixed(2);
    console.log('VLTOTALNF (XML original da NF-e):', infNFe.total?.ICMSTot?.vNF);
    console.log('VLTOTALNF (Calculado pela soma dos vProd dos itens para NF-e):', vltotalnfCalculado);

    // CGCCLIWMS para a NF-e: CNPJ do Destinatário da NF-e.
    // O usuário estava testando com '07876967000180', que deve estar no XML <dest><CNPJ>
    const cnpjDestinatarioNFe = (dest?.CNPJ || '').replace(/\D/g, '');
    console.log(`CNPJ do Destinatário da NF-e (dest.CNPJ): ${cnpjDestinatarioNFe}`);


    const corpoJsonNFe = {
      CORPEM_ERP_DOC_ENT: {
        CGCCLIWMS: cnpjDestinatarioNFe, // CNPJ do Destinatário da NF-e
        CGCREM: (emit?.CNPJ || '').replace(/\D/g, ''), // CNPJ do Remetente/Emitente da NF-e
        OBSRESDP: `N.F.: ${ide?.nNF || ''}`,
        TPDESTNF: "2", // Tipo de Destino da NF (Ex: 2 para Outros)
        DEV: "0", // Devolução: Não
        NUMNF: ide?.nNF || '',
        SERIENF: ide?.serie || '',
        DTEMINF: formatarData(ide?.dhEmi || ''), // Data de emissão da NF-e
        VLTOTALNF: vltotalnfCalculado,
        NUMEPEDCLI: `N.F. ${ide?.nNF || ''}`, // Número do Pedido do Cliente
        CHAVENF: chaveNFeExtraida, // USA A CHAVE EXTRAÍDA DINAMICAMENTE
        CHAVENF_DEV: "", // Chave da NF-e de Devolução (vazio se não for devolução)
        ITENS: itensJSON_NFe
      }
    };

    console.log('Enviando NF-e para o WMS:', JSON.stringify(corpoJsonNFe, null, 2));
    console.log('Headers para NF-e:', { 'Content-Type': 'application/json', 'TOKEN_CP': TOKEN_CP });

    const responseNFe = await axios.post(CORPEM_ENDPOINT, corpoJsonNFe, {
      headers: {
        'Content-Type': 'application/json',
        'TOKEN_CP': TOKEN_CP
      }
    });

    console.log('Resposta do WMS para NF-e:', JSON.stringify(responseNFe.data, null, 2));
    res.json({
        status: 'NF-e enviada com sucesso após cadastro/atualização de produtos.',
        // resposta_cadastro_produtos: "Todos os produtos processados com sucesso.", // Substituído abaixo
        detalhes_cadastro_produtos: resultadosCadastroProdutos,
        resposta_nfe_wms: responseNFe.data
    });

  } catch (error) {
    // Este catch geral lida com erros não tratados nos blocos específicos
    // (ex: erro no parsing do XML, erro na chamada da NF-e se não for pego antes)
    console.error('Erro geral no endpoint /nfe:', error);
    let statusErrorCode = 500;
    let errorResponsePayload = { erro: 'Falha geral no processamento.', detalhe: error.message };

    if (error.response) { // Erro de uma chamada axios (ex: NF-e, se o erro de produto não retornou antes)
      console.error('Data do erro Axios:', JSON.stringify(error.response.data, null, 2));
      console.error('Status do erro Axios:', error.response.status);
      statusErrorCode = error.response.status;
      errorResponsePayload = {
        erro: 'Falha no envio ao WMS (etapa NF-e ou erro não capturado anteriormente).',
        detalhe: error.response.data || error.message,
        detalhes_cadastro_produtos: resultadosCadastroProdutos // Adiciona os resultados de cadastro
      };
    } else if (error.request) { // Request feita mas sem resposta
      console.error('Request feita mas sem resposta (erro geral):', error.request);
      errorResponsePayload = { erro: 'Serviço WMS não respondeu (etapa NF-e ou erro geral).', detalhe: error.message, detalhes_cadastro_produtos: resultadosCadastroProdutos };
    } else { // Erro ao configurar request ou outro erro
      console.error('Erro ao configurar request ou erro inesperado:', error.message);
      errorResponsePayload.detalhes_cadastro_produtos = resultadosCadastroProdutos; // Adiciona os resultados de cadastro
      // Mantém o payload default
    }
    res.status(statusErrorCode).json(errorResponsePayload);

  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path); // Limpa o arquivo XML da pasta uploads
    }
  }
});

function formatarData(dataISO) {
  if (!dataISO) return "";
  try {
    // Tenta detectar se a data já está no formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataISO)) {
        return dataISO;
    }
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) {
      console.warn(`Data ISO inválida recebida: ${dataISO}, tentando parse alternativo.`);
      const parts = dataISO.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        // Verifica se ano, mês e dia são válidos antes de formatar
        if (parseInt(year, 10) > 0 && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12 && parseInt(day, 10) >= 1 && parseInt(day, 10) <= 31) {
            const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            // Teste adicional de validade da data construída
            const testDateParts = formattedDate.split('/');
            const testDateObj = new Date(parseInt(testDateParts[2],10), parseInt(testDateParts[1],10)-1, parseInt(testDateParts[0],10));
            if (testDateObj && testDateObj.getDate() == parseInt(testDateParts[0],10) && testDateObj.getMonth() == (parseInt(testDateParts[1],10)-1) && testDateObj.getFullYear() == parseInt(testDateParts[2],10) ) {
                 console.log(`Data convertida de ${dataISO} para ${formattedDate}`);
                 return formattedDate;
            } else {
                 console.warn(`Data ${dataISO} resultou em data inválida ${formattedDate} após parse alternativo.`);
                 return "";
            }
        } else {
            console.warn(`Partes da data ${dataISO} inválidas (Y:${year}, M:${month}, D:${day}) após split.`);
            return "";
        }
      }
      console.warn(`Não foi possível formatar a data ${dataISO} com parse alternativo.`);
      return "";
    }
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (err) {
    console.error(`Erro ao formatar data ${dataISO}:`, err);
    return "";
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
