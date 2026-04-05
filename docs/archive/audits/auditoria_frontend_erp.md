# Auditoria do Frontend e Guia de Integração com Backend (ERP LuminaFlow)

## 1. Visão Geral e Objetivo do Projeto

O **LuminaFlow** (Frontend atual em `simple-erp`) é uma aplicação Single Page Application (SPA) construída com React e Vite. O objetivo do projeto é servir como um Sistema ERP unificado para clínicas (focado fortemente em Odontologia/Estética), englobando gestão de pacientes, agenda, prontuário eletrônico completo (com odontograma), controle financeiro, gestão de estoque e ações de marketing. 

Atualmente, o projeto funciona de maneira autônoma com um "mock backend" interno em memória usando Zustand e um micro-servidor Express (`server/index.mjs`) que simula a comunicação com gateways externos (Asaas, Memed, etc.). O objetivo de longo prazo é substituir esse controle de estado efêmero por uma API de backend definitiva (Node/PHP/Go/etc.) e um banco de dados real (ex: PostgreSQL).

## 2. Mapa de Rotas e Funcionalidades

O frontend **não utiliza** uma biblioteca de roteamento tradicional (como `react-router-dom`). Em vez disso, ele controla o estado da "Aba Ativa" (`activeTab` dentro de `src/App.tsx`) para alternar os módulos sem recarregar a página.

### Rotas Privadas (Módulos do Sistema)
Renderizadas via controle de estado para usuários logados:

- **`dashboard` (Visão Geral)**: Exibe KPIs rápidos, resumo de faturamento, consultas do dia e atalhos rápidos.
- **`agenda` (Gestão de Agendamentos)**: Controle de horários por profissional. Modal de criação de agendamentos lidando com conflitos, status (confirmado, aguardando, etc.).
- **`pacientes` (Lista de Pacientes)**: Tabela contendo listagem completa de pacientes. Permite criação, edição e supostamente importação em massa.
- **`prontuarios` (Atendimento Clínico)**: Core médico/odontológico. Contém o odontograma, registro evolutivo, histórico de anamnese e atalho para prescrever medicações.
- **`financeiro` (Módulo Financeiro)**: Gestão de Contas a Receber, geração de faturas (Pix/Cartão/Boleto, integrando com o mock Asaas), fluxo de caixa e relatórios.
- **`estoque` (Controle de Materiais)**: Gerenciamento de insumos. Idealmente deve descontar automaticamente sempre que um procedimento é finalizado no Prontuário.
- **`marketing` (Campanhas e Integrações)**: Controle de disparos (WhatsApp/E-mail via RD Station) e rastreamento de conversão (Pixel da Meta/Google).
- **`configuracoes` (Ajustes da Clínica)**: Cadastro de serviços, preços base, comissionamento de profissionais e perfis de usuário.
- **`admin-*` (Super Admin)**: Áreas exclusivas para o dono da SaaS (painel de métricas da plataforma, gestão de clínicas assinantes, segurança).

### Rotas Públicas (Baseadas em Hash na URL)
Acessíveis sem autenticação para engajamento de pacientes externos:

- **`#book-online`**: Interface para que o paciente agende sua própria consulta digitalmente (`OnlineBookingPage`).
- **`#anamnese-form`**: Formulário de pré-consulta para o paciente preencher em casa antes de ir à clínica (`PublicAnamneseForm`).
- **`/` (Landing Page)**: Página institucional de login e apresentação comercial.

## 3. Auditoria de Estrutura e Arquitetura de Software

### ✅ Pontos Positivos (Forças)
- **Stack Moderno e Performático**: React 19 + Vite garantem builds extremamente rápidos.
- **Tailwind CSS v4**: Utilizado para estilização atômica, garantindo consistência visual e um padrão estético de altíssima qualidade (Glassmorphism, gradientes, responsividade).
- **TanStack Query (React Query)**: Já configurado no `package.json`. Excelentíssima escolha para lidar com estado advindo do servidor (facilita muito a integração com o backend real amanhã).
- **Arquitetura de Domínios (Domain-Driven UI)**: O diretório `src/domains/` empacota a lógica de maneira coesa. Cada módulo (agenda, estoque) cuida de si mesmo, o que evita a síndrome de "componentes globais inchados".
- **Comunicação por Event Bus**: O uso de Zustand (`useEventBus.ts`) para despachar eventos (ex: `ATENDIMENTO_FINALIZADO` avisar o Financeiro) é genial para desacoplar a arquitetura Front-end.

### ⚠️ Pontos de Atenção (Gargalos atuais)
- **Falta de URL real nas rotas internas**: O usuário não consegue compartilhar um link (ex: `/paciente/123`) com a recepcionista, pois tudo roda na mesma rota mapeando botões. Isso quebra navegações naturais do browser (Botão Voltar/Avançar). Sugere-se migrar para `react-router-dom` em breve.
- **Lógica Mista no Front-end**: O frontend atualmente possui regras do negócio soltas no Zustand (`stores/`), calculando métricas e tomando decisões de domínio, que deveriam ser migradas estritamente para o Backend.
- **Micro-servidor Inseguro**: O Express em `server/index.mjs` expõe chaves e lógica de gateway de forma prototipada.

## 4. Passo a Passo: Integrando o Backend Real ao Frontend

Para que o Backend possa plenamente suportar e substituir o contexto temporário do Frontend, a Engenharia precisa seguir esta ordem macro de execução estrutural:

### Fase 1: Fundação do Backend (Estrutura e Banco)
1. **Modelagem do Banco de Dados**: Criar as migrations (no framework escolhido: Laravel, NestJS, etc.) baseadas nos dados do frontend atual: `User/Profissional`, `Clinic`, `Patient`, `Appointment`, `FinancialTransaction`, `StockItem`.
2. **Setup do Servidor Backend e Roteamento**: Iniciar a aplicação servidora protegida por CORS aceitando requisições do frontend React.
3. **Autenticação (JWT)**: Desenvolver endpoints de `/login` e `/refresh`. Modificar o arquivo `src/hooks/useAuth.tsx` no front para parar de injetar usuários falsos e bater no endpoint real, armazenando adequadamente o token no Cookie ou Local Storage seguro.

### Fase 2: CRUDs Básicos (Substituindo o Zustand)
1. **Clínicas e Configurações**: Endpoints RESTful completos. Modificar o módulo `configuracoes` no frontend usando React Query (`useQuery`, `useMutation`) para ler da API.
2. **Pacientes**: Rota `GET /patients` com paginação, buscas avançadas e rota de `POST /patients` (incluindo o uploader CSV que foi pontuado na auditoria macro).
3. **Estoque e Catálogo de Serviços**: Fazer o sistema de materiais ler as tabelas reais do banco.

### Fase 3: Regras de Negócio e Agendamento
1. **Motor de Agendamentos**: Substituir a array local de `confirmations` para a tabela real. O Backend passa a ser o senhor da validação de conflitos de horários (retornando 422 Unprocessable Entity caso o profissional esteja ocupado).
2. **Prontuário e Odontograma**: Mapear as áreas do dente para o banco de dados via JSON ou estrutura relacional. Implementar Soft Deletes (requisito médico de "Não apagar nada").

### Fase 4: Financeiro e Ações Críticas (Hardening)
1. **Motor Financeiro Definitivo**: Migrar toda a premissa de `server/index.mjs` (integração Asaas) estritamente para o ambiente seguro do backend. Nenhuma chave do Asaas deve permanecer visível perto da pasta do frontend. As chamadas do front vão para a SUA API, que enfileira a ordem e bate no gateway de forma atômica e com *retry policy*.
2. **Integrar os Gatilhos (Workflows)**: O Backend fará o que hoje o EventBus faz no front: Quando chamar `POST /appointments/{id}/finish` → O Backend dá baixa no estoque automaticamente, gera a conta a receber, recalcula comissões, e retorna Sucesso.
3. **Refatoração no React Query (Front)**: Limpar o frontend de funções pseudo-banco (`mutateStore` e simuladores locais), atrelando as requisições aos Endpoints definitivos. 
4. **Testes e Deploy**: Executar E2E flows garantindo que a emissão de nota até o odontograma funcione sincronizadamente usando o BD online.
