# Estrutura da API de Integração XML para WMS

## Visão Geral
A API será responsável por receber um arquivo XML via requisição POST, processar esse arquivo e gerar duas requisições JSON para o sistema WMS:
1. Cadastro de mercadorias (produtos)
2. Criação de entrada de NFe

## Arquitetura

### Tecnologias
- **Node.js**: Plataforma de execução
- **Express**: Framework web para criação da API
- **Multer**: Middleware para processamento de upload de arquivos
- **xml2js**: Biblioteca para conversão de XML para JSON
- **Axios**: Cliente HTTP para requisições à API WMS
- **Joi**: Biblioteca para validação de dados

### Estrutura de Pastas
```
/
├── src/
│   ├── config/
│   │   └── config.js           # Configurações da aplicação (URLs, tokens, etc.)
│   ├── controllers/
│   │   └── integrationController.js  # Controlador para o endpoint de integração
│   ├── middlewares/
│   │   ├── errorHandler.js     # Middleware para tratamento de erros
│   │   └── fileUpload.js       # Middleware para upload de arquivos
│   ├── services/
│   │   ├── xmlParser.js        # Serviço para parsing do XML
│   │   ├── productMapper.js    # Serviço para mapear dados para o formato de produtos
│   │   ├── invoiceMapper.js    # Serviço para mapear dados para o formato de NFe
│   │   └── wmsService.js       # Serviço para comunicação com a API WMS
│   ├── utils/
│   │   ├── validators.js       # Utilitários para validação de dados
│   │   └── formatters.js       # Utilitários para formatação de dados
│   ├── routes/
│   │   └── index.js            # Definição de rotas da API
│   └── app.js                  # Arquivo principal da aplicação
├── tests/                      # Testes da aplicação
├── package.json                # Dependências e scripts
└── README.md                   # Documentação
```

## Fluxo de Processamento

1. **Recebimento do XML**:
   - Endpoint POST `/api/integration` recebe o arquivo XML
   - Middleware Multer processa o upload do arquivo

2. **Parsing do XML**:
   - Conversão do XML para estrutura JSON utilizando xml2js
   - Validação da estrutura do XML recebido

3. **Mapeamento para JSONs do WMS**:
   - Extração dos dados de produtos do XML
   - Mapeamento para o formato JSON de cadastro de mercadorias
   - Extração dos dados de nota fiscal do XML
   - Mapeamento para o formato JSON de entrada de NFe

4. **Envio para API WMS**:
   - Envio sequencial das requisições (primeiro produtos, depois NFe)
   - Adição do token de autenticação no header
   - Tratamento das respostas e erros

5. **Resposta ao Cliente**:
   - Consolidação das respostas das APIs do WMS
   - Retorno de status e mensagens ao cliente

## Detalhes de Implementação

### Endpoint de Integração
```javascript
POST /api/integration
Content-Type: multipart/form-data
```

Parâmetros:
- `file`: Arquivo XML contendo dados de produtos e nota fiscal

Resposta:
```json
{
  "success": true,
  "products": {
    "status": "success",
    "message": "Produtos cadastrados com sucesso"
  },
  "invoice": {
    "status": "success",
    "message": "Nota fiscal registrada com sucesso"
  }
}
```

### Configuração do Token
O token de autenticação será configurado no arquivo de configuração e adicionado ao header de todas as requisições para a API WMS:

```javascript
headers: {
  'Content-Type': 'application/json',
  'TOKEN_CP': 'X12X4X58S4D5sde57A4d347pqW6rTZ'
}
```

### Validações Importantes
- Verificar se o XML está bem formado
- Validar campos obrigatórios conforme documentação
- Garantir que campos vazios sejam enviados como "" e não como null
- Manter a sequência de tags conforme documentação
- Processar as requisições sequencialmente, nunca em paralelo

### Tratamento de Erros
- Erros de parsing do XML
- Erros de validação de dados
- Erros de comunicação com a API WMS
- Erros retornados pela API WMS
