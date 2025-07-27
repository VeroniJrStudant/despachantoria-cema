# 🏢 CEMA Imobiliária - Sistema de Controle Financeiro

## 📋 Descrição

Sistema web completo para controle financeiro de serviços da CEMA Imobiliária, com integração automática ao Google Sheets. Desenvolvido para gerenciar serviços imobiliários, calcular percentuais de parceiros e gerar relatórios consolidados.

## ✨ Funcionalidades Principais

### 🔐 Autenticação e Segurança
- **Login OAuth2 com Google**: Autenticação segura via Gmail
- **Controle de Acesso**: Apenas e-mails autorizados têm acesso
- **Persistência de Sessão**: Token salvo automaticamente
- **Logout Seguro**: Limpeza completa de dados sensíveis

### 📊 Gestão de Serviços
- **Tabela Dinâmica**: Adição/remoção de linhas de serviços
- **Serviços Padrão**: 12 serviços pré-configurados (registros, laudêmios, etc.)
- **Serviços Personalizados**: Adição de novos serviços com valores customizados
- **Cálculos Automáticos**: Percentuais CEMA (65%) e Parceiros (35%)

### 🤝 Gestão de Parceiros
- **Cadastro Dinâmico**: Adição/remoção de parceiros
- **Validação de Percentuais**: Soma total deve ser 35%
- **Distribuição Automática**: Cálculo proporcional por parceiro
- **Persistência**: Dados salvos automaticamente

### 📈 Resumo Financeiro
- **Totais Automáticos**: Faturamento, despesas e líquido
- **Divisão CEMA**: 65% do faturamento
- **Divisão Parceiros**: 35% distribuído proporcionalmente
- **Atualização em Tempo Real**: Cálculos automáticos

### 🔗 Integração Google Sheets
- **Envio de Dados**: Exportação completa para planilha
- **Carregamento**: Importação de dados existentes
- **Criação Automática**: Nova planilha formatada
- **Relatórios**: Geração de relatórios anuais consolidados

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Autenticação**: Google OAuth2
- **API**: Google Sheets API v4
- **Armazenamento**: localStorage (dados locais)
- **Design**: CSS Grid, Flexbox, Gradientes
- **Responsividade**: Mobile-first design

## 📁 Estrutura do Projeto

```
cema-imobiliaria/
├── index.html              # Interface principal
├── style.css               # Estilos e responsividade
├── script.js               # Lógica JavaScript
├── config.js               # Configurações OAuth2 (privado)
├── config.example.js       # Exemplo de configuração
├── config.env              # Variáveis de ambiente
├── .gitignore              # Arquivos ignorados pelo Git
├── README.md               # Documentação
└── img/                    # Imagens e logos
    └── Logo.png           # Logo da CEMA
```

## 🚀 Instalação e Configuração

### 1. Pré-requisitos
- Conta Google com acesso ao Google Sheets
- Servidor web local (Live Server, XAMPP, etc.)
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### 2. Configuração OAuth2

#### Passo 1: Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione existente
3. Ative as APIs:
   - Google Sheets API
   - Google Drive API

#### Passo 2: Credenciais OAuth2
1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure:
   - **Application type**: Web application
   - **Name**: CEMA Imobiliária
   - **Authorized JavaScript origins**: `http://localhost:5500` (ou seu servidor)
   - **Authorized redirect URIs**: `http://localhost:5500/index.html`

#### Passo 3: Configuração Local
1. Copie `config.example.js` para `config.js`
2. Substitua as credenciais:
```javascript
const CONFIG = {
  GOOGLE_CLIENT_ID: 'SEU_CLIENT_ID_AQUI',
  GOOGLE_REDIRECT_URI: 'http://localhost:5500/index.html',
  GOOGLE_SCOPE: 'https://www.googleapis.com/auth/spreadsheets'
};
```

#### Passo 4: Usuários Autorizados
1. No Google Cloud Console, vá em "OAuth consent screen"
2. Adicione e-mails de teste em "Test users"
3. Ou publique a aplicação para acesso público

### 3. Execução
1. Clone o repositório
2. Configure o `config.js` com suas credenciais
3. Inicie um servidor local (ex: Live Server)
4. Acesse `http://localhost:5500`

## 📖 Como Usar

### 1. Primeiro Acesso
1. **Configure o Sistema**:
   - Digite seu e-mail Gmail
   - Cole o ID da planilha Google Sheets
   - Clique em "Fazer Login com Gmail"

2. **Autorize o Acesso**:
   - Siga o fluxo OAuth2 do Google
   - Autorize o acesso aos dados

### 2. Gestão de Parceiros
1. **Adicione Parceiros**:
   - Nome do parceiro
   - Percentual de participação
   - Total deve somar 35%

2. **Validação Automática**:
   - Sistema valida percentuais
   - Alertas para valores incorretos

### 3. Cadastro de Serviços
1. **Serviços Padrão**:
   - 12 serviços pré-configurados
   - Valores editáveis

2. **Serviços Personalizados**:
   - Adicione novos serviços
   - Defina valores customizados
   - Remova serviços desnecessários

### 4. Tabela de Serviços
1. **Adicione Linhas**:
   - Clique em "+ Adicionar Novo Serviço"
   - Preencha todos os campos

2. **Cálculos Automáticos**:
   - Valores CEMA (65%)
   - Valores Parceiros (35%)
   - Totais atualizados em tempo real

### 5. Integração Google Sheets
1. **Enviar Dados**:
   - Clique em "📤 Enviar para Google Sheets"
   - Dados são exportados para aba do mês

2. **Carregar Dados**:
   - Clique em "📥 Carregar do Google Sheets"
   - Dados são importados da planilha

3. **Criar Planilha**:
   - Clique em "🆕 Criar Planilha Automática"
   - Nova planilha formatada é criada

4. **Gerar Relatório**:
   - Clique em "📊 Gerar Relatório"
   - Relatório anual consolidado

## 🔧 Configurações Avançadas

### Personalização de Serviços
```javascript
// Adicionar novo serviço
const servicosValores = {
  "Meu Serviço": 500.00,
  // ... outros serviços
};
```

### Modificação de Percentuais
```javascript
// Alterar divisão CEMA/Parceiros
const percentualCEMA = 0.65; // 65%
const percentualParceiros = 0.35; // 35%
```

### Estilização CSS
```css
/* Personalizar cores */
:root {
  --primary-color: #B71419;
  --secondary-color: #3498db;
  --success-color: #27ae60;
}
```

## 🚨 Troubleshooting

### Erro "invalid_client"
- Verifique se o Client ID está correto no `config.js`
- Confirme se as URIs autorizadas estão configuradas

### Erro "redirect_uri_mismatch"
- Verifique se a URI de redirecionamento está correta
- Confirme se o domínio está autorizado

### Serviços não aparecem
- Verifique se a API Google Sheets está ativada
- Confirme se o token de acesso é válido

### Dados não salvam
- Verifique se o localStorage está habilitado
- Confirme se não há bloqueadores de cookies

## 📊 Estrutura de Dados

### Serviços Padrão
- Registro com financiamento: R$ 800,00
- Registro à vista: R$ 500,00
- Averbação: R$ 300,00
- Guia de Laudêmio do SPU: R$ 100,00
- Laudêmio da prefeitura: R$ 700,00
- Laudêmio das famílias: R$ 700,00
- Laudêmio do São Bento: R$ 700,00
- Laudêmio da Igreja da Glória: R$ 700,00
- Laudêmio da Mitra: R$ 700,00
- Emissão de guia de ITBI: R$ 100,00
- Emissão de certidão por nome: R$ 100,00
- Transferência de conta: R$ 100,00

### Divisão Financeira
- **CEMA**: 65% do faturamento
- **Parceiros**: 35% do faturamento
- **Despesas**: Deduzidas do percentual CEMA

## 🔒 Segurança

### Dados Sensíveis
- Credenciais OAuth2 em arquivo separado
- Token de acesso em sessionStorage
- Dados locais em localStorage

### Controle de Acesso
- Autenticação obrigatória
- Lista de e-mails autorizados
- Logout automático por inatividade

### Proteção de Dados
- Validação de entrada
- Sanitização de dados
- Criptografia de tokens

## 📱 Responsividade

### Breakpoints
- **Desktop**: > 1200px
- **Tablet**: 768px - 1199px
- **Mobile**: < 767px

### Funcionalidades Mobile
- Interface adaptativa
- Botões otimizados para touch
- Scroll horizontal em tabelas

## 🚀 Deploy

### GitHub Pages
1. Faça push para o repositório
2. Configure GitHub Pages
3. Atualize URIs autorizadas no Google Cloud Console

### Servidor Web
1. Faça upload dos arquivos
2. Configure HTTPS (obrigatório para OAuth2)
3. Atualize URIs autorizadas

### Vercel/Netlify
1. Conecte o repositório
2. Configure variáveis de ambiente
3. Deploy automático

## 🤝 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### Padrões de Código
- JavaScript ES6+
- CSS com BEM methodology
- HTML semântico
- Comentários em português

## 📄 Licença

Este projeto é desenvolvido para uso exclusivo da CEMA Imobiliária.

## 👥 Desenvolvimento

### Desenvolvedor
- **Nome**: [Seu Nome]
- **Especialidade**: Frontend Development
- **Contato**: [seu-email@exemplo.com]

### Cliente
- **Empresa**: CEMA Imobiliária
- **Setor**: Imobiliário
- **Localização**: [Cidade/Estado]

## 📞 Suporte

Para suporte técnico ou dúvidas:
- **Email**: [suporte@exemplo.com]
- **Telefone**: [número]
- **Horário**: Segunda a Sexta, 8h às 18h

---

**Versão**: 1.0.0  
**Última Atualização**: Janeiro 2025  
**Status**: ✅ Produção 