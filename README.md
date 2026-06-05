# 🌐 SemFila - Sistema de Atendimento Inteligente em Tempo Real

O **SemFila** é uma plataforma moderna e inteligente de gerenciamento de filas virtuais de atendimento. O sistema permite que clientes entrem em filas de serviços de forma remota ou presencial (via QR Code) e acompanhem seu tempo estimado de espera através de um cronômetro regressivo dinâmico atualizado segundo a segundo, tudo isso integrado a previsões matemáticas de tráfego baseadas na geolocalização do usuário.

O ecossistema é construído usando uma arquitetura distribuída e resiliente, utilizando **.NET 8** no backend, **React (Vite) com Tailwind CSS** no frontend, cache/mensageria local com **Redis**, banco de dados **MySQL** e comunicação bidirecional em tempo real acionada por **Microsoft SignalR**. Todo o ambiente é orquestrado nativamente em contêineres **Docker**.

---

## 🚀 Funcionalidades Principais

- **⏱️ Timer Regressivo Vivo**: O tempo de espera estimado para atendimento de cada ticket é calculado de forma dinâmica pelo servidor e decrementado segundo a segundo no painel do cliente. O cálculo é imutável a reinicializações de página, pois ancora-se no timestamp absoluto de entrada e na posição da fila.
- **🚗 Telemetria Híbrida de Locomoção**: O sistema captura a geolocalização do dispositivo cliente e calcula, em background, a distância e o tempo estimado de viagem (ETA) até o estabelecimento físico. Utiliza a API do **Google Maps Distance Matrix** com um algoritmo matemático de segurança (_Haversine_) como mecanismo de fallback automático.
- **💡 Alertas Preditivos de Saída**: O painel notifica visualmente o usuário quando sua janela de margem segura de deslocamento está prestes a expirar, emitindo um alerta pulsante para que ele inicie o trajeto imediatamente.
- **⚡ Sincronização em Tempo Real (SignalR)**: Movimentações na fila, criação de novos serviços e chamadas de senhas nos painéis dos guichês físicos são propagadas instantaneamente para todas as pontas conectadas, com gerenciamento ativo do ciclo de vida de WebSockets (_cleanup_ automático no desmonte de componentes).
- **🔒 Gerenciamento de Filas Públicas e Privadas**: Suporte a filas de acesso remoto (públicas) e filas que exigem validação de presença local (privadas) geridas através de identificadores alfanuméricos curtos e tokens de acesso validados via modais dinâmicos.
- **🛡️ Autenticação Segura (RBAC)**: Controle de acesso baseado em perfis utilizando tokens JWT (JSON Web Tokens) com tratamento de fuso horário em `DateTime.UtcNow`. Isola de forma estrita as operações administrativas de gestão de guichês e chamadas de senhas das ações comuns de clientes.

---

## 🛠️ Stack Tecnológica

### Backend

- **Plataforma**: .NET 8 (ASP.NET Core Web API / Minimal APIs)
- **Persistência**: Entity Framework Core (MySQL)
- **Mecanismo de Cache**: Distributed Redis Cache
- **Comunicação Real-Time**: Microsoft SignalR (Hubs)
- **Segurança**: Autenticação e Autorização baseada em Perfis via JWT (Bearer Tokens) e Criptografia BCrypt
- **Integração**: Google Maps Distance Matrix API

### Frontend

- **Framework**: React.js (Vite)
- **Estilização**: Tailwind CSS
- **Cliente HTTP**: Axios (com interceptors para injeção de tokens e cancelamento seguro de requisições pendentes no logout)
- **Gerenciamento de Estado**: Hooks Nativos (`useState`, `useEffect` com travas contra _race conditions_ de rede)

---

## 🏗️ Arquitetura e Infraestrutura (Docker)

O ecossistema é 100% conteinerizado e centralizado. As variáveis de ambiente do banco de dados, chaves criptográficas do JWT e portas de comunicação são gerenciadas centralmente por um arquivo `.env` localizado na raiz do ecossistema.

A inicialização do backend conta com um mecanismo de **Resiliência de Inicialização (Healthcheck)** acoplado ao Docker Compose, garantindo que a API só inicie suas atividades após o servidor MySQL ter concluído a montagem dos arquivos estruturais de disco, mitigando falhas de quebra de conexão (Erros 500/CORS). Ademais, a API executa verificações via `context.Database.IsRelational()` no startup para aplicar as _migrations_ e o _seeding_ automático de dados de forma segura.

---

## 🧪 Qualidade de Software & Testes Automatizados

Para garantir a estabilidade das regras de negócio, o projeto conta com uma suíte abrangente de **41 testes automatizados**, divididos entre:

- **Testes Unitários (Controladores e Regras de Negócio)**: Validação isolada de lógicas de ordenação de posições, geração automática de senhas com prefixos textuais da fila, cancelamento em cascata e restrição de entrada única por usuário. Utiliza `xUnit`, `Moq` para isolamento de dependências e `InMemoryDatabase` gerenciado por uma fábrica de contextos limpos (`InMemoryDbFactory`) com nomes aleatórios via GUID.
- **Testes de Integração (End-to-End no Servidor)**: Utiliza `Microsoft.AspNetCore.Mvc.Testing` para subir um servidor virtual da aplicação em memória, testando o ciclo completo de middlewares de rede, injeção de dependências e barreiras de segurança do Token JWT gerado através de uma fábrica de claims simulada (`JwtTokenMockFactory`).

As validações de asserção são escritas sob o padrão fluente de arquitetura utilizando a biblioteca `FluentAssertions`.

---

## 🗄️ Modelo de Dados Relacional

A arquitetura do banco de dados do **SemFila** é projetada para manter integridade e consistência, utilizando chaves primárias e estrangeiras bem delineadas para gerenciar o histórico de chamadas.

- **USUARIOS**: Cadastro central de contas, hashes de senha (BCrypt) e papéis administrativos (`Admin` ou `Cliente`). O ecossistema nasce populado nativamente com um usuário administrador padrão (`admin@filazero.com`) via cargas automáticas do EF Core.
- **FILAS**: Configurações de serviços, coordenadas de geolocalização e regras de tempo médio por pessoa.
- **GUICHES**: Pontos físicos ativos operados pelos atendentes para processar as senhas.
- **ATENDIMENTOS**: Entidade transacional central que monitora o ciclo de vida e a posição atual de cada ticket gerado (`Aguardando`, `Chamado`, `Finalizado` ou `Cancelado`).

---

## ⚙️ Pipelines de CI/CD (GitHub Actions)

O repositório está equipado com um fluxo de **Integração Contínua (CI)** unificado que roda testes e checagens automatizadas em paralelo dentro de contêineres Linux isolados a cada `push` ou `pull_request` nas branches primárias:

- **Job Backend**: Executa a restauração de pacotes NuGet, roda a suíte de testes automatizados via `dotnet test` e valida a integridade de compilação do projeto .NET em modo _Release_.
- **Job Frontend**: Valida erros de linting, instala dependências via `npm ci` e testa a montagem do build de produção do ecossistema React + Vite.

---

## 📦 Como Executar o Projeto Localmente

### Pré-requisitos

- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados na máquina.

### Passos para Execução

1. **Clonar o Repositório:**

   ```bash
   git clone [https://github.com/JoaoPedroS05/SemFila.git](https://github.com/JoaoPedroS05/SemFila.git)
   cd SemFila

   ```

2. **Configurar as Variáveis de Ambiente:**
   Crie um arquivo .env na raiz do projeto (mesmo nível do arquivo docker-compose.yml) e configure as credenciais da aplicação de acordo com o modelo abaixo:

   ```bash
   MYSQL_ROOT_PASSWORD=suasenha
       JWT_SECRET=SUPER_SECRET_KEY_PROJETO_FILA_ZERO_VALIDACAO_2026
   JWT_EXPIRY_IN_MINUTES=60
   VITE_API_URL=http://localhost:5033/api
   VITE_GOOGLE_MAPS_KEY=COLOQUE_SUA_CHAVE_AQUI
   ```

   O backend também tenta carregar o arquivo `.env` localmente a partir da pasta `backend` ou da raiz do projeto.

3. **Subir o Ecossistema via Docker:**
   Execute o comando abaixo para baixar as imagens oficiais, construir os contêineres customizados da API e do Frontend, configurar as redes virtuais e inicializar toda a malha de serviços:

   ```bash
   docker compose up --build -d
   ```

4. **Acessar a Aplicação:**
   Assim que os contêineres estiverem no estado Healthy, as aplicações estarão disponíveis nos seguintes endereços locais:

   Frontend (Interface Web React): http://localhost:5173

   Backend (Swagger/API .NET 8): http://localhost:5080/swagger

   Servidor de Banco de Dados (MySQL): Porta local 3307

5. **Acesso Administrativo Padrão (Seed Inicial):**
   Para testar o fluxo de gerenciamento de painéis e chamadas de senhas, utilize as credenciais padrão inseridas na carga inicial do banco de dados:

   E-mail: admin@filazero.com

   Senha: admin123

   ## 🧪 Como Executar os Testes Localmente\*\*

   Caso queira disparar os testes unitários e de integração manualmente através do terminal da sua máquina de desenvolvimento, certifique-se de possuir o .NET SDK 8.0 instalado e execute os comandos:

   ```Bash
   cd backend.Tests
   dotnet restore
   dotnet test
   ```
