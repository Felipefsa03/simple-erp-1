# Documento Técnico de Auditoria, Correção e Hardening - Sistema ERP Clínico

## Objetivo Principal
- ✅ **Deixar o sistema 100% funcional**
- ✅ **Eliminar falhas, módulos soltos e quebras de fluxo**
- ✅ **Garantir integração perfeita**: agenda → prontuário → financeiro → estoque
- ✅ **Corrigir bugs visíveis de UI**
- ✅ **Revisar lógica técnica**
- ✅ **Garantir consistência de eventos e estados**
- ✅ **Preparar para escala real**

---

## 📌 1. REVISÃO GLOBAL DO SISTEMA (AUDITORIA COMPLETA)
Esta seção mapeia os principais gargalos e pontos de atenção para estabilização sistêmica.

**Levantamento de Problemas Evidenciados:**
- **Bugs funcionais**: Ações que disparam erros silenciosos no console ou falham no backend gerando quebras no frontend.
- **Botões quebrados e Ações Inertes**: CTAs (Call to Actions) sem manipuladores de evento ou perdidos por refatoração.
- **Falta de Feedback (Loading / Optimistic UI)**: Operações assíncronas que não sinalizam carregamento para a UI, causando incerteza no usuário.
- **Concorrência e Erros de Clique Duplo**: Múltiplas submissões de formulário ativadas repetidamente por falta de travamento (`disabled={isLoading}`).
- **Integração Isolada (Módulos Soltos)**: Entidades que realizam uma ação mas não disparam eventos ou gatilhos necessários nas tabelas dependentes.
- **Segurança e RLS Falhos**: Tabelas expostas, abrindo possibilidade de transbordamento de dados entre empresas (Cross-Tenant Leak).
- **Consultas (Queries) Mal Indexadas**: Falta de criação de índices para consultas frequentes ou compostas, gerando latência elevada.
- **Falhas de UX e Fluxos Incompletos**: Workflows labirínticos onde o usuário não tem feedback de erro adequado se algo falhar.
- **Falta de Idempotência no Financeiro**: Requisições de cobrança duplicadas que são geradas sem validação de chaves únicas transacionais.
- **Falta de Bloqueio Pós-Finalização**: Prontuários permitindo edições destrutivas após a alta ou pagamento.

---

## 📅 2. FLUXO COMPLETO DE ATENDIMENTO
A espinha dorsal do sistema precisa estar íntegra e sem interrupções manuais ou desnecessárias entre setores.

1. **Agendamento**: 
   - Recepcionista atende o paciente e agenda.
   - Seleção do profissional, procedimento e registro de `clinic_id`, `profissional_id`, `paciente_id` e `valor_base`.
2. **Check-in/Início**: Quando o horário se concretiza, o profissional aciona o início. Sistema muda status ativamente para `em_atendimento`.
3. **Execução do Atendimento (Prontuário Ativo)**:
   - Inserção de evolução/resumo clínico detalhado.
   - Possibilidade de adicionar múltiplos procedimentos extras na hora.
   - Mapeamento e alocação de itens de estoque vinculados usados na sessão.
   - Adição de mídias/fotos.
   - Definição do plano de tratamento futuro.
4. **Finalização e Trava (Lock)**:
   - O atendimento é finalizado pelo profissional.
   - Uma **Trava Rígida** é passada ao registro para bloquear edição direta e falsificação posterior.
   - Sistema gera os lançamentos a receber no financeiro derivados dos serviços prestados.
   - Sistema processa a baixa em cascata no estoque dos itens do procedimento.
   - SLA e tempo de atendimento do serviço são gravados.
5. **Redirecionamento ao Financeiro**: O workflow induz o paciente virtualmente da clínica real para o "Balcão" no sistema (checkout/financeiro).
6. **Contas a Receber Prontas**: O ambiente financeiro já exibe a estrutura total devida sem necessidade de digitação (Procedimentos + Materiais Repassados + Taxas).
7. **Cobrança / Faturamento**: Opções de Parcelamento, Pix Instantâneo via gateway, ou homologação de pagamento manual.
8. **Disparo de Eventos-Chave (Webhooks Internos/Event Bus)**:
   - `Atendimento_Finalizado` = Atualiza dashboards e engatilha baixas.
   - `Pagamento_Gerado` = Trava edições, emite notas (se aplicável), e projeta fluxo de caixa.

---

## 👨‍⚕️ 3. PROFISSIONAIS E REPASSE FINANCEIRO
O sistema deve ser uma ferramenta madura para o gestor e para o prestador parceiro.

- **Vínculos Dinâmicos**: O sistema permite a flexibilidade de locar profissionais por agendamento.
- **Comissionamento e Rentabilidade**:
  - Geração do cômputo de Receita Bruta alavancada pelo profissional.
  - Setup do percentual de comissão por modalidade/serviço.
  - Valor líquido repassado e conta corrente do profissional no final do mês.
- **Interface da Equipe**:
  - Clique na aba "Equipe" trará dados macro de cada especialista.
  - Estatísticas OBRIGATÓRIAS: Total Atendimentos (mês), Receita Global gerada, Ticket Médio do Prestador, Faltas de Pacientes (`No Show`), Comparecimentos, e Procedimentos com maior tração efetuados por tal credenciado.

---

## 📆 4. BUGS CRÍTICOS IDENTIFICADOS PARA CORREÇÃO

**4.1. Cadastro em Massa de Pacientes (Inoperante)**
- **Sintoma**: Botão sem evento disparado.
- **Implementação Técnica**: Incorporar `File Picker` conectando API de File System ou input escondido. Validar formatos `CSV/XLSX` (via SheetJS/PapaParse). Exibir tabela prévia (*Preview* Modal). Executar `bulk_insert` e retornar evento `Pacientes_Importados` para limpar cace no front.

**4.2. Gestão de Agenda Dia/Semana/Mês (Desatualização/Congelamento)**
- **Sintoma**: Interface do calendário não obedece cliques e impede navegação paralela.
- **Implementação Técnica**: Desacoplar estado local sujo e atrelar navegação nas Query Strings. Refazer liberação de *Swipe* (arrastar lateral). Implementar `Virtualization` de horários/dias para desempenho no navegador. Garantir revalidade em tempo real via `useQuery` no TanStack.

**4.3. Odontograma Digital (Confuso e Pequeno)**
- **Sintoma**: UI falhando em comunicar utilidade; não é intuitivo aos olhos do dentista.
- **Implementação Técnica**: Utilizar uma composição real vetorial (SVG estruturado) da arcada. Adicionar tipografia de bom tamanho para o padrão ISO dos dentes. Clicar no elemento visual não deve levar a outra página, e sim ascender um Side Modal contextual. Status definidos por preenchimento claro: Tratado (Azul), Pendente/Cárie (Vermelho), Extraído (Opacidade 50%/Cruz), etc.

---

## ⚙️ 5. CONFIGURAÇÕES DO LOJISTA (CLÍNICA)
Um módulo dinâmico adequado tanto para vertical **Odontológica** quanto **Clínica de Estética** e Derivados.

- **Cadastro de Serviços**: Estrutura contendo Nome, Grupo/Categoria, Custo Histórico Ponderado, Preço Sugerido e Tempo Padrão.
- **Bill of Materials (Materiais por Serviço)**: Todo serviço pode conter uma matriz de insumos consumidos.
- **Orçador Preditivo**: Permite elaboração de orçamento considerando a fórmula: (*Preço base do profissional* + *Preço de reposição do material* + *Margem/Markup desejada*).

---

## 💰 6. INTEGRAÇÃO ESTOQUE → ATENDIMENTO → FINANCEIRO
Pilar da automação ("Zero Toque Duplo").

- O processo se interlaça no preenchimento de Procedimentos (*Atendimento*). O sistema analisa a malha de materiais e sugere a relação de desconto de estoque de cada insumo correspondente.
- Finalização aprova a baixa real. Abastece a inteligência financeira (Custo do Atendimento *versus* Faturamento do Atendimento).
- Apuração em tempo real que desvia do modo tradicional de depender que um funcionário bata uma planilha e lance custos separadamente depois.

---

## 🧠 7. VALIDAÇÕES OBRIGATÓRIAS DE ENGENHARIA
Reforçando o core da aplicação em produção pesada:

- **Zod Schema Registry**: Camadas de validação antes de processar actions server-side.
- **Idempotência Garantida**: Prevenção total de duplicação financeira em retrys/timeouts de gateway.
- **Lock Transacional de DB**: Transações ACID. Atendimento Finalizado precisa ser executado dentro de um `BEGIN ... COMMIT;` blindando falhas de fase-metade do processo.
- **Gerenciador de Acesso / RLS (Row Level Security)**: Controle de acesso restrito e RLS no PostgreSQL em TODAS tabelas garantindo separação entre clientes multitenant base.

---

## 📊 8. HARDENING TÉCNICO E PERFORMANCE
- **Otimização de Índices (Index Tuning)**: Estabelecer índices para leitura pesada, principalmente compostos (`clinic_id` + `data`).
- **Análise de Lerdeza (Slow Queries)**: Ajustamento de queries demoradas e N+1.
- **Política de Retentativas e Limites**: *Edge functions* resilientes; *Rate Limiting* estipulado caso haja APIs de terceiros e fluxos abertos; prevenção Global *Anti-Double Click* (bloquear submissão quando estado é isPending / isSubmitting).

---

## 📱 9. UX - EXPERIÊNCIA E FLUIDEZ DO USUÁRIO OBRIGATÓRIAS
- Utilização agressiva de **Loading Indicators** (spinners nos botões de ação e esqueletos na tela - Skeleton Loaders).
- **Toast Feedbacks / Notificações On-Screen**: Usuário deve ser notificado categoricamente ("Prontuário salvo com sucesso", "Estoque insuficiente alerta!").
- **Optimistic UI**: A interface acata visualmente as ordens instantaneamente para remover latência e reverte sem o usuário precisar apertar "ok" num modal a cada milissegundo.
- **Uso de Drawers**: Interações periféricas devem flutuar em Drawer (lado esquerdo/direito) e não redirecionar e perder rota principal.
- **Zero Refresh de Página Completa**: Next.js App Router (ou infraestrutura SPA selecionada) operando corretamente de forma assíncrona.
- Abordagem de **Empty states** atraentes para o usuário recém-inscrito.
- Error Handling polido ("Ops! Algo deu errado") em vez de páginas quebradas (React Error Boundaries).

---

## 🔐 10. SEGURANÇA E AUDITORIA
- **Auditoria de Banco**: RLS ativo imperativo impedindo vizinhos de lerem dados, isolamento nativo.
- Sem extrações desgovernadas `SELECT *` sem condicional e autorização específica. Restrições ao máximo para vazamento nulo.
- Tabela de Auditoria (Immutable Audit Log) que empilha historicos críticos passivamente (Event Sourcing ou Triggers DB).
- Proibição via sistema de deletar fisicamente itens como Prontuários Clinicos (Soft-Delete Mandatório regido pela Lei de retenção Médica / Odonto).
- Escopo rígido de Permissões (RBAC): Recepcionista não enxerga Custo de Materiais ou Receita Macro, Médico não edita Financeiro ou configurações do ambiente, Dono da Clínica enxerga Tudo.

---

## ⚙️ 11. INFRAESTRUTURA E ARQUITETURA DETALHADA
Regras base de engenharia implementadas passo a passo.

1. **Definições de Infra**: Implantação provisionada. Camadas escaláveis em provedor primário (Vercel ou AWS) atuando de modo elástico, combinadas com banco nativo Serverless ou altamente disponível e protegido por SG/Firewalls privados, além de backups assíncronos rotineiros.
2. **Autenticação Avançada**: Provedores de identidade (OAuth, Custom JWT robusto) orquestrando camadas seguras e permissões RBAC a partir dos tokens expostos com curta vida.
3. **APIs e Front-Backend Agreement**: Serviços internos mapeados ou graphQL exposto de modo padronizado suportando testes em pontas independentes, verificando autorização ativa em requisição baseada no header Bearer.
4. **Camada de Validações Biz (Regras de Negócios)**: Execução implacável dessas lógicas exclusivas em camada de API pura com retornos de status code semânticos (400, 422, 403, 401, etc).
5. **Automação Pela Qualidade (Testes Máximos)**: Testes que provam se uma regra de cobrar 15% está viva de verdade (Unit Tests). Teste End-to-End da Recepção marcando visita até o caixa (E2E Tests com Cypress/Playwright).
6. **Logging Ativo**: Serviços externos de monitoramento (como Sentry ou ELK se aplicável) traçando e alarmando desvios na plataforma em tempo real se ocorrerem crashes de sistema.
7. **Compliance Jurídico (LGPD)**: Camadas obscuras criptografando informações altamente reativas do paciente se acessadas sem escopo, e mecanismos robustos na ponta do backend.
8. **Desenvolvimento Isolado e Preview (Homologação)**: A premissa de que "nada vai pra produçao até a equipe validar staging". 
9. **Pipelines CD/CI**: Construindo infraestruturas como GitHub/GitLab CI atuando de validador obrigatório antes da equipe permitir merge code, evitando que códigos quebrando fluxo afetem base de usuários.
10. **Documentação Viva e Pública/Privada**: Registros limpos ensinando desenvolvedores recém ingressos na arquitetura a continuarem a trilha usando Swagger para a interface técnica e Confluence/Notion para o negócio/manuais.

---

## 🚀 12. ROTEIRO DE DEPLOYMENT: O QUE FAZER PRIMEIRO (MASTER ROADMAP)
Visão seqüencial dos commits lógicos a serem aplicados pela engenharia na base real para atingir o objetivo final.

- **[PASSO 1] Autenticação e Perfis Base**: Criar Autenticação (Login, SingUp, Reset-Password), Middleware bloqueador e sistema inicial de ROLES (admin/user) na camada Server.
- **[PASSO 2] Locatários / Clínicas**: Implementar e refinar o CRUD do Tenancy "Clínicas" no back; configurar regras da relação Clínicas <-> Membros da equipe. Validar requerimentos.
- **[PASSO 3] Agendamento (O Motor)**: Criação lógica blindada. Vínculos e bloqueios de horários (Anti-Conflito). Lembretes ou Notifications em background (Mailhog/Resend via Fila) ligados ao ato criacional do agendamento.
- **[PASSO 4] Atendimento Seguro**: Finalizar interface focada no profissional e no odontograma + upload de documentações. Conectar isso diretamente aos pacientes.
- **[PASSO 5] O Fluxo Financeiro e Caixa**: Orquestrar a ramificação faturamentos. Integrar os serviços com pagamentos usando lógica segura vinculada aos Agendamentos executados com sucesso anteriormente. Geradores visuais via CSV/PDF do fluxo real.
- **[PASSO 6] Notificações Omni-Canal**: Consagrar os drivers de disparo do sistema provendo visibilidade ativa dos serviços finalizados ao paciente e proprietário no fluxo da ação em filas para não engarrafar requests de UI.
- **[PASSO 7] Segurança Plena (Locks Ocultos/Audit/Security)**: Implantar logs sobre manipulações financeiras fortes garantindo rastreio. Preparar endpoints finais documentados caso o front precise evoluir rápido sem frear o time de back e fechar escopo arquitetural.
- **[PASSO 8] Barricada de Testes Antes do Release**: Carga maciça de QA na bateria criada no ciclo anterior provando imutabilidade das travas. Produção liberada com excelência garantida.

---
**Fim do Documento Técnico e Executável.** Elaborado para o hardening total do ecossistema e unificação impecável dos módulos, provendo estabilidade comercial definitiva.
