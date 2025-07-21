// Boas práticas: Encapsulamento, comentários e organização modular
// Este script manipula a tabela de serviços, integra com Google Sheets e atualiza o resumo financeiro.
(function() {
  // Array para armazenar os parceiros
  let parceiros = [];
  
  // Configurações OAuth2
  let accessToken = null;
  let userProfile = null;
  
  // Configuração do Google OAuth2
  const GOOGLE_OAUTH_CONFIG = {
    clientId: '',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    redirectUri: window.location.origin + window.location.pathname
  };
  console.log(GOOGLE_OAUTH_CONFIG);
  
  const servicosValores = {
    "Registro com financiamento": 800.0,
    "Registro à vista": 500.0,
    Averbação: 300.0,
    "Guia de Laudêmio do SPU": 100.0,
    "Laudêmio da prefeitura": 700.0,
    "Laudêmio das famílias": 700.0,
    "Laudêmio do São Bento": 700.0,
    "Laudêmio da Igreja da Glória": 700.0,
    "Laudêmio da Mitra": 700.0,
    "Emissão de guia de ITBI": 100.0,
    "Emissão de certidão por nome": 100.0,
    "Transferência de conta": 100.0,
  };

  // Função para mostrar alertas de sucesso personalizados
  function mostrarAlertaSucesso(titulo, mensagem, detalhes = "") {
    const alertaCompleto = `🎉 ${titulo}\n\n${mensagem}${detalhes ? '\n\n' + detalhes : ''}\n\n✅ Operação realizada com êxito!`;
    alert(alertaCompleto);
  }

  // Função para mostrar status com alerta de sucesso
  function mostrarStatus(mensagem, tipo = "info") {
    const statusDiv = document.getElementById("status");
    
    if (!statusDiv) {
      console.error("Elemento status não encontrado!");
      return;
    }
    
    statusDiv.textContent = mensagem;
    statusDiv.className = `status ${tipo}`;
    statusDiv.style.display = "block";

    // Adicionar alerta de sucesso para operações importantes
    if (tipo === "success") {
      // Mostrar alerta nativo do navegador
      setTimeout(() => {
        alert(`✅ Sucesso!\n\n${mensagem}\n\nOperação realizada com êxito!`);
      }, 1000);
    }

    // Auto-ocultar após 5 segundos
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 5000);
  }

  // Funções OAuth2
  function iniciarLoginOAuth2() {
    const clientId = document.getElementById("clientId").value.trim();
    
    if (!clientId) {
      mostrarStatus("Por favor, configure o Client ID OAuth2 primeiro", "error");
      return;
    }
    
    GOOGLE_OAUTH_CONFIG.clientId = clientId;
    
    // Gerar state para segurança
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    
    // Construir URL de autorização
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', GOOGLE_OAUTH_CONFIG.redirectUri);
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_CONFIG.scope);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    
    // Redirecionar para autorização
    window.location.href = authUrl.toString();
  }

  function processarCallbackOAuth2() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessTokenParam = params.get('access_token');
    const stateParam = params.get('state');
    const errorParam = params.get('error');
    
    const savedState = sessionStorage.getItem('oauth_state');
    
    if (errorParam) {
      mostrarStatus(`Erro na autenticação: ${errorParam}`, "error");
      return;
    }
    
    if (stateParam !== savedState) {
      mostrarStatus("Erro de segurança na autenticação", "error");
      return;
    }
    
    if (accessTokenParam) {
      accessToken = accessTokenParam;
      sessionStorage.setItem('oauth_access_token', accessToken);
      sessionStorage.removeItem('oauth_state');
      
      // Limpar hash da URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Obter informações do usuário
      obterPerfilUsuario();
      
      const mensagemSucesso = `Login realizado com sucesso!\n\nToken de acesso obtido\nSessão iniciada\nRedirecionando...`;
      mostrarStatus(mensagemSucesso, "success");
    }
  }

  async function obterPerfilUsuario() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        userProfile = await response.json();
        atualizarInterfaceUsuario();
        salvarConfiguracoes();
      }
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
    }
  }

  function atualizarInterfaceUsuario() {
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    const userInfo = document.getElementById("userInfo");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    
    if (accessToken && userProfile) {
      loginButton.style.display = "none";
      logoutButton.style.display = "inline-block";
      userInfo.style.display = "block";
      
      userName.textContent = userProfile.name || "Usuário";
      userEmail.textContent = userProfile.email || "";
    } else {
      loginButton.style.display = "inline-block";
      logoutButton.style.display = "none";
      userInfo.style.display = "none";
    }
  }

  function fazerLogout() {
    accessToken = null;
    userProfile = null;
    sessionStorage.removeItem('oauth_access_token');
    
    atualizarInterfaceUsuario();
    const mensagemSucesso = `Logout realizado com sucesso!\n\nSessão encerrada\nToken removido\nInterface atualizada`;
    mostrarStatus(mensagemSucesso, "success");
  }

  function verificarTokenSalvo() {
    const savedToken = sessionStorage.getItem('oauth_access_token');
    if (savedToken) {
      accessToken = savedToken;
      obterPerfilUsuario();
    }
  }

  // Funções para gerenciar parceiros
  function adicionarParceiro() {
    const nome = document.getElementById("partnerName").value.trim();
    const percentual = parseFloat(document.getElementById("partnerPercentage").value);

    if (!nome) {
      mostrarStatus("Por favor, insira o nome do parceiro", "error");
      return;
    }

    if (isNaN(percentual) || percentual <= 0 || percentual > 100) {
      mostrarStatus("Por favor, insira um percentual válido (0-100)", "error");
      return;
    }

    // Verificar se o nome já existe
    if (parceiros.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
      mostrarStatus("Já existe um parceiro com este nome", "error");
      return;
    }

    // Calcular percentual total atual
    const percentualTotal = parceiros.reduce((total, p) => total + p.percentual, 0) + percentual;
    
    if (percentualTotal > 35) {
      mostrarStatus(`Percentual total excede 35%. Atual: ${percentualTotal.toFixed(2)}%`, "error");
      return;
    }

    // Adicionar parceiro
    parceiros.push({ nome, percentual });
    
    // Limpar campos
    document.getElementById("partnerName").value = "";
    document.getElementById("partnerPercentage").value = "";
    
    // Atualizar interface
    atualizarInterfaceParceiros();
    calcularValores();
    salvarParceiros();
    
    // Mostrar alerta de sucesso detalhado
    const mensagemSucesso = `Parceiro "${nome}" adicionado com sucesso!\n\nPercentual: ${percentual}%\nTotal de parceiros: ${parceiros.length}\nPercentual total: ${percentualTotal.toFixed(2)}%`;
    mostrarStatus(mensagemSucesso, "success");
  }

  function removerParceiro(nome) {
    parceiros = parceiros.filter(p => p.nome !== nome);
    atualizarInterfaceParceiros();
    calcularValores();
    salvarParceiros();
    mostrarStatus(`Parceiro "${nome}" removido!`, "success");
  }

  function atualizarInterfaceParceiros() {
    const partnersList = document.getElementById("partnersList");
    
    if (!partnersList) {
      console.error("Elemento partnersList não encontrado!");
      return;
    }
    
    partnersList.innerHTML = "";

    parceiros.forEach(parceiro => {
      const partnerItem = document.createElement("div");
      partnerItem.className = "partner-item";
      partnerItem.innerHTML = `
        <span class="partner-name">${parceiro.nome}</span>
        <span class="partner-percentage">${parceiro.percentual}%</span>
        <button class="remove-partner" onclick="removerParceiro('${parceiro.nome}')">×</button>
      `;
      partnersList.appendChild(partnerItem);
    });
  }

  function salvarParceiros() {
    localStorage.setItem("cema_parceiros", JSON.stringify(parceiros));
  }

  function carregarParceiros() {
    const parceirosSalvos = localStorage.getItem("cema_parceiros");
    
    if (parceirosSalvos) {
      parceiros = JSON.parse(parceirosSalvos);
      atualizarInterfaceParceiros();
    }
  }

  function adicionarLinha() {
    const tbody = document.getElementById("corpoTabela");
    
    if (!tbody) {
      console.log("Elemento corpoTabela não encontrado, pulando adição de linha");
      return;
    }
    
    const novaLinha = document.createElement("tr");

    novaLinha.innerHTML = `
                <td><input type="date" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Nome do comprador" onchange="calcularValores()"></td>
                <td><input type="tel" placeholder="(00) 00000-0000" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Nome do vendedor" onchange="calcularValores()"></td>
                <td><input type="tel" placeholder="(00) 00000-0000" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Endereço completo" onchange="calcularValores()"></td>
                <td>
                    <select onchange="atualizarValor(this); calcularValores()">
                        <option value="">Selecione o serviço</option>
                        <option value="Registro com financiamento">Registro com financiamento</option>
                        <option value="Registro à vista">Registro à vista</option>
                        <option value="Averbação">Averbação</option>
                        <option value="Guia de Laudêmio do SPU">Guia de Laudêmio do SPU</option>
                        <option value="Laudêmio da prefeitura">Laudêmio da prefeitura</option>
                        <option value="Laudêmio das famílias">Laudêmio das famílias</option>
                        <option value="Laudêmio do São Bento">Laudêmio do São Bento</option>
                        <option value="Laudêmio da Igreja da Glória">Laudêmio da Igreja da Glória</option>
                        <option value="Laudêmio da Mitra">Laudêmio da Mitra</option>
                        <option value="Emissão de guia de ITBI">Emissão de guia de ITBI</option>
                        <option value="Emissão de certidão por nome">Emissão de certidão por nome</option>
                        <option value="Transferência de conta">Transferência de conta</option>
                    </select>
                </td>
                <td><input type="text" placeholder="Número do contrato" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="RGI" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Número do protocolo" onchange="calcularValores()"></td>
                <td><input type="number" step="0.01" class="valor-field" placeholder="0,00" onchange="calcularValores()"></td>
                <td><input type="number" step="0.01" class="valor-field" placeholder="0,00" onchange="calcularValores()"></td>
                <td class="valor-field" style="background-color: #e8f5e8;">R$ 0,00</td>
                <td class="valor-field" style="background-color: #f0f8ff;">R$ 0,00</td>
                <td><button onclick="removerLinha(this)" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Remover</button></td>
            `;

    tbody.appendChild(novaLinha);
  }

  function atualizarValor(selectElement) {
    const linha = selectElement.closest("tr");
    const inputValor = linha.querySelector('input[type="number"]');
    const servicoSelecionado = selectElement.value;

    if (servicoSelecionado && servicosValores[servicoSelecionado]) {
      inputValor.value = servicosValores[servicoSelecionado].toFixed(2);
    }
  }

  function removerLinha(botao) {
    const linha = botao.closest("tr");
    linha.remove();
    calcularValores();
  }

  function calcularValores() {
    const linhas = document.querySelectorAll("#corpoTabela tr");
    let totalFaturado = 0;
    let totalDespesas = 0;

    if (linhas.length === 0) {
      console.log("Nenhuma linha encontrada na tabela, pulando cálculo");
      return;
    }

    linhas.forEach((linha) => {
      const inputValor = linha.querySelector('input[type="number"]');
      const inputDespesas = linha.querySelectorAll('input[type="number"]')[1];
      
      if (!inputValor || !inputDespesas) {
        console.log("Inputs de valor não encontrados na linha, pulando");
        return;
      }
      
      const valorCobrado = parseFloat(inputValor.value) || 0;
      const despesas = parseFloat(inputDespesas.value) || 0;

      totalFaturado += valorCobrado;
      totalDespesas += despesas;

      // Cálculo dos percentuais
      const valorCema = valorCobrado * 0.65 - despesas;
      const valorParceiros = valorCobrado * 0.35 + despesas;

      // Atualizar as células de valores calculados
      const valorFields = linha.querySelectorAll(".valor-field");
      if (valorFields.length >= 4) {
        valorFields[2].textContent = `R$ ${valorCema.toFixed(2)}`;
        valorFields[3].textContent = `R$ ${valorParceiros.toFixed(2)}`;
      }
    });

    // Atualizar resumo apenas se os elementos existirem
    const totalLiquido = totalFaturado - totalDespesas;
    const cemaBruto = totalFaturado * 0.65;
    const cemaLiquido = cemaBruto - totalDespesas;
    const parceirosBase = totalFaturado * 0.35;
    const parceirosTotal = parceirosBase + totalDespesas;

    const totalFaturadoElement = document.getElementById("totalFaturado");
    const totalDespesasElement = document.getElementById("totalDespesas");
    const totalLiquidoElement = document.getElementById("totalLiquido");
    const cemaBrutoElement = document.getElementById("cemaBruto");
    const cemaDespesasElement = document.getElementById("cemaDespesas");
    const cemaLiquidoElement = document.getElementById("cemaLiquido");

    if (totalFaturadoElement) totalFaturadoElement.textContent = `R$ ${totalFaturado.toFixed(2)}`;
    if (totalDespesasElement) totalDespesasElement.textContent = `R$ ${totalDespesas.toFixed(2)}`;
    if (totalLiquidoElement) totalLiquidoElement.textContent = `R$ ${totalLiquido.toFixed(2)}`;
    if (cemaBrutoElement) cemaBrutoElement.textContent = `R$ ${cemaBruto.toFixed(2)}`;
    if (cemaDespesasElement) cemaDespesasElement.textContent = `R$ ${totalDespesas.toFixed(2)}`;
    if (cemaLiquidoElement) cemaLiquidoElement.textContent = `R$ ${cemaLiquido.toFixed(2)}`;

    // Atualizar resumo dos parceiros
    atualizarResumoParceiros(totalFaturado, totalDespesas);
  }

  function atualizarResumoParceiros(totalFaturado, totalDespesas) {
    const partnersSummary = document.getElementById("partnersSummary");
    
    if (!partnersSummary) {
      console.error("Elemento partnersSummary não encontrado!");
      return;
    }
    
    partnersSummary.innerHTML = "";

    if (parceiros.length === 0) {
      partnersSummary.innerHTML = `
        <div class="partner-summary-item">
          <span class="partner-summary-name">Sem parceiros cadastrados</span>
          <span class="partner-summary-value">R$ 0,00</span>
        </div>
      `;
      return;
    }

    // Calcular valores por parceiro
    const valorBaseParceiros = totalFaturado * 0.35;
    const despesasPorParceiro = totalDespesas / parceiros.length;

    parceiros.forEach(parceiro => {
      const valorBase = valorBaseParceiros * (parceiro.percentual / 35);
      const valorTotal = valorBase + despesasPorParceiro;

      const partnerItem = document.createElement("div");
      partnerItem.className = "partner-summary-item";
      partnerItem.innerHTML = `
        <span class="partner-summary-name">${parceiro.nome} (${parceiro.percentual}%)</span>
        <span class="partner-summary-value">R$ ${valorTotal.toFixed(2)}</span>
      `;
      partnersSummary.appendChild(partnerItem);
    });

    // Adicionar total dos parceiros
    const totalParceiros = valorBaseParceiros + totalDespesas;
    const totalItem = document.createElement("div");
    totalItem.className = "partner-summary-item";
    totalItem.style.borderTop = "2px solid #27ae60";
    totalItem.style.marginTop = "10px";
    totalItem.style.paddingTop = "10px";
    totalItem.innerHTML = `
      <span class="partner-summary-name"><strong>Total Parceiros</strong></span>
      <span class="partner-summary-value"><strong>R$ ${totalParceiros.toFixed(2)}</strong></span>
    `;
    partnersSummary.appendChild(totalItem);
  }

  async function enviarParaGoogleSheets() {
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const mesAno = document.getElementById("mes").selectedOptions[0].text;

    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Google primeiro", "error");
      return;
    }

    if (!spreadsheetId) {
      mostrarStatus("Por favor, configure o ID da planilha", "error");
      return;
    }

    mostrarStatus("Enviando dados para Google Sheets...", "info");

    try {
      // Preparar os dados
      const dados = [];

      // Cabeçalho
      dados.push([
        "Data",
        "Cliente Comprador",
        "Tel. Comprador",
        "Cliente Vendedor",
        "Tel. Vendedor",
        "Endereço Imóvel",
        "Tipo de Serviço",
        "Contrato",
        "RGI",
        "Protocolo",
        "Valor Cobrado",
        "Despesas",
        "CEMA (65%)",
        "Parceiros (35%)",
        "Mês/Ano",
        "Parceiros Configurados"
      ]);

      // Dados das linhas
      const linhas = document.querySelectorAll("#corpoTabela tr");
      linhas.forEach((linha) => {
        const inputs = linha.querySelectorAll("input, select");
        const valorCobrado = parseFloat(inputs[10].value) || 0;
        const despesas = parseFloat(inputs[11].value) || 0;

        if (valorCobrado > 0) {
          const valorCema = valorCobrado * 0.65 - despesas;
          const valorParceiros = valorCobrado * 0.35 + despesas;

          dados.push([
            inputs[0].value, // Data
            inputs[1].value, // Comprador
            inputs[2].value, // Tel Comprador
            inputs[3].value, // Vendedor
            inputs[4].value, // Tel Vendedor
            inputs[5].value, // Endereço
            inputs[6].value, // Serviço
            inputs[7].value, // Contrato
            inputs[8].value, // RGI
            inputs[9].value, // Protocolo
            valorCobrado,
            despesas,
            valorCema,
            valorParceiros,
            mesAno,
            parceiros.map(p => `${p.nome} (${p.percentual}%)`).join(", ") || "Nenhum"
          ]);
        }
      });

      // Criar ou atualizar a aba
      const sheetName = mesAno.replace(" ", "_");

      // Primeiro, tentar criar a aba
      try {
        const createSheetResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName,
                    },
                  },
                },
              ],
            }),
          },
        );
      } catch (error) {
        // Aba já existe, continuar
      }

      // Enviar dados para a aba
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:clear`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        },
      );

      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            values: dados,
          }),
        },
      );

      if (updateResponse.ok) {
        const mensagemSucesso = `Dados enviados com sucesso para Google Sheets!\n\nPlanilha: ${spreadsheetId}\nMês: ${mesAno}\nRegistros enviados: ${dados.length - 1}\nAba criada: ${sheetName}`;
        mostrarStatus(mensagemSucesso, "success");
      } else {
        const error = await updateResponse.json();
        mostrarStatus(`Erro ao enviar dados: ${error.error.message}`, "error");
      }
    } catch (error) {
      mostrarStatus(
        `Erro ao conectar com Google Sheets: ${error.message}`,
        "error",
      );
    }
  }

  async function carregarDadosGoogleSheets() {
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const mesAno = document.getElementById("mes").selectedOptions[0].text;

    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Google primeiro", "error");
      return;
    }

    if (!spreadsheetId) {
      mostrarStatus("Por favor, configure o ID da planilha", "error");
      return;
    }

    mostrarStatus("Carregando dados do Google Sheets...", "info");

    try {
      const sheetName = mesAno.replace(" ", "_");

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:O1000`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.values && data.values.length > 1) {
          // Limpar tabela atual
          document.getElementById("corpoTabela").innerHTML = "";

          // Pular cabeçalho (primeira linha)
          const rows = data.values.slice(1);

          rows.forEach((row) => {
            if (row.length > 0 && row[0]) {
              // Se tem data
              const tbody = document.getElementById("corpoTabela");
              const novaLinha = document.createElement("tr");

              novaLinha.innerHTML = `
                                    <td><input type="date" value="${
                                      row[0] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[1] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="tel" value="${
                                      row[2] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[3] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="tel" value="${
                                      row[4] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[5] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td>
                                        <select onchange="atualizarValor(this); calcularValores()">
                                            <option value="">Selecione o serviço</option>
                                            <option value="Registro com financiamento" ${
                                              row[6] ===
                                              "Registro com financiamento"
                                                ? "selected"
                                                : ""
                                            }>Registro com financiamento</option>
                                            <option value="Registro à vista" ${
                                              row[6] === "Registro à vista"
                                                ? "selected"
                                                : ""
                                            }>Registro à vista</option>
                                            <option value="Averbação" ${
                                              row[6] === "Averbação"
                                                ? "selected"
                                                : ""
                                            }>Averbação</option>
                                            <option value="Guia de Laudêmio do SPU" ${
                                              row[6] ===
                                              "Guia de Laudêmio do SPU"
                                                ? "selected"
                                                : ""
                                            }>Guia de Laudêmio do SPU</option>
                                            <option value="Laudêmio da prefeitura" ${
                                              row[6] ===
                                              "Laudêmio da prefeitura"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio da prefeitura</option>
                                            <option value="Laudêmio das famílias" ${
                                              row[6] === "Laudêmio das famílias"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio das famílias</option>
                                            <option value="Laudêmio do São Bento" ${
                                              row[6] === "Laudêmio do São Bento"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio do São Bento</option>
                                            <option value="Laudêmio da Igreja da Glória" ${
                                              row[6] ===
                                              "Laudêmio da Igreja da Glória"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio da Igreja da Glória</option>
                                            <option value="Laudêmio da Mitra" ${
                                              row[6] === "Laudêmio da Mitra"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio da Mitra</option>
                                            <option value="Emissão de guia de ITBI" ${
                                              row[6] ===
                                              "Emissão de guia de ITBI"
                                                ? "selected"
                                                : ""
                                            }>Emissão de guia de ITBI</option>
                                            <option value="Emissão de certidão por nome" ${
                                              row[6] ===
                                              "Emissão de certidão por nome"
                                                ? "selected"
                                                : ""
                                            }>Emissão de certidão por nome</option>
                                            <option value="Transferência de conta" ${
                                              row[6] ===
                                              "Transferência de conta"
                                                ? "selected"
                                                : ""
                                            }>Transferência de conta</option>
                                        </select>
                                    </td>
                                    <td><input type="text" value="${
                                      row[7] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[8] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[9] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="number" step="0.01" class="valor-field" value="${
                                      row[10] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="number" step="0.01" class="valor-field" value="${
                                      row[11] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td class="valor-field" style="background-color: #e8f5e8;">R$ 0,00</td>
                                    <td class="valor-field" style="background-color: #f0f8ff;">R$ 0,00</td>
                                    <td><button onclick="removerLinha(this)" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Remover</button></td>
                                `;

              tbody.appendChild(novaLinha);
            }
          });

          calcularValores();
          mostrarStatus(
            "Dados carregados com sucesso do Google Sheets!",
            "success",
          );
        } else {
          mostrarStatus("Nenhum dado encontrado para este mês", "info");
        }
      } else {
        const error = await response.json();
        mostrarStatus(`Erro ao carregar dados: ${error.error.message}`, "error");
      }
    } catch (error) {
      mostrarStatus(
        `Erro ao conectar com Google Sheets: ${error.message}`,
        "error",
      );
    }
  }

  // Função para criar a planilha automaticamente
  async function criarPlanilhaAutomatica() {
    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Google primeiro", "error");
      return;
    }

    mostrarStatus("Criando nova planilha...", "info");

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            properties: {
              title: "CEMA Imobiliária - Controle Financeiro",
            },
            sheets: [
              {
                properties: {
                  title: "Configuração",
                },
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        document.getElementById("spreadsheetId").value = data.spreadsheetId;

        // Criar cabeçalho na aba de configuração
        const configData = [
          ["CEMA IMOBILIÁRIA - CONTROLE FINANCEIRO"],
          [""],
          ["Esta planilha foi criada automaticamente pelo sistema."],
          ["Cada mês será criado em uma aba separada."],
          [""],
          ["Link da planilha:", data.spreadsheetUrl],
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}/values/Configuração!A1?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: configData,
            }),
          },
        );

        const mensagemSucesso = `Planilha criada com sucesso!\n\nID da Planilha: ${data.spreadsheetId}\nTítulo: CEMA Imobiliária - Controle Financeiro\nLink: ${data.spreadsheetUrl}\n\nA planilha foi configurada automaticamente!`;
        mostrarStatus(mensagemSucesso, "success");
      } else {
        const error = await response.json();
        mostrarStatus(`Erro ao criar planilha: ${error.error.message}`, "error");
      }
    } catch (error) {
      mostrarStatus(`Erro ao criar planilha: ${error.message}`, "error");
    }
  }

  // Função para salvar configurações no localStorage
  function salvarConfiguracoes() {
    const spreadsheetId = document.getElementById("spreadsheetId").value;

    if (spreadsheetId) {
      localStorage.setItem("cema_spreadsheet_id", spreadsheetId);
    }
  }

  // Função para carregar configurações do localStorage
  function carregarConfiguracoes() {
    const spreadsheetId = localStorage.getItem("cema_spreadsheet_id");

    if (spreadsheetId) {
      const element = document.getElementById("spreadsheetId");
      if (element) {
        element.value = spreadsheetId;
      }
    }
  }

  // Event listeners para salvar configurações
  const spreadsheetIdElement = document.getElementById("spreadsheetId");
  if (spreadsheetIdElement) {
    spreadsheetIdElement.addEventListener("change", salvarConfiguracoes);
  }

  // Salvar parceiros quando modificados
  function salvarParceirosAposModificacao() {
    salvarParceiros();
  }

  // Função para formatar data brasileira
  function formatarDataBrasileira(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  // Função para converter data brasileira para formato ISO
  function converterDataParaISO(data) {
    if (!data) return "";
    const [dia, mes, ano] = data.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  // Função para exportar relatório completo
  async function exportarRelatorioCompleto() {
    const spreadsheetId = document.getElementById("spreadsheetId").value;

    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Google primeiro", "error");
      return;
    }

    if (!spreadsheetId) {
      mostrarStatus("Configure o ID da planilha primeiro", "error");
      return;
    }

    mostrarStatus("Gerando relatório completo...", "info");

    try {
      // Criar aba de relatório
      const relatorioData = [];

      // Cabeçalho do relatório
      relatorioData.push(["CEMA IMOBILIÁRIA - RELATÓRIO ANUAL"]);
      relatorioData.push(["Gerado em:", new Date().toLocaleDateString("pt-BR")]);
      relatorioData.push([]);

      // Resumo por mês
      relatorioData.push(["RESUMO POR MÊS"]);
      relatorioData.push([
        "Mês",
        "Total Faturado",
        "Total Despesas",
        "Líquido",
        "CEMA",
        "Felipe",
      ]);

      // Aqui você pode adicionar lógica para buscar dados de todos os meses

      // Tabela de serviços
      relatorioData.push([]);
      relatorioData.push(["TABELA DE SERVIÇOS"]);
      relatorioData.push(["Serviço", "Valor"]);

      Object.entries(servicosValores).forEach(([servico, valor]) => {
        relatorioData.push([servico, valor]);
      });

      // Criar/atualizar aba de relatório
      const sheetName = "Relatório_Anual";

      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName,
                    },
                  },
                },
              ],
            }),
          },
        );
      } catch (error) {
        // Aba já existe
      }

      // Limpar e adicionar dados
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:clear`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        },
      );

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            values: relatorioData,
          }),
        },
      );

      if (response.ok) {
        const mensagemSucesso = `Relatório completo gerado com sucesso!\n\nPlanilha: ${spreadsheetId}\nAba: Relatório_Anual\nData: ${new Date().toLocaleDateString("pt-BR")}\n\nO relatório está disponível na planilha!`;
        mostrarStatus(mensagemSucesso, "success");
      } else {
        throw new Error("Erro ao gerar relatório");
      }
    } catch (error) {
      mostrarStatus(`Erro ao gerar relatório: ${error.message}`, "error");
    }
  }

  // Inicialização
  document.addEventListener("DOMContentLoaded", function () {
    carregarConfiguracoes();
    carregarParceiros();
    adicionarLinha();

    // Definir mês atual
    const hoje = new Date();
    const mesAtual =
      hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0");
    const mesElement = document.getElementById("mes");
    if (mesElement) {
      mesElement.value = mesAtual;
    }
    
    // Calcular valores iniciais
    setTimeout(() => {
      calcularValores();
    }, 100);

    // Processar callback OAuth2
    processarCallbackOAuth2();
    
    // Verificar token salvo
    verificarTokenSalvo();
  });

  // Adicionar botão para criar nova planilha
  document.addEventListener("DOMContentLoaded", function() {
    const configSection = document.querySelector(".config-section");
    if (configSection) {
      configSection.innerHTML += `
            <div style="margin-top: 15px;">
                <button class="btn btn-add" onclick="criarPlanilhaAutomatica()">🆕 Criar Nova Planilha</button>
                <button class="btn btn-sync" onclick="exportarRelatorioCompleto()">📊 Gerar Relatório Completo</button>
            </div>
        `;
    }
  });

  // Expor funções para o escopo global
  window.adicionarParceiro = adicionarParceiro;
  window.removerParceiro = removerParceiro;
  window.adicionarLinha = adicionarLinha;
  window.atualizarValor = atualizarValor;
  window.removerLinha = removerLinha;
  window.calcularValores = calcularValores;
  window.enviarParaGoogleSheets = enviarParaGoogleSheets;
  window.carregarDadosGoogleSheets = carregarDadosGoogleSheets;
  window.criarPlanilhaAutomatica = criarPlanilhaAutomatica;
  window.exportarRelatorioCompleto = exportarRelatorioCompleto;
  window.iniciarLoginOAuth2 = iniciarLoginOAuth2;
  window.processarCallbackOAuth2 = processarCallbackOAuth2;
  window.verificarTokenSalvo = verificarTokenSalvo;
  window.fazerLogout = fazerLogout;
  window.mostrarAlertaSucesso = mostrarAlertaSucesso;
})();
