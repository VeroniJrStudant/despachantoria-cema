(function() {
  let parceiros = [];
  
  let accessToken = null;
  let userProfile = null;
  
  const EMAILS_AUTORIZADOS = [
    'adm@cemaimobiliaria.com.br',
    'laiza@cemaimobiliaria.com.br',
    'veroni@cemaimobiliaria.com.br'
  ];
  
  function verificarEmailAutorizado(email) {
    if (!email) return false;
    return EMAILS_AUTORIZADOS.includes(email.toLowerCase());
  }
  
  function obterClientIdPorEmail(email) {
    const isAutorizado = verificarEmailAutorizado(email);
    
    if (isAutorizado) {
      return CONFIG.GOOGLE_CLIENT_ID;
    } else {
      return CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO;
    }
  }
  
  function controlarAcessoPorEmail(email) {
    const isAutorizado = verificarEmailAutorizado(email);
    
    const botoesParaDesabilitar = [
      'criarCopiaPlanilhaComLimpeza',
      'exportarRelatorioCompleto',
      'adicionarNovoServico',
      'removerServicoAdicionado'  
    ];
    
    botoesParaDesabilitar.forEach(selector => {
      const botoes = document.querySelectorAll(`[onclick*="${selector}"]`);
      botoes.forEach(botao => {
        if (!isAutorizado) {
          botao.disabled = true;
          botao.style.opacity = '0.5';
          botao.style.cursor = 'not-allowed';
          botao.title = 'Acesso restrito - Apenas emails autorizados';
        } else {
          botao.disabled = false;
          botao.style.opacity = '1';
          botao.style.cursor = 'pointer';
          botao.title = '';
        }
      });
    });
    
    const googleCloudLinks = document.querySelectorAll('a[href*="console.cloud.google.com"]');
    googleCloudLinks.forEach(link => {
      if (!isAutorizado) {
        link.classList.add('disabled');
        link.title = 'Acesso restrito - Apenas emails autorizados';
        link.removeAttribute('href');
        link.removeAttribute('target');
      } else {
        link.classList.remove('disabled');
        link.title = '';
        link.href = 'https://console.cloud.google.com';
        link.target = '_blank';
      }
    });
    
    const devSection = document.querySelector('.dev-section');
    if (devSection) {
      if (!isAutorizado) {
        devSection.style.display = 'none';
      } else {
        devSection.style.display = 'block';
      }
    }
    
    if (!isAutorizado && email) {
      const clientId = obterClientIdPorEmail(email);
      mostrarStatus(`Acesso limitado para ${email}. Usando Client ID: ${clientId}`, "info");
    }
  }

  if (typeof CONFIG === 'undefined') {
    console.error('CONFIG não está definido. Verifique se config.js foi carregado corretamente.');
    window.CONFIG = {
      GOOGLE_CLIENT_ID: '',
      GOOGLE_REDIRECT_URI: 'https://despachante.cemaimobiliaria.com.br/',
      GOOGLE_SCOPE: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive'
    };
  }

  const GOOGLE_OAUTH_CONFIG = {
    clientId: CONFIG.GOOGLE_CLIENT_ID,
    scope: CONFIG.GOOGLE_SCOPE,
    redirectUri: CONFIG.GOOGLE_REDIRECT_URI
  };
  
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

  function mostrarAlertaSucesso(titulo, mensagem, detalhes = "") {
    const alertaCompleto = `🎉 ${titulo}\n\n${mensagem}${detalhes ? '\n\n' + detalhes : ''}\n\n✅ Operação realizada com êxito!`;
    mostrarAlertaCentralizado(alertaCompleto);
  }

  function mostrarStatus(mensagem, tipo = "info") {
    if (tipo === "error") {
      mostrarAlertaCentralizado(mensagem);
      return;
    }

    if (tipo === "success") {
      setTimeout(() => {
        mostrarAlertaCentralizado(`✅ Sucesso!\n\n${mensagem}`);
      }, 1000);
    }

  }

  function iniciarLoginGmail() {
    const userEmailLogin = document.getElementById("userEmail").value.trim();
    const spreadsheetId = document.getElementById("spreadsheetId").value.trim();
    
    if (!userEmailLogin) {
      mostrarStatus("Por favor, insira seu e-mail Gmail", "error");
      return;
    }
    
    if (!spreadsheetId) {
      mostrarStatus("Por favor, insira o ID da planilha", "error");
      return;
    }
    
    const emailRegex = /^[^\s@]+@(gmail\.com|googlemail\.com|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
    if (!emailRegex.test(userEmailLogin)) {
      mostrarStatus("Por favor, insira um e-mail válido (Gmail ou Google Workspace)", "error");
      return;
    }
    
    const clientId = obterClientIdPorEmail(userEmailLogin);
    const isAutorizado = verificarEmailAutorizado(userEmailLogin);
    
    if (!isAutorizado) {
      mostrarStatus(`Usando Client ID para usuários não autorizados. Email: ${userEmailLogin}`, "info");
    } else {
      mostrarStatus(`Usando Client ID para usuários autorizados. Email: ${userEmailLogin}`, "info");
    }
    
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('user_email', userEmailLogin);
    sessionStorage.setItem('client_id_used', clientId);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', GOOGLE_OAUTH_CONFIG.redirectUri);
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_CONFIG.scope);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('login_hint', userEmailLogin);
    
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
      let errorMessage = `Erro na autenticação: ${errorParam}`;
      
      if (errorParam === 'access_denied') {
        errorMessage = `Acesso negado. Verifique se:\n\n1. O e-mail está correto\n2. A credencial OAuth2 permite este e-mail (Gmail ou Google Workspace)\n3. Você autorizou o acesso na janela do Google`;
      } else if (errorParam === 'invalid_client') {
        const userEmail = sessionStorage.getItem('user_email');
        const isAutorizado = verificarEmailAutorizado(userEmail);
        
        if (isAutorizado) {
          errorMessage = `Erro de configuração OAuth2!\n\nO Client ID não está configurado corretamente.\n\nPara resolver:\n1. Acesse https://console.cloud.google.com\n2. Crie um projeto e ative a Google Sheets API\n3. Crie credenciais OAuth2 (Web application)\n4. Substitua o Client ID no arquivo script.js\n5. Adicione os URIs autorizados: ${window.location.origin}`;
        } else {
          errorMessage = `Erro de configuração OAuth2!\n\nO Client ID não está configurado corretamente.\n\nEntre em contato com o administrador do sistema para resolver este problema.`;
        }
      } else if (errorParam === 'unauthorized_client') {
        errorMessage = `Cliente não autorizado. O e-mail não tem permissão para usar esta aplicação.`;
      }
      
      mostrarStatus(errorMessage, "error");
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
      
      window.history.replaceState({}, document.title, window.location.pathname);
      
      obterPerfilUsuario();
      
      const userEmailCallback = sessionStorage.getItem('user_email');
      const clientIdUsed = sessionStorage.getItem('client_id_used');
      
      if (clientIdUsed) {
        const isAutorizado = verificarEmailAutorizado(userEmailCallback);
        const tipoUsuario = isAutorizado ? 'autorizado' : 'não autorizado';
        mostrarStatus(`Login realizado com sucesso usando Client ID para usuários ${tipoUsuario}`, "success");
      }
      
      if (window._oauthExpireTimeout) clearTimeout(window._oauthExpireTimeout);
      window._oauthExpireTimeout = setTimeout(() => {
        fazerLogout();
        mostrarStatus("Sessão expirada. Faça login novamente.", "error");
      }, 30 * 60 * 1000); // 30 minutos
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
        
        const userEmailInputVerificar = document.getElementById("userEmail");
        const expectedEmail = sessionStorage.getItem('user_email');
        
        if (userProfile.email && expectedEmail && userProfile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
          mostrarStatus(`E-mail logado (${userProfile.email}) não corresponde ao e-mail inserido (${expectedEmail})`, "error");
          fazerLogout();
          return;
        }
        
        atualizarInterfaceUsuario();
        
          const userEmailDisplay0 = document.getElementById("userEmailDisplay");
          if (userEmailDisplay0) {
            userEmailDisplay0.textContent = userProfile.email || "";
          }
        
        controlarAcessoPorEmail(userProfile.email);
        
        salvarConfiguracoes();
      } else {        
        const userEmailFallback = sessionStorage.getItem('user_email');
        if (userEmailFallback) {
          userProfile = { email: userEmailFallback, name: 'Usuário' };
          
          localStorage.setItem("cema_user_email", userEmailFallback);
          
          const emailInput = document.getElementById("userEmail");
          if (emailInput) {
            emailInput.value = userEmailFallback;
          }
          
          atualizarInterfaceUsuario();
          
          const userEmailDisplay1 = document.getElementById("userEmailDisplay");
          if (userEmailDisplay1) {
            userEmailDisplay1.textContent = userEmailFallback;
          }
          
          salvarConfiguracoes();
        } else {
          fazerLogout();
        }
      }
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      const userEmailError = sessionStorage.getItem('user_email');
      if (userEmailError) {
        userProfile = { email: userEmailError, name: 'Usuário' };
        
        localStorage.setItem("cema_user_email", userEmailError);
        
        const emailInput = document.getElementById("userEmail");
        if (emailInput) {
          emailInput.value = userEmailError;
        }
        
        atualizarInterfaceUsuario();
        
          const userEmailDisplay2 = document.getElementById("userEmailDisplay");
          if (userEmailDisplay2) {
            userEmailDisplay2.textContent = userEmailError;
          }
        
        salvarConfiguracoes();
      } else {
        fazerLogout();
      }
    }
  }

  function atualizarInterfaceUsuario() {
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    const userInfo = document.getElementById("userInfo");
    const userName = document.getElementById("userName");
    const userEmailElement = document.getElementById("userEmail");
    
    if (accessToken && userProfile) {
      loginButton.style.display = "none";
      if (logoutButton) logoutButton.style.display = "inline-block";
      if (userInfo) userInfo.style.display = "block";
      
      if (userName) userName.textContent = userProfile.name || "Usuário";
      if (userEmailElement) userEmailElement.textContent = userProfile.email || "";
      
      const emailInput = document.getElementById("userEmail");
      if (emailInput) {
        emailInput.disabled = true;
        emailInput.style.backgroundColor = "#f8f9fa";
        if (emailInput.type !== 'password') {
          emailInput.type = 'password';
        }
      }
      
      controlarAcessoPorEmail(userProfile.email);
    } else {
      loginButton.style.display = "inline-block";
      if (logoutButton) logoutButton.style.display = "none";
      if (userInfo) userInfo.style.display = "none";
      
      const googleCloudLinks = document.querySelectorAll('a[href*="console.cloud.google.com"]');
      googleCloudLinks.forEach(link => {
        link.classList.add('disabled');
        link.title = 'Faça login para acessar';
        link.removeAttribute('href');
        link.removeAttribute('target');
      });
      
      const emailInput = document.getElementById("userEmail");
      if (emailInput) {
        emailInput.disabled = false;
        emailInput.style.backgroundColor = "white";
        if (emailInput.type !== 'password') {
          emailInput.type = 'password';
        }
      }
      
      const emailDigitado = emailInput ? emailInput.value : '';
      controlarAcessoPorEmail(emailDigitado);
    }
  }

  function fazerLogout() {
    accessToken = null;
    userProfile = null;
    sessionStorage.removeItem('oauth_access_token');
    sessionStorage.removeItem('user_email');
    sessionStorage.removeItem('client_id_used');
    
    const emailInput = document.getElementById("userEmail");
    if (emailInput) {
      emailInput.disabled = false;
      emailInput.style.backgroundColor = "white";
    }
    
    atualizarInterfaceUsuario();
    
    const emailDigitado = emailInput ? emailInput.value : '';
    controlarAcessoPorEmail(emailDigitado);
  }

  function verificarTokenSalvo() {
    const savedToken = sessionStorage.getItem('oauth_access_token');
    if (savedToken) {
      accessToken = savedToken;
      obterPerfilUsuario();
    } else {
      const emailInput = document.getElementById("userEmail");
      if (emailInput && emailInput.value) {
        controlarAcessoPorEmail(emailInput.value);
      }
    }
  }

  function mostrarAlertaParceiro(msg) {
    mostrarAlertaCentralizado(msg);
  }

  function adicionarParceiro() {
    const btnAdd = document.getElementById("btnAddPartner");
    
    const nome = document.getElementById("partnerName").value.trim();
    const percentual = parseFloat(document.getElementById("partnerPercentage").value);
    

    if (nome && (isNaN(percentual) || percentual === "")) {
      mostrarAlertaParceiro("Por favor, preencha também o percentual do parceiro");
      return;
    }

    if (!nome && !isNaN(percentual) && percentual > 0) {
      mostrarAlertaParceiro("Por favor, preencha também o nome do parceiro");
      return;
    }

    if (!nome && (isNaN(percentual) || percentual === "")) {
      mostrarAlertaParceiro("Por favor, preencha o nome e o percentual do parceiro");
      return;
    }

    if (!nome) {
      mostrarAlertaParceiro("Por favor, insira o nome do parceiro");
      return;
    }

    if (isNaN(percentual) || percentual <= 0 || percentual > 100) {
      mostrarAlertaParceiro("Por favor, insira um percentual válido (0-100)");
      return;
    }

    if (parceiros.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
      mostrarAlertaParceiro("Já existe um parceiro com este nome");
      return;
    }

    const percentualTotal = parceiros.reduce((total, p) => total + p.percentual, 0) + percentual;

    parceiros.push({ nome, percentual });
    
    document.getElementById("partnerName").value = "";
    document.getElementById("partnerPercentage").value = "";
    
    atualizarInterfaceParceiros();
    calcularValores();
    salvarParceiros();
    
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
                    </select>
                </td>
                <td><input type="date" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="RGI" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Número do protocolo" onchange="calcularValores()"></td>
                <td><input type="number" step="0.01" class="valor-field" placeholder="0,00" onchange="calcularValores()"></td>
                <td><input type="number" step="0.01" class="valor-field" placeholder="0,00" onchange="calcularValores()"></td>
                <td class="valor-field" style="background-color: #e8f5e8;">R$ 0,00</td>
                <td class="valor-field" style="background-color: #f0f8ff;">R$ 0,00</td>
                <td><input type="text" class="status-input" placeholder="Status"></td>
                <td class="acao"><button class="btn-remove" onclick="removerLinha(this)">Remover</button></td>
            `;

    tbody.appendChild(novaLinha);
    
    atualizarSelectsServicos();
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
      return;
    }

    linhas.forEach((linha) => {
      const inputValor = linha.querySelector('input[type="number"]');
      const inputDespesas = linha.querySelectorAll('input[type="number"]')[1];
      
      if (!inputValor || !inputDespesas) {
        return;
      }
      
      const valorCobrado = parseFloat(inputValor.value) || 0;
      const despesas = parseFloat(inputDespesas.value) || 0;

      totalFaturado += valorCobrado;
      totalDespesas += despesas;

      const valorCema = valorCobrado * 0.65 - despesas;
      const valorParceiros = valorCobrado * 0.35 + despesas;

      const valorFields = linha.querySelectorAll(".valor-field");
      if (valorFields.length >= 4) {
        valorFields[2].textContent = `R$ ${valorCema.toFixed(2)}`;
        valorFields[3].textContent = `R$ ${valorParceiros.toFixed(2)}`;
      }
    });

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
    if (!accessToken) {
      const savedToken = sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        accessToken = savedToken;
      }
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const mesAno = document.getElementById("mes").selectedOptions[0].text;
    const userEmailEnvio = document.getElementById("userEmail").value.trim();
    
    if (!accessToken) {
      mostrarAlertaCentralizado("Por favor, faça login com Gmail primeiro");
      return;
    }
    if (!spreadsheetId) {
      mostrarStatus("Por favor, configure o ID da planilha", "error");
      return;
    }
    if (!userEmailEnvio) {
      mostrarAlertaCentralizado("Por favor, preencha o e-mail Gmail antes de enviar.");
      return;
    }
    if (!parceiros || parceiros.length === 0) {
      mostrarAlertaCentralizado("Por favor, adicione pelo menos um parceiro antes de enviar.");
      return;
    }
    for (const parceiro of parceiros) {
      if (!parceiro.nome || parceiro.nome.trim() === "" || parceiro.percentual === undefined || parceiro.percentual === null || parceiro.percentual === "" || isNaN(parceiro.percentual) || parceiro.percentual <= 0) {
        mostrarAlertaCentralizado("Preencha corretamente o nome e o percentual de todos os parceiros antes de enviar.");
        return;
      }
    }
    mostrarStatus("Enviando dados para Google Sheets...", "info");

    try {
      const dados = [];

      dados.push([
        "Data",
        "Cliente Comprador",
        "Tel. Comprador",
        "Cliente Vendedor",
        "Tel. Vendedor",
        "Endereço Imóvel",
        "Tipo de Serviço",
        "Previsão de Conclusão",
        "RGI",
        "Protocolo",
        "Valor Cobrado",
        "Despesas",
        "CEMA (65%)",
        "Parceiros (35%)",
        "Status",
        "Parceiros Configurados"
      ]);

      const linhas = document.querySelectorAll("#corpoTabela tr");
      linhas.forEach((linha) => {
        const inputs = linha.querySelectorAll("input, select");
        const valorCobrado = parseFloat(inputs[10].value) || 0;
        const despesas = parseFloat(inputs[11].value) || 0;
        const statusInput = linha.querySelector('.status-input');
        const status = statusInput ? statusInput.value : "";

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
            inputs[7].value, // Previsão de Conclusão
            inputs[8].value, // RGI
            inputs[9].value, // Protocolo
            valorCobrado,
            despesas,
            valorCema,
            valorParceiros,
            status,
            parceiros.map(p => `${p.nome} (${p.percentual}%)`).join(", ") || "Nenhum"
          ]);
        }
      });

      const sheetName = mesAno.replace(" ", "_");

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
      }

      if (dados.length > 1) {
        const appendResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A5:append?valueInputOption=RAW`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: dados.slice(1),
            }),
          }
        );

        if (appendResponse.ok) {
          mostrarStatus("Dados adicionados com sucesso ao Google Sheets!", "success");
      } else {
          const error = await appendResponse.json();
          mostrarStatus(`Erro ao adicionar dados: ${error.error.message}`, "error");
        }
      } else {
        mostrarAlertaCentralizado("Nenhum dado para enviar.");
      }
    } catch (error) {
      mostrarStatus(
        `Erro ao conectar com Google Sheets: ${error.message}`,
        "error",
      );
    }
  }

  async function carregarDadosGoogleSheets() {
    if (!accessToken) {
      const savedToken = sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        accessToken = savedToken;
      }
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const mesAno = document.getElementById("mes").selectedOptions[0].text;

    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Gmail primeiro", "error");
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

        if (data.values && data.values.length > 4) {
          document.getElementById("corpoTabela").innerHTML = "";

          const rows = data.values.slice(4);

          rows.forEach((row) => {
            if (row.length > 0 && row[0]) {
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
                                    <td><input type="date" value="${
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
                                    <td><input type="text" class="status-input" value="${
                                      row[14] || ""
                                    }" placeholder="Status"></td>
                                    <td class="acao"><button class="btn-remove" onclick="removerLinha(this)">Remover</button></td>
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
          mostrarAlertaCentralizado("A tabela está vazia. Nenhum registro encontrado para este mês.");
        }
      } else {
        const error = await response.json();
        if (error.error && error.error.message && error.error.message.includes('Unable to parse range')) {
          mostrarStatus("Planilha está vazia", "info");
        } else {
          if (error.error && error.error.message && error.error.message.includes('Requested entity was not found')) {
            mostrarAlertaCentralizado("A tabela está vazia. Nenhum registro encontrado para este mês.");
          } else {
            mostrarStatus(`Erro ao carregar dados: ${error.error.message}`, "error");
          }
        }
      }
    } catch (error) {
      mostrarStatus(
        `Erro ao conectar com Google Sheets: ${error.message}`,
        "error",
      );
    }
  }

  async function criarPlanilhaAutomatica() {
    const emailInput = document.getElementById("userEmail");
    const userEmailCriar = emailInput ? emailInput.value : '';
    if (!verificarEmailAutorizado(userEmailCriar)) {
      mostrarAlertaCentralizado('Acesso restrito. Apenas emails autorizados podem criar planilhas.');
      return;
    }
    
    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Gmail primeiro", "error");
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
        salvarConfiguracoes();

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

  async function criarCopiaPlanilhaComLimpeza() {
    const emailInput = document.getElementById("userEmail");
    const userEmailCopia = emailInput ? emailInput.value : '';
    if (!verificarEmailAutorizado(userEmailCopia)) {
      mostrarAlertaCentralizado('Acesso restrito. Apenas emails autorizados podem criar cópias de planilhas.');
      return;
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    if (!spreadsheetId) {
      mostrarAlertaCentralizado("Por favor, informe o ID da planilha modelo");
      return;
    }

    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Gmail primeiro", "error");
      return;
    }

    mostrarAlertaCentralizado("Criando cópia exata da planilha usando Google Drive API...");
    
    try {
      const copyResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/copy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            name: "CEMA Imobiliária - Controle Financeiro",
            parents: []
          })
        }
      );

      if (!copyResponse.ok) {
        const error = await copyResponse.json();
        mostrarAlertaCentralizado("Erro ao copiar planilha: " + (error.error && error.error.message ? error.error.message : ""));
        return;
      }

      const copiedFile = await copyResponse.json();
      const newSpreadsheetId = copiedFile.id;

      const clearRequests = [];
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                     'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      
      const spreadsheetResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}`,
        {
          headers: { "Authorization": `Bearer ${accessToken}` }
        }
      );
      
      if (spreadsheetResponse.ok) {
        const spreadsheetData = await spreadsheetResponse.json();
        
        spreadsheetData.sheets.forEach(sheet => {
          const sheetTitle = sheet.properties.title.toLowerCase();
          if (meses.includes(sheetTitle)) {
            clearRequests.push({
              updateCells: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  startRowIndex: 4,
                  endRowIndex: 1000,
                  startColumnIndex: 0,
                  endColumnIndex: 26 
                },
                fields: "userEnteredValue"
              }
            });
          }
        });
      }

      if (clearRequests.length > 0) {
        const clearResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ requests: clearRequests })
          }
        );

        if (!clearResponse.ok) {
          const error = await clearResponse.json();
          console.warn("Aviso: Não foi possível limpar algumas linhas: " + (error.error && error.error.message ? error.error.message : ""));
        }
      }

      document.getElementById("spreadsheetId").value = newSpreadsheetId;
      salvarConfiguracoes();

      mostrarAlertaCentralizado(
        `Planilha copiada com sucesso!<br><a href="https://docs.google.com/spreadsheets/d/${newSpreadsheetId}" target="_blank">Abrir nova planilha</a>`
      );

    } catch (error) {
      mostrarAlertaCentralizado("Erro ao criar cópia: " + error.message);
    }
  }

  function salvarConfiguracoes() {
    const userEmailSalvar = document.getElementById("userEmail").value;
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    
    localStorage.setItem("cema_user_email", userEmailSalvar);
    localStorage.setItem("cema_spreadsheet_id", spreadsheetId);
  }

  function carregarConfiguracoes() {
    const userEmailCarregar = localStorage.getItem("cema_user_email");
    const spreadsheetId = localStorage.getItem("cema_spreadsheet_id");
    
    if (userEmailCarregar) {
      const emailInput = document.getElementById("userEmail");
      if (emailInput) {
        emailInput.value = userEmailCarregar;
        controlarAcessoPorEmail(userEmailCarregar);
      }
    }
    
    if (spreadsheetId) {
      const spreadsheetInput = document.getElementById("spreadsheetId");
      if (spreadsheetInput) {
        spreadsheetInput.value = spreadsheetId;
      }
    }
  }

  const userEmailElementConfig = document.getElementById("userEmail");
  const spreadsheetIdElement = document.getElementById("spreadsheetId");
  if (userEmailElementConfig) {
    userEmailElementConfig.addEventListener("change", salvarConfiguracoes);
  }
  if (spreadsheetIdElement) {
    spreadsheetIdElement.addEventListener("change", salvarConfiguracoes);
  }

  function salvarParceirosAposModificacao() {
    salvarParceiros();
  }

  function formatarDataBrasileira(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function converterDataParaISO(data) {
    if (!data) return "";
    const [dia, mes, ano] = data.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  async function exportarRelatorioCompleto() {
    const emailInput = document.getElementById("userEmail");
    const userEmailRelatorio = emailInput ? emailInput.value : '';
    if (!verificarEmailAutorizado(userEmailRelatorio)) {
      mostrarAlertaCentralizado('Acesso restrito. Apenas emails autorizados podem gerar relatórios.');
      return;
    }
    
    if (!accessToken) {
      const savedToken = sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        accessToken = savedToken;
      }
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;

    if (!accessToken) {
      mostrarAlertaCentralizado("Por favor, faça login com Gmail primeiro");
      return;
    }
    if (!spreadsheetId) {
      mostrarAlertaCentralizado("Por favor, informe o ID da planilha");
      return;
    }
    if (!userEmailRelatorio) {
      mostrarAlertaCentralizado("Por favor, preencha o e-mail Gmail antes de gerar o relatório.");
      return;
    }

    mostrarStatus("Gerando relatório completo...", "info");

    try {
      const relatorioData = [];

      relatorioData.push(["CEMA IMOBILIÁRIA - RELATÓRIO ANUAL"]);
      relatorioData.push(["Gerado em:", new Date().toLocaleDateString("pt-BR")]);
      relatorioData.push([]);

      relatorioData.push(["RESUMO POR MÊS"]);
      relatorioData.push([
        "Mês",
        "Total Faturado",
        "Total Despesas",
        "Líquido",
        "CEMA",
        "Felipe",
      ]);

      relatorioData.push([]);
      relatorioData.push(["TABELA DE SERVIÇOS"]);
      relatorioData.push(["Serviço", "Valor"]);

      Object.entries(servicosValores).forEach(([servico, valor]) => {
        relatorioData.push([servico, valor]);
      });

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
      }

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
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
      } else {
        throw new Error("Erro ao gerar relatório");
      }
    } catch (error) {
      mostrarStatus(`Erro ao gerar relatório: ${error.message}`, "error");
    }
  }

  function validarCamposParceiro() {
    const nomeInput = document.getElementById("partnerName");
    const percentualInput = document.getElementById("partnerPercentage");
    const btnAdd = document.getElementById("btnAddPartner");
    const nomeFeedback = document.getElementById("partnerNameFeedback");
    const percentualFeedback = document.getElementById("partnerPercentageFeedback");

    let nome = nomeInput.value.trim();
    let percentual = percentualInput.value.trim();
    let percentualNum = parseFloat(percentual);
    let nomeValido = nome.length > 0;
    let percentualValido = percentual.length > 0 && !isNaN(percentualNum) && percentualNum > 0 && percentualNum <= 100;

    nomeInput.classList.remove("is-invalid", "is-valid");
    percentualInput.classList.remove("is-invalid", "is-valid");
    nomeFeedback.style.display = "none";
    percentualFeedback.style.display = "none";

    if (!nomeValido && nome.length > 0) {
      nomeInput.classList.add("is-invalid");
      nomeFeedback.style.display = "block";
    } else if (nomeValido) {
      nomeInput.classList.add("is-valid");
    }
    if (!percentualValido && percentual.length > 0) {
      percentualInput.classList.add("is-invalid");
      percentualFeedback.style.display = "block";
    } else if (percentualValido) {
      percentualInput.classList.add("is-valid");
    }

    btnAdd.disabled = false;
    return nomeValido && percentualValido;
  }

  function mostrarAlertaCentralizado(msg) {
    let alerta = document.getElementById('centeredAlert');
    if (!alerta) {
      alerta = document.createElement('div');
      alerta.id = 'centeredAlert';
      alerta.className = 'centered-alert';
      document.body.appendChild(alerta);
    }
    alerta.textContent = msg;
    alerta.style.display = 'block';
    clearTimeout(window._centeredAlertTimeout);
    window._centeredAlertTimeout = setTimeout(() => {
      alerta.style.display = 'none';
    }, 3000);
  }

  function adicionarNovoServico() {
    const emailInput = document.getElementById("userEmail");
    const userEmailAdicionar = emailInput ? emailInput.value : '';
    if (!verificarEmailAutorizado(userEmailAdicionar)) {
      mostrarAlertaCentralizado('Acesso restrito. Apenas emails autorizados podem adicionar novos serviços.');
      return;
    }
    
    const nomeInput = document.getElementById('novoServicoNome');
    const valorInput = document.getElementById('novoServicoValor');
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);
    if (!nome) {
      mostrarAlertaCentralizado('Preencha o nome do novo serviço.');
      return;
    }
    if (isNaN(valor) || valor <= 0) {
      mostrarAlertaCentralizado('Preencha um valor válido para o novo serviço.');
      return;
    }
    if (servicosValores[nome]) {
      mostrarAlertaCentralizado('Já existe um serviço com esse nome.');
      return;
    }
    servicosValores[nome] = valor;
    const grid = document.getElementById('servicesGrid');
    const div = document.createElement('div');
    div.className = 'service-item';
    div.innerHTML = `<span>${nome}</span><input type="number" class="service-value-input" data-nome="${nome}" value="${valor}" min="0" step="0.01" style="width: 90px; margin-left: 8px;">`;
    grid.appendChild(div);
    nomeInput.value = '';
    valorInput.value = '';
    atualizarSelectsServicos();
    ativarListenersValoresServicos();
  }

  function removerServicoAdicionado() {
    const emailInput = document.getElementById("userEmail");
    const userEmailRemover = emailInput ? emailInput.value : '';
    if (!verificarEmailAutorizado(userEmailRemover)) {
      mostrarAlertaCentralizado('Acesso restrito. Apenas emails autorizados podem remover serviços.');
      return;
    }
    
    const nomeInput = document.getElementById('novoServicoNome');
    const nome = nomeInput.value.trim();
    
    if (!nome) {
      mostrarAlertaCentralizado('Digite o nome do serviço que deseja remover.');
      return;
    }
    
    const servicosPadrao = [
      "Registro com financiamento", "Registro à vista", "Averbação", 
      "Guia de Laudêmio do SPU", "Laudêmio da prefeitura", "Laudêmio das famílias",
      "Laudêmio do São Bento", "Laudêmio da Igreja da Glória", "Laudêmio da Mitra",
      "Emissão de guia de ITBI", "Emissão de certidão por nome", "Transferência de conta"
    ];
    
    if (servicosPadrao.includes(nome)) {
      mostrarAlertaCentralizado('Não é possível remover serviços padrão do sistema.');
      return;
    }
    
    if (!servicosValores[nome]) {
      mostrarAlertaCentralizado('Serviço não encontrado.');
      return;
    }
    
    delete servicosValores[nome];
    
    const grid = document.getElementById('servicesGrid');
    const serviceItems = grid.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
      const span = item.querySelector('span');
      if (span && span.textContent === nome) {
        item.remove();
      }
    });
    
    nomeInput.value = '';
    document.getElementById('novoServicoValor').value = '';
    
    atualizarSelectsServicos();
    ativarListenersValoresServicos();
    
    mostrarAlertaCentralizado(`Serviço "${nome}" removido com sucesso!`);
  }

  function atualizarSelectsServicos() {
    const selects = document.querySelectorAll('#corpoTabela select');
    selects.forEach(select => {
      const valorAtual = select.value;
      select.innerHTML = '<option value="">Selecione o serviço</option>';
      Object.keys(servicosValores).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        if (nome === valorAtual) opt.selected = true;
        select.appendChild(opt);
      });
    });
  }

  function ativarListenersValoresServicos() {
    document.querySelectorAll('.service-value-input').forEach(input => {
      input.addEventListener('input', function() {
        const nome = input.getAttribute('data-nome');
        const valor = parseFloat(input.value);
        if (nome && !isNaN(valor) && valor > 0) {
          servicosValores[nome] = valor;
          atualizarSelectsServicos();
        }
      });
    });
  }

  function limparTabelaServicos() {
    const corpoTabela = document.getElementById("corpoTabela");
    if (corpoTabela) {
      corpoTabela.innerHTML = "";
      adicionarLinha();
      calcularValores(); 
      mostrarAlertaCentralizado("Tabela limpa! Pronto para nova inserção.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      processarCallbackOAuth2();
    }
    
    carregarConfiguracoes();
    const userEmailInputListener = document.getElementById("userEmail");
    const spreadsheetIdInput = document.getElementById("spreadsheetId");
    
    if (userEmailInputListener) {
      userEmailInputListener.addEventListener('input', function() {
        localStorage.setItem("cema_user_email", this.value);
        controlarAcessoPorEmail(this.value);
      });
    }
    
    if (spreadsheetIdInput) {
      spreadsheetIdInput.addEventListener('input', function() {
        localStorage.setItem("cema_spreadsheet_id", this.value);
      });
    }
    carregarParceiros();
    verificarTokenSalvo();
    adicionarLinha();

    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0");
    const mesElement = document.getElementById("mes");
    if (mesElement) {
      mesElement.value = mesAtual;
    }
    
    setTimeout(() => {
      calcularValores();
      const emailInput = document.getElementById("userEmail");
      if (emailInput && emailInput.value) {
        controlarAcessoPorEmail(emailInput.value);
      }
    }, 100);

  configurarIconesOlho();
  
  ativarListenersValoresServicos();
  
  aplicarEstadoInicialLinks();
  });

  function aplicarEstadoInicialLinks() {
    const googleCloudLinks = document.querySelectorAll('a[href*="console.cloud.google.com"]');
    googleCloudLinks.forEach(link => {
      const isLoggedIn = accessToken && userProfile;
      if (!isLoggedIn) {
        link.classList.add('disabled');
        link.title = 'Faça login para acessar';
        link.removeAttribute('href');
        link.removeAttribute('target');
      }
    });
  }

  function configurarIconesOlho() {
    const olhoSpreadsheet = document.getElementById('olho-spreadsheet');
    const inputSpreadsheet = document.getElementById('spreadsheetId');
    if (olhoSpreadsheet && inputSpreadsheet) {
      olhoSpreadsheet.addEventListener('click', function () {
        if (inputSpreadsheet.type === 'password') {
          inputSpreadsheet.type = 'text';
          olhoSpreadsheet.style.opacity = 0.5;
        } else {
          inputSpreadsheet.type = 'password';
          olhoSpreadsheet.style.opacity = 1;
        }
      });
    }

    const olhoEmail = document.getElementById('olho-email');
    const inputEmail = document.getElementById('userEmail');
    if (olhoEmail && inputEmail) {
      olhoEmail.addEventListener('click', function () {
        if (inputEmail.type === 'password') {
          inputEmail.type = 'text';
          olhoEmail.style.opacity = 0.5;
        } else {
          inputEmail.type = 'password';
          olhoEmail.style.opacity = 1;
        }
      });
    }
  }



  window.adicionarParceiro = adicionarParceiro;
  window.removerParceiro = removerParceiro;
  window.adicionarLinha = adicionarLinha;
  window.removerLinha = removerLinha;
  window.calcularValores = calcularValores;
  window.atualizarValor = atualizarValor;
  window.enviarParaGoogleSheets = enviarParaGoogleSheets;
  window.carregarDadosGoogleSheets = carregarDadosGoogleSheets;
  window.criarPlanilhaAutomatica = criarPlanilhaAutomatica;
  window.criarCopiaPlanilhaComLimpeza = criarCopiaPlanilhaComLimpeza;
  window.exportarRelatorioCompleto = exportarRelatorioCompleto;
  window.limparTabelaServicos = limparTabelaServicos;
  window.adicionarNovoServico = adicionarNovoServico;
  window.removerServicoAdicionado = removerServicoAdicionado;
  window.iniciarLoginGmail = iniciarLoginGmail;
  window.fazerLogout = fazerLogout;
  window.verificarTokenSalvo = verificarTokenSalvo;
  window.validarCamposParceiro = validarCamposParceiro;
  window.verificarEmailAutorizado = verificarEmailAutorizado;
  window.controlarAcessoPorEmail = controlarAcessoPorEmail;
  window.obterClientIdPorEmail = obterClientIdPorEmail;
})();

