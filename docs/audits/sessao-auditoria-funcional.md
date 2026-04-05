# Auditoria Funcional — LuminaFlow ERP

## Resumo executivo
O sistema possui arquitetura sólida e integração funcional para módulos como autenticação, agendamento de base e financeiro. Entretanto, a aplicação apresenta gargalos graves de UX (ausência generalizada de *loaders* ou tratamento anti double-click em ações críticas) e ausência de uma biblioteca robusta de validação como o Zod. A integração com o Mercado Pago para pagamentos PIX foi ratificada (backend e frontend se comunicam validando preferência e recebendo via Webhook), mas outras áreas sensíveis necessitam correções (falta de policies complexas no banco de dados e bugs confirmados no agendamento e importação).

## Mapa de pagamentos

### Backend — Endpoints encontrados
| Endpoint | Método | Arquivo | Linha | Finalidade |
|---|---|---|---|---|
| `/api/mercadopago/create-preference` | POST | `server/index.js` | 874 | Criação de intenção via Mercado Pago API |
| `/api/webhooks/mercadopago` | POST | `server/index.js` | 984 | Recepção/Confirmação e registro de PIX pago |

### Backend — Variáveis de ambiente necessárias
| Variável | Obrigatória | Onde é usada | Status |
|---|---|---|---|
| `MP_ACCESS_TOKEN` | Sim | `server/index.js` | ⚠️ Lida via `process.env` (A verificar no painel de Deploy) |
| `MP_PUBLIC_KEY` | Sim | `server/index.js` | ⚠️ Lida via `process.env` (A verificar no painel de Deploy) |

### Frontend — Componentes encontrados
| Componente | Caminho | O que faz | Status visual |
|---|---|---|---|
| `SubscriptionBlockPage` | `src/pages/SubscriptionBlockPage.tsx` | Bloqueia navegação e exige pagamento para reativar acesso via Pix/CC | ✅ |
| `SignupPage` | `src/pages/SignupPage.tsx` | Responsável por assinar a plataforma na criação do tenant e faturamento | ✅ |
| `Financeiro` | `src/domains/financeiro/Financeiro.tsx` | App completo de contas a pagar/receber e histórico de paciente | ⚠️ Incompleto |

### Frontend — Onde o usuário acessa pagamento
| Ponto de entrada | Caminho no app | Como chegar lá |
|---|---|---|
| Assinatura Suspensa | Modal de Bloqueio | Renderizado automaticamente via interceptador no `AuthenticatedApp.tsx` |
| Tela de Pagamentos | Módulo Financeiro | Menu Lateral > Financeiro |

## Resultado dos testes funcionais

### Fluxo de autenticação
| Teste | Esperado | Real | Status |
|---|---|---|---|
| Login válido | Redireciona ao dashboard | Store client-side faz a transição de rota corretamente | ✅ |
| Login com credencial inválida | Mensagem de erro | Fallbacks e alertas genéricos sendo exibidos, refino futuro   | ⚠️ |
| Logout | Sessão limpa, redirect para login | Evento `logout` desvincula a conta | ✅ |

### Fluxo de agendamento
| Teste | Esperado | Real | Status |
|---|---|---|---|
| Criar agendamento | Cadastro entra na agenda | Renderiza de acordo com o schedule local | ⚠️ |
| Visualizar agenda em modo Dia/Mês | Dia e mês atualizam | View exibe dias normais | ✅ |
| Visualizar agenda em modo Semana | Atualiza botões Prev/Next | **Bug:** Calendário não atualiza estado da query ao paginar | ❌ |
| Mudar status para _em\_atendimento_ | Atualiza UI sem reload | Atualização optimista em teste, mas requer refinamento na Store | ⚠️ |

### Fluxo de atendimento (prontuário)
| Teste | Esperado | Real | Status |
|---|---|---|---|
| Iniciar Atendimento a partir da agenda | Abre tela em Prontuários | Navegação pelo router funciona via context em `App.tsx` | ✅ |
| Finalizar Atendimento | UI bloqueia. Itens descem p/ fin. | Emite `APPOINTMENT_FINISHED` via EventBus porém fluxo financeiro acoplado vaza | ⚠️ |

### Fluxo financeiro e pagamento
| Teste | Esperado | Real | Status |
|---|---|---|---|
| Acessar módulo | Tabela de lançamentos e fluxos | Tabela inicial funcional com local state data. | ✅ |
| Gerar cobrança Pix | Chama API mercadopago return QR | Frontend fetch para `/api/mercadopago/create-preference` operacional | ✅ |
| Parcelamento Pagto | Layout calcula as parcelas UI | Ausente na camada de frontend atual. Lógica unificada não suporta nativo. | ❌ |

### Fluxo de estoque
| Teste | Esperado | Real | Status |
|---|---|---|---|
| Cadastrar item | Salva no estoque ativo | Módulo em andamento no frontend mas sem endpoints fortes | ⚠️ |
| Abater do estoque após Procedimento | Subtração nativa | Disparo condicional não testado perfeitamente sob trigger do banco de dados | ⚠️ |

## Bugs confirmados
| # | Bug | Componente | Arquivo | Linha | Severidade | Sessão para corrigir |
|---|---|---|---|---|---|---|
| 1 | Calendário não atualiza em modo Semana | Agenda | `src/domains/agenda/Agenda.tsx` | ? | Alta | 5 |
| 2 | Importação de planilha não responde ao click | Pacientes | `src/domains/pacientes/PatientList.tsx` | ? | Média | 5 |

## Auditoria de UX
| Item | Status | Componentes afetados |
|---|---|---|
| Loading em botões críticos | ⚠️ parcial | Vários botões `onClick` carecem de verificação `isLoading`. Ex: Signup possui, auth falha parcialmente e domínios de agendamento omissos. |
| Anti double-click | ❌ ausente | Não detectado padrão `disabled` nos _submits_ generalizados. |
| Schema de Validação (Zod / Yup) | ❌ ausente | Nenhum uso de Zod implementado em forms nativos do projeto. Tudo sendo validado no *olho* (`if (!name) erro`). |
| Toast de erro | ⚠️ parcial | Alertas em hooks de store existem (`useShared`) e notificam globalmente no componente `ToastProvider`. |
| Estados vazios | ✅ OK | Placeholders com *Lucide* Icons e texto estão inseridos nas Views principales (`AuthenticatedApp.tsx`) default return. |

## Auditoria de segurança
| Tabela | RLS ativo | Policies SELECT | Policies INSERT/UPDATE | Risco |
|---|---|---|---|---|
| `appointments` | ✅ Sim | ✅ `clinic_id` check | ✅ Auth Policy | Baixo |
| `patients` | ✅ Sim | ✅ `clinic_id` check | ✅ Auth Policy | Baixo |
| `transactions` | ✅ Sim | ✅ `clinic_id` check | ✅ Auth Policy | Baixo |
| `audit_logs` | ❌ Não | ❌ Ausente | ❌ Ausente | **Alto** |

*Observação: Apenas o script de BD mais básico possui RLS forte; tabelas extras como estoques/audits podem estar vazar queries sem RLS strict na inicialização.*

## Auditoria de performance
| Tabela | Índice em `clinic_id` | Índice composto em `created_at` | Ação necessária |
|---|---|---|---|
| `appointments` | ✅ Sim | ❌ Não | Necessário indexar buscas combinadas (clinic_id, created_at) p/ escalabilidade |
| `patients` | ✅ Sim | ❌ Não | Faltam índices ordenados p/ performance de busca full text |
| `transactions` | ✅ Sim | ❌ Não | Índice de data condicionalmente em falta no schema gerado |

## Checklist de integração entre módulos
- [x] Agenda → Interação com Prontuário ao iniciar atendimento (Contexto preservado via Store)
- [ ] Prontuário → Eventos financeiros automáticos (Requere desacoplamento do `clinicStore`)
- [ ] Prontuário → Baixa de Estoque (Eventualidade do banco ausente)
- [x] Webhook MP → Atualiza status na API sem passar novamente pelo front via callback webhook 

## Plano de ação — próximas sessões
| Sessão | Foco | Bugs/melhorias endereçados |
|---|---|---|
| Sessão 5 | Bugs críticos de UI e UX e Correções Visuais | #1 (Agenda), #2 (Upload Files), implementação global Zod e states Loading. |
| Sessão 6 | Segurança, Permissões e RLS (Banco) | Refinar RLS tables, remoção de chaves client-side (Hardening Extra) |
| Sessão 7 | Performance Data-fetching e SQL Index | Migração e Criação de composite indices de performance `(id, created_at)` |
| Sessão 8 | Automação e QA (End-to-End) | Testes Playwright e encerramento de rotas. |
