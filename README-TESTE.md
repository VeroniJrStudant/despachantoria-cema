# 🧪 Guia de Teste - Sistema CEMA Imobiliária

## ✅ Correções Implementadas

### 1. **Problema do Token 401 (Unauthorized)**
- ✅ Adicionado escopo completo para OAuth2: `userinfo.profile` e `userinfo.email`
- ✅ Melhorado tratamento de erros na função `obterPerfilUsuario()`
- ✅ Adicionado debug detalhado para identificar problemas
- ✅ Implementado limpeza automática de token inválido

### 2. **Problema de Envio para Google Sheets**
- ✅ Convertido todas as funções para usar OAuth2 em vez de API Key
- ✅ Corrigido headers de autorização em todas as requisições
- ✅ Implementado processamento automático do callback OAuth2

### 3. **Problema de Persistência de Configurações**
- ✅ Mantido sistema de localStorage para ID da planilha
- ✅ Removido dependência de API Key (agora usa apenas OAuth2)

## 🚀 Como Testar

### Passo 1: Configuração Inicial
1. Abra o arquivo `index.html` no navegador
2. Preencha o **Client ID OAuth2** no campo correspondente
3. Preencha o **ID da Planilha** (já está preenchido: `1U0YVc5vJb5DgNx7-FhO-po8gG2NYwf3nQsIV_6HuXb0`)

### Passo 2: Login OAuth2
1. Clique em **"🔐 Fazer Login com Google"**
2. Autorize o aplicativo no Google
3. Verifique se retorna para a página sem erros

### Passo 3: Teste de Autenticação
1. Clique no botão **"🧪 Testar Autenticação"**
2. Verifique o console do navegador (F12) para logs detalhados
3. Deve aparecer: "Token válido! Autenticação funcionando."

### Passo 4: Teste Manual no Console
Abra o console do navegador (F12) e execute:
```javascript
// Teste individual
testarToken()

// Teste completo
executarTestesCompletos()
```

### Passo 5: Teste de Envio de Dados
1. Adicione alguns dados na tabela
2. Clique em **"📤 Enviar para Google Sheets"**
3. Verifique se aparece: "Dados enviados com sucesso para Google Sheets!"

## 🔍 Logs de Debug

O sistema agora gera logs detalhados no console:
- Processamento do callback OAuth2
- Verificação de token salvo
- Tentativas de obter perfil do usuário
- Status das requisições para Google Sheets

## ⚠️ Possíveis Problemas e Soluções

### Erro 401: Unauthorized
- **Causa**: Token expirado ou inválido
- **Solução**: Faça logout e login novamente

### Erro: "Por favor, faça login com Google primeiro"
- **Causa**: Token não foi processado corretamente
- **Solução**: Recarregue a página e faça login novamente

### Erro: "redirect_uri_mismatch"
- **Causa**: URI de redirecionamento não cadastrado no Google Cloud
- **Solução**: Adicione o URI correto no Google Cloud Console

## 📋 Checklist de Verificação

- [ ] Client ID OAuth2 configurado
- [ ] ID da planilha preenchido
- [ ] Login realizado com sucesso
- [ ] Token válido (teste de autenticação passa)
- [ ] Dados podem ser enviados para Google Sheets
- [ ] Dados podem ser carregados do Google Sheets

## 🎯 Resultado Esperado

Após todos os testes, você deve conseguir:
1. ✅ Fazer login com Google OAuth2
2. ✅ Ver seu nome e email na interface
3. ✅ Enviar dados para a planilha Google Sheets
4. ✅ Carregar dados da planilha
5. ✅ Criar novas planilhas automaticamente

Se todos os testes passarem, o sistema está funcionando corretamente! 🎉 