const express = require('express');
const multer = require('multer');
const xml2js = require('xml2js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Endpoint do WMS
const CORPEM_ENDPOINT = process.env.CORPEM_ENDPOINT || 'http://webcorpem.no-ip.info:800/scripts/mh.dll/wc';

// Token de autenticação
const TOKEN_CP = process.env.TOKEN_CP || '6cnc3';

app.post('/nfe', upload.single('xml'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo XML foi enviado.' });
  }

  try {
    const xmlFilePath = path.resolve(req.file.path);
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
    console.log('Conteúdo XML (início):', xmlData.substring(0, 200)); // Log para depuração

    const result = await xml2js.parseStringPromise(xmlData, { explicitArray: false, trim: true });
    console.log('Resultado do parsing XML (nfeProc): ', JSON.stringify(result?.nfeProc, null, 2)); // Log para depuração

    const nfeProc = result.nfeProc;
    const infNFe = nfeProc?.NFe?.infNFe;
    console.log('Objeto infNFe:', JSON.stringify(infNFe, null, 2)); // Log para depuração

    if (!infNFe) {
      console.error('Erro: Estrutura XML inválida ou infNFe não encontrado após parsing.');
      return res.status(400).json({ erro: 'XML inválido ou estrutura inesperada.' });
    }

    const ide = infNFe.ide;
    const emit = infNFe.emit;
    const dest = infNFe.dest;
    const itemsXml = Array.isArray(infNFe.det) ? infNFe.det : (infNFe.det ? [infNFe.det] : []);

    // Forçar a Chave NF-e para o valor de teste que funcionou anteriormente
    const chaveNFe = process.env.CHAVE_NFE_FIXA || "42250302457533000203550010000422761011740306"; // Permitir configurar via env var
    console.log('CHAVE NF-e UTILIZADA (pode ser fixa via CHAVE_NFE_FIXA):', chaveNFe);

    // Lógica de extração dinâmica da Chave NF-e (mantida comentada para referência)
    /*
    let originalChaveNFeExtraida = '';
    if (nfeProc?.protNFe?.infProt?.chNFe) {
      originalChaveNFeExtraida = nfeProc.protNFe.infProt.chNFe;
      console.log('Debug (original): Chave NF-e extraída da tag chNFe:', originalChaveNFeExtraida);
    } else if (infNFe?.Id) {
      originalChaveNFeExtraida = infNFe.Id.replace('NFe', '');
      console.log('Debug (original): Chave NF-e extraída do Id (fallback):', originalChaveNFeExtraida);
    } else {
      console.warn('Alerta (original): Não foi possível extrair a chave NF-e do XML.');
    }
    */

    // Calcular a soma total dos produtos e preparar os itens para o JSON
    let somaTotalItens = 0;
    const itensJSON = itemsXml.map((item, idx) => {
      const vProd = parseFloat(item.prod?.vProd || '0');
      somaTotalItens += vProd;
      return {
        NUMSEQ: (idx + 1).toString(),
        CODPROD: item.prod?.cProd || '',
        QTPROD: item.prod?.qCom || '0',
        VLTOTPROD: vProd.toFixed(2), // Usar o vProd do item XML
        NUMSEQ_DEV: (idx + 1).toString()
      };
    });

    const vltotalnfCalculado = somaTotalItens.toFixed(2);
    console.log('VLTOTALNF (XML original):', infNFe.total?.ICMSTot?.vNF);
    console.log('VLTOTALNF (Calculado pela soma dos vProd dos itens):', vltotalnfCalculado);

    const corpoJSON = {
      CORPEM_ERP_DOC_ENT: {
        CGCCLIWMS: dest?.CNPJ || '',
        CGCREM: emit?.CNPJ || '',
        OBSRESDP: `N.F.: ${ide?.nNF || ''}`,
        TPDESTNF: "2",
        DEV: "0",
        NUMNF: ide?.nNF || '',
        SERIENF: ide?.serie || '',
        DTEMINF: formatarData(ide?.dhEmi || ''),
        VLTOTALNF: vltotalnfCalculado, // Manter o uso da soma calculada dos itens
        NUMEPEDCLI: `N.F. ${ide?.nNF || ''}`,
        CHAVENF: chaveNFe, // Usar a chave FORÇADA para este teste
        CHAVENF_DEV: "",
        ITENS: itensJSON
      }
    };

    console.log('Enviando para o WMS:', JSON.stringify(corpoJSON, null, 2));
    console.log('Headers:', { 'Content-Type': 'application/json', 'TOKEN_CP': TOKEN_CP });

    const response = await axios.post(CORPEM_ENDPOINT, corpoJSON, {
      headers: {
        'Content-Type': 'application/json',
        'TOKEN_CP': TOKEN_CP
      }
    });

    console.log('Resposta do WMS:', response.data);
    res.json({ status: 'Enviado com sucesso', resposta: response.data });

  } catch (error) {
    console.error('Erro geral no endpoint /nfe:');
    if (error.response) {
      console.error('Data:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      res.status(error.response.status).json({ erro: 'Falha no envio ao WMS.', detalhe: error.response.data });
    } else if (error.request) {
      console.error('Request feita mas sem resposta:', error.request);
      res.status(500).json({ erro: 'Serviço WMS não respondeu.', detalhe: error.message });
    } else {
      console.error('Erro ao configurar request:', error.message);
      res.status(500).json({ erro: 'Falha no processamento do XML.', detalhe: error.message });
    }
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
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
      // Tentativa de parse para formatos como "YYYY-MM-DDTHH:mm:ss-03:00"
      const parts = dataISO.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const formattedDate = `${day}/${month}/${year}`;
        if (new Date(`${year}-${month}-${day}`).toString() !== 'Invalid Date') {
            console.log(`Data convertida de ${dataISO} para ${formattedDate}`);
            return formattedDate;
        }
      }
      return ""; // Retorna vazio se não conseguir formatar
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
