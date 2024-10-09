let initialBalance = 250; // Saldo inicial definido como 250
let user = null;
let userControlGroup = null; // Variável para armazenar o grupo de controle do usuário
let gameHistory = [];
let saldoAtual = initialBalance;
let rodadas = 0;
let roundResults = [];
let currentRound = 0;
let isSpinning = false;
let isRigged = true; // Roleta viciada ativada por padrão
let clickCount = 0;
let specialSession = false; // Flag para sessão especial

// Variáveis de velocidade
let spinDuration = 3000; // Duração do giro em milissegundos

let BASE_SPIN_DURATION = 3000; // ms
let BASE_INNER_SPIN_DURATION = 500; // ms
let BASE_ADJUSTMENT_DELAY = 100; // ms
let BASE_IS_SPINNING_DELAY = 1000; // ms
let BASE_NOTIFICATION_DURATION = 3000; // ms

let durationMultiplier = spinDuration / BASE_SPIN_DURATION;

let innerSpinDuration = BASE_INNER_SPIN_DURATION * durationMultiplier;
let adjustmentDelay = BASE_ADJUSTMENT_DELAY * durationMultiplier;
let isSpinningDelay = BASE_IS_SPINNING_DELAY * durationMultiplier;
let notificationDuration = BASE_NOTIFICATION_DURATION * durationMultiplier;

const epsilon = 0.0001; // Pequeno valor para evitar limites exatos

// Range de grau das fatias (sem a cor verde)
let colorRanges = {
    preto: [
        [22.5 + epsilon, 45 - epsilon],
        [67.5 + epsilon, 90 - epsilon],
        [112.5 + epsilon, 135 - epsilon],
        [157.5 + epsilon, 180 - epsilon],
        [202.5 + epsilon, 225 - epsilon],
        [247.5 + epsilon, 270 - epsilon],
        [292.5 + epsilon, 315 - epsilon],
        [337.5 + epsilon, 360 - epsilon]
    ],
    vermelho: [
        [0 + epsilon, 22.5 - epsilon],
        [45 + epsilon, 67.5 - epsilon],
        [90 + epsilon, 112.5 - epsilon],
        [135 + epsilon, 157.5 - epsilon],
        [180 + epsilon, 202.5 - epsilon],
        [225 + epsilon, 247.5 - epsilon],
        [270 + epsilon, 292.5 - epsilon],
        [315 + epsilon, 337.5 - epsilon]
    ],
};

function updateBodyBackground(screen) {
    // Remove classes de fundo personalizado (jogo e estatísticas)
    document.body.classList.remove('game-background', 'stats-background');
    
    // Alterar o fundo conforme a tela ativa
    if (screen === 'game') {
      document.body.classList.add('game-background');
    } else if (screen === 'stats') {
      document.body.classList.add('stats-background');
    }
    // Se não estiver em "game" ou "stats", o fundo será o padrão (login)
}

function returnToLogin() {
    // Mostrar a tela de login e voltar ao fundo padrão (login)
    document.getElementById("loginScreen").style.display = "block";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("statsScreen").style.display = "none";
    document.getElementById("header").style.display = "none";  // Esconder o cabeçalho
  
    // Voltar ao fundo padrão da tela de login
    updateBodyBackground('login');
}
  
function login() {
    const usernameInput = document.getElementById("username").value;
    if (usernameInput.trim()) {
        // Atualiza o padrão para incluir o grupo de controle opcional
        const adminPattern = /^admin\.(\d+)\.(\d+)(?:\.(\d+))?$/;
        const match = usernameInput.match(adminPattern);
        if (match) {
            // Extrai os valores de saldoAtual, spinDuration e userControlGroup (se fornecido)
            initialBalance = parseInt(match[1], 10);
            spinDuration = parseInt(match[2], 10);
            // Atualiza as variáveis dependentes
            updateSpinVariables();
            // Define o usuário como 'admin' e marca a sessão como especial
            user = 'admin';
            specialSession = true;
            // Reseta o histórico e as variáveis do jogo
            gameHistory = [];
            saldoAtual = initialBalance;
            rodadas = 0;
            currentRound = 0;
            // Limpa os dados armazenados no localStorage para evitar conflitos
            localStorage.removeItem(`${user}_history`);
            localStorage.removeItem(`${user}_controlGroup`);
            localStorage.removeItem(`${user}_roundResults`);
            localStorage.removeItem(`${user}_currentRound`);

            // Verifica se o grupo de controle foi fornecido
            if (match[3]) {
                userControlGroup = parseInt(match[3], 10);
                if (![1, 2, 3].includes(userControlGroup)) {
                    alert("Grupo de controle inválido. Por favor, escolha entre 1, 2 ou 3.");
                    return; // Sai da função login()
                }
            } else {
                // Define um grupo padrão se não for fornecido
                userControlGroup = 1;
            }
        } else {
            user = usernameInput;
        }
        localStorage.setItem("username", user);
        loadStats();
        startGame();
    } else {
        alert("Por favor, insira um nickname para jogar.");
    }
}

function updateSpinVariables() {
    durationMultiplier = spinDuration / BASE_SPIN_DURATION;
    innerSpinDuration = BASE_INNER_SPIN_DURATION * durationMultiplier;
    adjustmentDelay = BASE_ADJUSTMENT_DELAY * durationMultiplier;
    isSpinningDelay = BASE_IS_SPINNING_DELAY * durationMultiplier;
    notificationDuration = BASE_NOTIFICATION_DURATION * durationMultiplier;
}

function guestLogin() {
    user = "Convidado";
    gameHistory = [];
    saldoAtual = initialBalance; // Define o saldo inicial como 250
    rodadas = 0;
    currentRound = 0; // Reseta o contador de rodadas
    startGame();
}

function startGame() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "block";
    document.getElementById("statsScreen").style.display = "none"; // Esconder a tela de estatísticas
    document.getElementById("header").style.display = "flex";  // Mostrar o cabeçalho

    // Atualiza o fundo para a tela do jogo
    updateBodyBackground('game');

    document.getElementById("userDisplay").textContent = user === "Convidado"
        ? "Jogando como Convidado"
        : `Jogando como ${user}`;

    // Adiciona o evento de clique após o elemento existir
    document.getElementById('userDisplay').addEventListener('click', toggleRiggedWheel);
    
    if (!specialSession) {
        const storedHistory = localStorage.getItem(`${user}_history`);
        if (storedHistory) {
            gameHistory = JSON.parse(storedHistory);
            saldoAtual = gameHistory.reduce((acc, game) => acc + game.profitOrLoss, initialBalance);
            rodadas = gameHistory.length;
        } else {
            gameHistory = [];
            saldoAtual = initialBalance;
            rodadas = 0;
        }

        // Atribuição do grupo de controle
        let controlGroup = localStorage.getItem(`${user}_controlGroup`);
        if (!controlGroup) {
            controlGroup = Math.floor(Math.random() * 3) + 1;
            localStorage.setItem(`${user}_controlGroup`, controlGroup);
        }
        userControlGroup = controlGroup;
    } else {
        // Para sessão especial, já definimos o userControlGroup no login()
        // Opcionalmente, você pode verificar se o userControlGroup está dentro dos limites esperados
        if (![1, 2, 3].includes(userControlGroup)) {
            userControlGroup = 1; // Define um grupo padrão válido
        }
    }

    updateUIForControlGroup();
    
    initializeRoundResults();
    updateInfo();
}

function spinWheel() {
    if (isSpinning) return;

    const wheel = document.getElementById('wheel');
    const colorSelect = document.getElementById('colorSelect').value;
    const betAmount = parseFloat(document.getElementById('betAmount').value);

    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
        alert("Por favor, insira um valor de aposta válido.");
        return;
    }

    if (betAmount < 10) {
        alert("A aposta mínima é R$10.");
        isSpinning = false;
        return;
    }

    if (betAmount > saldoAtual) {
        alert("Saldo insuficiente para realizar essa aposta.");
        return;
    }

    isSpinning = true;
    let randomDegree;

    if (isRigged) {
        let roundResult = getRoundResult();
        if (roundResult === "Ganhou") {
            randomDegree = getRandomDegreeForColor(colorSelect);
        } else {
            const availableColors = Object.keys(colorRanges).filter(color => color !== colorSelect);
            const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            randomDegree = getRandomDegreeForColor(randomColor);
        }
    } else {
        randomDegree = Math.floor(Math.random() * 360);
    }

    const spinAngle = 360 * 5 + randomDegree;

    wheel.style.transition = `transform ${spinDuration / 1000}s cubic-bezier(0.42, 0, 0.58, 1)`;
    wheel.style.transform = `rotate(${spinAngle}deg)`;

    setTimeout(() => {
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${randomDegree}deg)`;
        
        const colorAtStop = getColorAtDegree(randomDegree);
        const result = colorAtStop === colorSelect ? "Ganhou" : "Perdeu";

        // Definindo o multiplicador com base na cor da fatia
        let multiplier;
        switch (colorAtStop) {
            case 'preto':
                multiplier = 2;
                break;
            case 'vermelho':
                multiplier = 2;
                break;
            default:
                multiplier = 1; // Caso inesperado
        }

        // Correção no cálculo do lucro ou prejuízo
        const profitOrLoss = result === "Ganhou" ? betAmount * (multiplier - 1) : -betAmount;

        // Atualiza a informação do jogo
        const gameRound = {
            id: rodadas + 1,
            bet: betAmount,
            colorBet: colorSelect,
            result: result,
            finalColor: colorAtStop,
            profitOrLoss: profitOrLoss,
        };

        gameHistory.push(gameRound);
        saldoAtual += profitOrLoss;
        rodadas++;
        currentRound++; // Incrementa o currentRound
        localStorage.setItem(`${user}_history`, JSON.stringify(gameHistory));
        localStorage.setItem(`${user}_currentRound`, currentRound); // Salva o currentRound
        updateInfo();

        // Exibe a notificação com o ganho ou perda
        let notificationMessage = profitOrLoss > 0
            ? `Você ganhou R$${Math.abs(profitOrLoss).toFixed(2)}!`
            : `Você perdeu R$${Math.abs(profitOrLoss).toFixed(2)}!`;
        showNotification(notificationMessage, profitOrLoss > 0);

        // Ajuste da rotação para o meio da fatia
        setTimeout(() => {
            const adjustedAngle = getCenteredAngle(randomDegree);
            wheel.style.transition = `transform ${innerSpinDuration / 1000}s cubic-bezier(0.42, 0, 0.58, 1)`;
            wheel.style.transform = `rotate(${adjustedAngle}deg)`;

            setTimeout(() => {
                isSpinning = false;
            }, isSpinningDelay);

        }, adjustmentDelay);

    }, spinDuration);
}

// Função para gerar e embaralhar os resultados das rodadas
function initializeRoundResults() {
    // Carrega o currentRound do localStorage ou inicia em 0
    const storedCurrentRound = localStorage.getItem(`${user}_currentRound`);
    currentRound = storedCurrentRound ? parseInt(storedCurrentRound) : 0;

    const storedRoundResults = localStorage.getItem(`${user}_roundResults`);
    if (storedRoundResults) {
        roundResults = JSON.parse(storedRoundResults);
    } else {
        // Se não houver roundResults armazenados, inicializa conforme a lógica do jogo
        roundResults = [];

        // Primeiras 5 rodadas com 4 vitórias e 1 derrota
        const initialResults = Array(5).fill("Perdeu");
        for (let i = 0; i < 4; i++) {
            initialResults[i] = "Ganhou";
        }
        shuffleArray(initialResults);
        roundResults = initialResults;

        localStorage.setItem(`${user}_roundResults`, JSON.stringify(roundResults));
    }
}

// Função para embaralhar um array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Troca os elementos
    }
    return array;
}

function getRoundResult() {
    // console.log(`Current Round: ${currentRound}`);
    // console.log(`Round Results Length: ${roundResults.length}`);
    // console.log(`Round Results:`, roundResults);
    if (currentRound >= roundResults.length) {
        // Verifica se é o primeiro lote de resultados
        if (currentRound < 5) {
            // Primeiro lote já deve ter sido gerado em initializeRoundResults()
        } else {
            // Gera novos resultados em lotes de 5 rodadas com 1 vitória e 4 derrotas
            const newResults = Array(5).fill("Perdeu");
            newResults[Math.floor(Math.random() * 5)] = "Ganhou"; // Define a posição da vitória
            shuffleArray(newResults);
            roundResults = roundResults.concat(newResults);
            localStorage.setItem(`${user}_roundResults`, JSON.stringify(roundResults));
        }
    }
    return roundResults[currentRound];
}

// Escolher uma fatia aleatória de determinada cor
function getRandomDegreeForColor(color) {
    const ranges = colorRanges[color];
    if (!ranges || ranges.length === 0) return Math.random() * 360;

    const randomRange = ranges[Math.floor(Math.random() * ranges.length)];
    const minDegree = randomRange[0];
    const maxDegree = randomRange[1];

    return Math.random() * (maxDegree - minDegree) + minDegree;
}


// Pegar a cor da fatia com base no grau
function getColorAtDegree(degree) {
    const normalizedDegree = (degree + epsilon) % 360;
    const segmentDegree = 360 / 16; // 22.5 graus por segmento
    const segmentIndex = Math.floor(normalizedDegree / segmentDegree);

    return segmentIndex % 2 === 0 ? 'vermelho' : 'preto';
}

function getCenteredAngle(degree) {
    const segmentDegree = 360 / 16;
    const segmentIndex = Math.floor(degree / segmentDegree);
    const segmentStart = segmentIndex * segmentDegree;
    const segmentEnd = segmentStart + segmentDegree;
    return segmentStart + segmentDegree / 2;
}

function showStats() {
    if (confirm('Você tem certeza que deseja encerrar o jogo?')) {
        document.getElementById("gameScreen").style.display = "none";
        document.getElementById("statsScreen").style.display = "block";

        // Atualiza o fundo para a tela de estatísticas
        updateBodyBackground('stats');

        // Exibe o número do grupo
        document.getElementById('groupNumber').textContent = userControlGroup;

        const statsContainer = document.getElementById("statsContainer");
        statsContainer.innerHTML = ""; // Limpa o conteúdo atual

        // Cria a tabela
        const table = document.createElement('table');
        table.className = 'stats-table';

        // Cabeçalho da tabela
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Rodada</th>
                <th>Valor</th>
                <th>Cor Apostada</th>
                <th>Cor Final</th>
                <th>Ganho/ Perda Total</th>
                <th>Saldo Atual</th> <!-- Nova coluna -->
            </tr>
        `;
        table.appendChild(thead);

        // Corpo da tabela
        const tbody = document.createElement('tbody');
        let acumulado = initialBalance; // Inicializa o saldo acumulado com o saldo inicial

        gameHistory.forEach(game => {
            acumulado += game.profitOrLoss; // Atualiza o saldo acumulado

            // Formata o ganho/perda
            const totalGainsLosses = acumulado - initialBalance;
            const formattedProfitOrLoss = totalGainsLosses > 0 
                ? `+R$${Math.abs(totalGainsLosses).toFixed(2)}` 
                : `-R$${Math.abs(totalGainsLosses).toFixed(2)}`;

            // Formata o saldo atual
            const formattedSaldoAtual = `R$${acumulado.toFixed(2)}`;

            // Cria a linha da tabela
            const row = document.createElement('tr');
            row.className = game.profitOrLoss > 0 ? 'win' : 'loss'; // Aplica a classe de cor

            // Adiciona as células
            row.innerHTML = `
                <td>${game.id}</td>
                <td>R$${game.bet.toFixed(2)}</td>
                <td>${game.colorBet}</td>
                <td>${game.finalColor}</td>
                <td>${formattedProfitOrLoss}</td> <!-- Atualiza a célula de ganho/perda -->
                <td>${formattedSaldoAtual}</td> <!-- Atualiza a célula de saldo atual -->
            `;

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        statsContainer.appendChild(table);
    }
}

function showGameScreen() {
    document.getElementById("gameScreen").style.display = "block";
    document.getElementById("statsScreen").style.display = "none"; // Esconder a tela de estatísticas
}

function loadStats() {
    if (specialSession) {
        // Não carrega estatísticas anteriores
        gameHistory = [];
        saldoAtual = initialBalance;
        rodadas = 0;
        return;
    }
    const storedHistory = localStorage.getItem(`${user}_history`);
    if (storedHistory) {
        gameHistory = JSON.parse(storedHistory);
        saldoAtual = gameHistory.reduce((acc, game) => acc + game.profitOrLoss, initialBalance);
        rodadas = gameHistory.length;
    } else {
        gameHistory = [];
        saldoAtual = initialBalance;
        rodadas = 0;
    }
    updateInfo();
}

function updateInfo(applyColorToLabels = true, designOption = 2, applyBackgroundToSections = true) {
    // Update balance and rounds (comum para ambos designs)
    document.getElementById('balance').textContent = saldoAtual.toFixed(2);
    document.getElementById('currentRound').textContent = rodadas;

    // Check for Group 1 restrictions (no access to design 2 or 'Ganho/Perda')
    if (userControlGroup == 1 && designOption === 2) {
        designOption = 1; // Force to design 1 for Group 1
    }

    // Alternar entre designs (assegure que 'Ganho/Perda' seja escondido para Grupo 1)
    if (designOption === 1) {
        document.getElementById('design1').style.display = 'block';
        document.getElementById('design2').style.display = 'none';
    } else if (designOption === 2 && userControlGroup !== 1) {
        document.getElementById('design1').style.display = 'none';
        document.getElementById('design2').style.display = 'block';
    }

    // Obter o último resultado do jogo
    let lastGame = gameHistory[gameHistory.length - 1];
    let formattedRoundResult = "-"; // Inicialmente sem resultado
    let roundResultColor = ''; // Cor neutra antes do primeiro resultado
    let totalGainsLossesColor = ''; // Cor neutra para ganho/perda inicialmente

    if (lastGame) {
        let roundProfitOrLoss = lastGame.profitOrLoss;
        formattedRoundResult = roundProfitOrLoss > 0
            ? `+R$${Math.abs(roundProfitOrLoss).toFixed(2)}`
            : `-R$${Math.abs(roundProfitOrLoss).toFixed(2)}`;
        roundResultColor = roundProfitOrLoss > 0 ? 'green' : 'red';
    }

    let totalGainsLosses = saldoAtual - initialBalance;
    let formattedTotalGainsLosses = totalGainsLosses === 0
        ? 'R$' + totalGainsLosses.toFixed(2)
        : (totalGainsLosses > 0 ? '+R$' : '-R$') + Math.abs(totalGainsLosses).toFixed(2);

    // Para evitar que o campo "Ganho/Perda" comece verde com valor 0, aplicamos cor apenas após a primeira rodada.
    if (rodadas === 0) {
        totalGainsLossesColor = ''; // Deixar neutro até a primeira rodada
    } else {
        totalGainsLossesColor = totalGainsLosses >= 0 ? 'green' : 'red';
    }

    // Atualizar os elementos com base no design selecionado
    if (designOption === 1) {
        document.getElementById('roundResult').textContent = formattedRoundResult;
        document.getElementById('totalGainsLosses').textContent = formattedTotalGainsLosses;
    } else if (designOption === 2) {
        document.getElementById('roundResult2').textContent = formattedRoundResult;
        document.getElementById('totalGainsLosses2').textContent = formattedTotalGainsLosses;
    }

    // Aplicar cores com base no grupo de controle
    if (userControlGroup == 3) {
        if (applyColorToLabels) {
            // Aplicar cor aos rótulos e aos valores
            if (designOption === 1) {
                document.getElementById('resultado-label').style.color = roundResultColor;
                document.getElementById('ganhoPerda-label').style.color = totalGainsLossesColor;
                document.getElementById('roundResult').style.color = roundResultColor;
                document.getElementById('totalGainsLosses').style.color = totalGainsLossesColor;
            } else if (designOption === 2) {
                document.getElementById('resultado-label2').style.color = roundResultColor;
                document.getElementById('ganhoPerda-label2').style.color = totalGainsLossesColor;
                document.getElementById('roundResult2').style.color = roundResultColor;
                document.getElementById('totalGainsLosses2').style.color = totalGainsLossesColor;
            }
        } else {
            // Aplicar cor apenas aos valores
            if (designOption === 1) {
                document.getElementById('roundResult').style.color = roundResultColor;
                document.getElementById('totalGainsLosses').style.color = totalGainsLossesColor;
                document.getElementById('resultado-label').style.color = '';
                document.getElementById('ganhoPerda-label').style.color = '';
            } else if (designOption === 2) {
                document.getElementById('roundResult2').style.color = roundResultColor;
                document.getElementById('totalGainsLosses2').style.color = totalGainsLossesColor;
                document.getElementById('resultado-label2').style.color = '';
                document.getElementById('ganhoPerda-label2').style.color = '';
            }
        }

        // Aplicar cor de fundo nas seções com base na variável applyBackgroundToSections
        if (applyBackgroundToSections && lastGame) {
            if (designOption === 2) {
                const resultadoSection = document.getElementById('resultado-section');
                const ganhoPerdaSection = document.getElementById('ganho-perda-section');

                // Remover classes de fundo existentes
                resultadoSection.classList.remove('green-background', 'red-background');
                ganhoPerdaSection.classList.remove('green-background', 'red-background');

                // Aplicar fundo colorido com base nos resultados
                resultadoSection.classList.add(lastGame.profitOrLoss > 0 ? 'green-background' : 'red-background');
                ganhoPerdaSection.classList.add(totalGainsLosses >= 0 ? 'green-background' : 'red-background');
            }
        } else {
            // Remover fundo colorido se a variável applyBackgroundToSections for false
            if (designOption === 2) {
                document.getElementById('resultado-section').classList.remove('green-background', 'red-background');
                document.getElementById('ganho-perda-section').classList.remove('green-background', 'red-background');
            }
        }

    } else {
        // Restaurar a cor padrão para os outros grupos
        if (designOption === 1) {
            document.getElementById('roundResult').style.color = '';
            document.getElementById('totalGainsLosses').style.color = '';
            document.getElementById('resultado-label').style.color = '';
            document.getElementById('ganhoPerda-label').style.color = '';
        } else if (designOption === 2) {
            document.getElementById('roundResult2').style.color = '';
            document.getElementById('totalGainsLosses2').style.color = '';
            document.getElementById('resultado-label2').style.color = '';
            document.getElementById('ganhoPerda-label2').style.color = '';
            document.getElementById('resultado-section').classList.remove('green-background', 'red-background');
            document.getElementById('ganho-perda-section').classList.remove('green-background', 'red-background');
        }
    }
}

window.onload = function() {
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
        user = savedUsername;
        loadStats();
        startGame();
    }
}

// Função para limpar os dados salvos
document.getElementById('clearDataBtn').addEventListener('click', function() {
    if (confirm('Você tem certeza que deseja limpar todos os dados?')) {
        // Remove dados específicos do usuário
        localStorage.removeItem(`${user}_history`);
        localStorage.removeItem(`${user}_controlGroup`);
        localStorage.removeItem(`${user}_roundResults`);
        localStorage.removeItem(`${user}_currentRound`);
        // Se desejar deslogar o usuário, descomente a linha abaixo
        // localStorage.removeItem('username');

        localStorage.clear();
        alert('Dados limpos com sucesso!');
        location.reload(); // Recarrega a página para atualizar as estatísticas
        returnToLogin()
    }
});


// Função para exportar os dados da tabela para um arquivo Excel
document.getElementById('exportExcelBtn').addEventListener('click', function() {
    // Verifica se há dados no localStorage
    const storedHistory = localStorage.getItem(`${user}_history`);
    if (!storedHistory) {
        alert('Não há dados para exportar.');
        return;
    }

    let table = document.getElementById('statsTable');
    let wb = XLSX.utils.table_to_book(table, {sheet: "Estatísticas"});

    // Adiciona uma nova aba com informações do jogador
    let wsInfo = XLSX.utils.json_to_sheet([
        { Informação: "Nome do Jogador", Valor: user || "Não Logado" },
        { Informação: "Grupo do Jogador", Valor: userControlGroup },
        { Informação: "Saldo Inicial", Valor: initialBalance },
        { Informação: "Número de Rodadas", Valor: rodadas },
        { Informação: "Saldo Atual", Valor: saldoAtual.toFixed(2) },
        { Informação: "Total Ganho/Perda", Valor: (saldoAtual - initialBalance).toFixed(2) }
    ]);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Informações");

    let wbout = XLSX.write(wb, {bookType: 'xlsx', type: 'binary'});

    function s2ab(s) {
        let buf = new ArrayBuffer(s.length);
        let view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }

    // Obtém a data e hora atual
    let now = new Date();
    let day = String(now.getDate()).padStart(2, '0');
    let month = String(now.getMonth() + 1).padStart(2, '0'); // Meses começam do 0
    let year = now.getFullYear();
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Personaliza o nome do arquivo com o nome do jogador, data e hora
    let fileName = `${user || 'Convidado'}_grupo${userControlGroup}_estatisticas_${day}-${month}-${year}_${hours}-${minutes}-${seconds}.xlsx`;
    saveAs(new Blob([s2ab(wbout)], {type: "application/octet-stream"}), fileName);
});

function showNotification(message, result) {
    const notification = document.createElement('div');
    notification.className = 'notification';

    const messageElement = document.createElement('span');
    messageElement.className = 'message';
    messageElement.textContent = message;
    notification.appendChild(messageElement);

    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    if (result === true) {
        progressBar.style.backgroundColor = '#28a745'; // Verde
    } else if (result === false) {
        progressBar.style.backgroundColor = '#dc3545'; // Vermelho
    }

    progressBarContainer.appendChild(progressBar);
    notification.appendChild(progressBarContainer);

    document.body.appendChild(notification);

    notification.style.display = 'flex';
    void notification.offsetWidth;
    notification.classList.add('show');

    // Ajusta a duração da animação da barra de progresso
    progressBar.style.transition = `width ${notificationDuration / 1000}s linear`;

    setTimeout(() => {
        progressBar.style.width = '0%';
    }, 0);

    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');

        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, notificationDuration);
}

// Função para alternar a roleta viciada
function toggleRiggedWheel() {
    clickCount++;
    
    if (clickCount >= 5) {
        clickCount = 0; // Reseta o contador de cliques
        isRigged = !isRigged; // Alterna o estado da roleta viciada
        alert(`Roleta viciada ${isRigged ? 'ativada!' : 'desativada!'}`);
    }
}

// Adiciona o evento de clique à div com o ID 'userDisplay'
document.getElementById('userDisplay').addEventListener('click', toggleRiggedWheel);

function updateUIForControlGroup() {
    if (userControlGroup == 1) {
        // Grupo 1: Sem a variável ganho/perda aparente e sem mudança na cor
        document.getElementById('totalGainsLosses').parentElement.style.display = 'none';
        document.getElementById('roundResult').style.color = '';
        document.getElementById('totalGainsLosses').style.color = '';
    } else if (userControlGroup == 2) {
        // Grupo 2: Variáveis aparentes, porém sem mudança na cor
        document.getElementById('totalGainsLosses').parentElement.style.display = '';
        document.getElementById('roundResult').style.color = '';
        document.getElementById('totalGainsLosses').style.color = '';
    } else if (userControlGroup == 3) {
        // Grupo 3: Variáveis aparentes, com mudança na cor em resultado e ganho/perda
        document.getElementById('totalGainsLosses').parentElement.style.display = '';
        // A mudança de cor será gerenciada na função updateInfo()
    }
}