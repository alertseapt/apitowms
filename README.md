# API de Integração XML para WMS

## Descrição
Esta API Node.js recebe arquivos XML (geralmente notas fiscais eletrônicas) e os processa para gerar duas requisições JSON para o sistema WMS:
1. Cadastro de mercadorias (produtos)
2. Criação de entrada de NFe

## Estrutura do Projeto
```
/
├── src/
│   ├── config/
│   │   └── config.js           # Configurações da aplicação
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
│   ├── routes/
│   │   └── index.js            # Definição de rotas da API
│   ├── tests/
│   │   └── testIntegration.js  # Script para testar a integração
│   └── app.js                  # Arquivo principal da aplicação
├── uploads/                    # Pasta para armazenar arquivos temporários
├── package.json                # Dependências e scripts
└── README.md                   # Documentação
```

## Requisitos
- Node.js 14.x ou superior
- NPM 6.x ou superior

## Dependências
- express: Framework web para criação da API
- multer: Middleware para processamento de upload de arquivos
- xml2js: Biblioteca para conversão de XML para JSON
- axios: Cliente HTTP para requisições à API WMS
- joi: Biblioteca para validação de dados

## Instalação
1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```
3. Configure o arquivo `src/config/config.js` com as informações do seu ambiente:
   - Endpoint da API WMS
   - Token de autenticação
   - Porta do servidor

## Uso
1. Inicie o servidor:
```bash
node src/app.js
```
2. O servidor estará disponível na porta configurada (padrão: 3000)
3. Envie um arquivo XML para o endpoint `/api/integration` usando uma requisição POST com o formato `multipart/form-data`
4. O campo para o arquivo deve ser nomeado como `file`

### Exemplo de requisição usando cURL
```bash
curl -X POST -F "file=@/caminho/para/seu/arquivo.xml" http://localhost:3000/api/integration
```

### Exemplo de requisição usando Postman
1. Abra o Postman
2. Crie uma nova requisição POST para `http://localhost:3000/api/integration`
3. Na aba "Body", selecione "form-data"
4. Adicione um campo chamado "file" e selecione o tipo "File"
5. Selecione o arquivo XML que deseja enviar
6. Clique em "Send"

## Fluxo de Processamento
1. A API recebe o arquivo XML via requisição POST
2. O arquivo é salvo temporariamente no servidor
3. O XML é convertido para uma estrutura JSON
4. Os dados são mapeados para o formato JSON de cadastro de mercadorias
5. Os dados são mapeados para o formato JSON de entrada de NFe
6. As requisições são enviadas para a API WMS na ordem correta (primeiro produtos, depois NFe)
7. As respostas são processadas e retornadas ao cliente

## Configuração do Token
O token de autenticação é configurado no arquivo `src/config/config.js` e adicionado ao header de todas as requisições para a API WMS:

```javascript
headers: {
  'Content-Type': 'application/json',
  'TOKEN_CP': 'X12X4X58S4D5sde57A4d347pqW6rTZ'
}
```

## Tratamento de Erros
A API inclui tratamento para os seguintes tipos de erros:
- Erros de parsing do XML
- Erros de validação de dados
- Erros de comunicação com a API WMS
- Erros retornados pela API WMS

## Exemplos
Na pasta `uploads` você encontrará:
- `exemplo_nfe.xml`: Um exemplo de arquivo XML para teste
- `produtos_gerado.json`: O JSON de cadastro de mercadorias gerado a partir do XML de exemplo
- `nfe_gerado.json`: O JSON de entrada de NFe gerado a partir do XML de exemplo

## Notas Importantes
- A API processa as requisições sequencialmente, nunca em paralelo, conforme exigido pela documentação do WMS
- Campos vazios são enviados como "" e não como null
- A sequência de tags nos JSONs é mantida conforme a documentação
- O token de autenticação é obrigatório para as requisições ao WMS
