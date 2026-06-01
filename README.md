# 🌐 SemFila - Sistema de Atendimento Inteligente em Tempo Real

O **SemFila** é uma plataforma moderna e inteligente de gerenciamento de filas virtuais de atendimento. O sistema permite que clientes entrem em filas de serviços de forma remota ou presencial (via QR Code) e acompanhem seu tempo estimado de espera através de um cronômetro regressivo dinâmico atualizado segundo a segundo, tudo isso integrado a previsões matemáticas de tráfego baseadas na geolocalização do usuário.

O ecossistema é construído usando uma arquitetura distribuída, utilizando **.NET 8** no backend, **React (Vite) com Tailwind CSS** no frontend e comunicação bidirecional em tempo real acionada por **Microsoft SignalR**.

---

## 🚀 Funcionalidades Principais

*   **⏱️ Timer Regressivo Vivo**: O tempo de espera estimado para atendimento de cada ticket é calculado de forma dinâmica pelo servidor e decrementado segundo a segundo no painel do cliente. O cálculo é imutável a reinicializações de página, pois ancora-se no timestamp absoluto de entrada e na posição da fila.
*   **🚗 Telemetria Híbrida de Locomoção**: O sistema captura a geolocalização do dispositivo cliente e calcula, em background, a distância e o tempo estimado de viagem (ETA) até o estabelecimento físico. Utiliza a API do **Google Maps Distance Matrix** com um algoritmo matemático de segurança (*Haversine*) como mecanismo de fallback automático.
*   **💡 Alertas Preditivos de Saída**: O painel notifica visualmente o usuário quando sua janela de margem segura de deslocamento está prestes a expirar, emitindo um alerta pulsante para que ele inicie o trajeto imediatamente.
*   **⚡ Sincronização em Tempo Real (SignalR)**: Movimentações na fila, criação de novos serviços e chamadas de senhas nos painéis dos guichês físicos são propagadas instantaneamente para todas as pontas conectadas, sem necessidade de polling ou refresh manual.
*   **🔒 Gerenciamento de Filas Públicas e Privadas**: Suporte a filas de acesso remoto (públicas) e filas que exigem validação de presença local (privadas) geridas através de identificadores alfanuméricos curtos projetados para totens de QR Code.
*   **🛡️ Autenticação Segura (RBAC)**: Controle de acesso baseado em perfis utilizando tokens JWT (JSON Web Tokens), isolando as operações administrativas de gestão de guichês e chamadas de senhas das ações comuns de clientes.

---

## 🛠️ Stack Tecnológica

### Backend
*   **Plataforma**: .NET 8 (ASP.NET Core Web API)
*   **Persistência**: Entity Framework Core
*   **Comunicação Real-Time**: Microsoft SignalR
*   **Segurança**: Autenticação e Autorização via JWT (Bearer Tokens)
*   **Integração**: Google Maps Distance Matrix API

### Frontend
*   **Framework**: React.js (Vite)
*   **Estilização**: Tailwind CSS
*   **Cliente HTTP**: Axios (com interceptors para injeção automática de tokens)
*   **Gerenciamento de Estado**: Hooks Nativos (`useState`, `useEffect`, gerenciamento de matrizes de timers)

---

## 🗄️ Modelo de Dados Relacional

A arquitetura do banco de dados do **SemFila** é projetada para manter integridade e consistência, utilizando chaves primárias e estrangeiras bem delineadas para gerenciar o histórico de chamadas.

*   **USUARIOS**: Cadastro central de contas, hashes de senha e papéis administrativos (`Admin` ou `Cliente`).
*   **FILAS**: Configurações de serviços, coordenadas de geolocalização e regras de tempo médio por pessoa.
*   **GUICHES**: Pontos físicos ativos operados pelos atendentes para processar as senhas.
*   **ATENDIMENTOS**: Entidade transacional central que monitora o ciclo de vida e a posição atual de cada ticket gerado (`Aguardando`, `Chamado`, `Finalizado` ou `Cancelado`).

---

## ⚙️ Pipelines de CI/CD (GitHub Actions)

O repositório está equipado com um fluxo de **Integração Contínua (CI)** unificado que roda testes e checagens automatizadas em paralelo dentro de contêineres Linux isolados a cada `push` ou `pull_request` nas branches primárias:

*   **Job Backend**: Executa a restauração de pacotes NuGet e valida a integridade de compilação do projeto .NET em modo *Release*.
*   **Job Frontend**: Valida erros de linting, instala dependências via `npm ci` e testa a montagem do build de produção do ecossistema React + Vite.

---

## 📦 Como Executar o Projeto Localmente

### Pré-requisitos
*   [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
*   [Node.js (versão 18 ou superior)](https://nodejs.org/)
*   Banco de dados compatível (Configurado via Entity Framework no DataContext)

### 1. Clonar o Repositório
```bash
git clone [https://github.com/JoaoPedroS05/SemFila.git](https://github.com/JoaoPedroS05/SemFila.git)
cd SemFila

cd backend

# Configure suas chaves e string de conexão em appsettings.Development.json
# Aplique as migrations para estruturar o banco de dados
dotnet ef database update

# Execute a API
dotnet run

cd frontend

# Instale as dependências de pacotes do Node
npm install

# Execute o ambiente de desenvolvimento local do Vite
npm run dev
```
