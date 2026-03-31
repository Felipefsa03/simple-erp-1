# MANUAL DO USUÁRIO
## LuminaFlow ERP - Gestão para Clínicas

---

## ÍNDICE

1. [Primeiros Passos](#1-primeiros-passos)
2. [Dashboard](#2-dashboard)
3. [Agenda](#3-agenda)
4. [Pacientes](#4-pacientes)
5. [Prontuário](#5-prontuário)
6. [Financeiro](#6-financeiro)
7. [Estoque](#7-estoque)
8. [Marketing](#8-marketing)
9. [Integrações](#9-integrações)
10. [Configurações](#10-configurações)
11. [Administração (Super Admin)](#11-administração-super-admin)

---

## 1. PRIMEIROS PASSOS

### 1.1 Acesso ao Sistema
1. Acesse: http://localhost:3000
2. Faça login com suas credenciais
3. Credenciais de demo:
   - Admin: clinica@luminaflow.com.br
   - Dentista: dentista@luminaflow.com.br
   - Recepção: recepcao@luminaflow.com.br
   - Senha: 123456

### 1.2 Interface Principal
- **Sidebar**: Menu de navegação à esquerda
- **Header**: Nome da clínica e configurações
- **Área Principal**: Conteúdo da página selecionada

---

## 2. DASHBOARD

O dashboard mostra uma visão geral da sua clínica:

### 2.1 Cards de Informações
- **Pacientes**: Total de pacientes cadastrados
- **Agendamentos de Hoje**: Consultas do dia
- **Receita do Mês**: Valor total recebido
- **Novos Pacientes**: Pacientes cadastrados este mês

### 2.2 Funcionalidades
- Ver próximos agendamentos
- Acesso rápido a pacientes
- Indicadores de performance

---

## 3. AGENDA

### 3.1 Visualizações
- **Dia**: Visualização por horário
- **Semana**: Grade semanal
- **Mês**: Calendário mensal

### 3.2 Criar Agendamento
1. Clique no horário desejado ou no botão "+"
2. Preencha:
   - Paciente (buscar existente ou cadastrar novo)
   - Profissional
   - Serviço/Procedimento
   - Data e Horário
3. Configure recorrência (opcional)
4. Confirme

### 3.3 Status de Agendamentos
- 🟡 **Agendado**: Novo agendamento
- 🟢 **Confirmado**: Paciente confirmou
- 🔵 **Em Atendimento**: Consulta em andamento
- ✅ **Concluído**: Atendimento finalize
- 🔴 **Cancelado**: Cancelado

---

## 4. PACIENTES

### 4.1 Cadastro de Paciente
1. Menu Pacientes → "+" ou "Novo Paciente"
2. Preencha os dados:
   - Nome completo (obrigatório)
   - CPF
   - Telefone (obrigatório)
   - E-mail
   - Data de nascimento
   - Endereço
   - Observações
3. Adicione tags para organização
4. Salve

### 4.2 Busca de Pacientes
- Use a barra de busca
- Filtre por: status, tags, último atendimento

### 4.3 Importação de Pacientes
1. Menu Pacientes → "Importar"
2. Faça upload de arquivo CSV
3. Mapeie as colunas
4. Confirme a importação

---

## 5. PRONTUÁRIO

### 5.1 Evolução Clínica
1. Acesse o paciente
2. Clique em "Nova Evolução"
3. Preencha:
   - Data e hora
   - Procedimento realizado
   - Observações
   - Prescrições

### 5.2 Anamnese
- Questionário de saúde do paciente
- Histórico de alergias
- Medicações em uso

### 5.3 Odontograma
- Representação gráfica dos dentes
- Marcação de tratamentos por dente

---

## 6. FINANCEIRO

### 6.1 Transações
- Liste todas as entradas e saídas
- Filtre por: data, tipo, status

### 6.2 Criar Transação
1. Clique em "+ Nova Transação"
2. Selecione:
   - Tipo: Receita ou Despesa
   - Categoria
   - Valor
   - Descrição
   - Paciente (se aplicável)
3. Salve

### 6.3 DRE (Demonstração do Resultado)
- Relatório mensal de receitas e despesas
- visualization gráfica

### 6.4 Comissões
- Cálculo automático de comissões
- Relatório por profissional

---

## 7. ESTOQUE

### 7.1 Cadastro de Itens
1. Menu Estoque → "Novo Item"
2. Preencha:
   - Nome do item
   - Categoria
   - Quantidade atual
   - Quantidade mínima (alerta)
   - Unidade
   - Custo unitário

### 7.2 Movimentação
- Entrada: Compra de materiais
- Saída: Consumo em procedimentos

### 7.3 Alertas
- Notificação quando estoque baixo

---

## 8. MARKETING

### 8.1 Campanhas WhatsApp
1. Menu Marketing → "Nova Campanha"
2. Defina:
   - Nome da campanha
   - Mensagem (use {{nome}} para personalizar)
   - Destinatários: todos ou lista específica
3. Configure:
   - Intervalo entre mensagens
   - Limite diário
   - Horário de funcionamento
4. Inicie a campanha

### 8.2 Status da Campanha
- 📝 Rascunho
- ▶️ Executando
- ⏸️ Pausada
- ✅ Concluída
- ⏹️ Interrompida

---

## 9. INTEGRAÇÕES

### 9.1 WhatsApp Business
1. Configure → WhatsApp
2. Escaneie o QR Code
3. Conecte e use

### 9.2 Asaas (Pagamentos)
1. Configure → Asaas
2. Insira a API Key
3. Escolha ambiente (Sandbox/Produção)
4. Teste a conexão

### 9.3 Facebook Ads
1. Configure → Facebook Ads
2. Insira App ID e App Secret
3. Autentique via OAuth

### 9.4 Google Calendar
1. Configure → Google Calendar
2. Insira API Key
3. Sincronização automática

---

## 10. CONFIGURAÇÕES

### 10.1 Dados da Clínica
- Nome, CNPJ, endereço
- Telefone, e-mail
- Logo

### 10.2 Profissionais
- Cadastro de dentistas e auxiliares
- Configuração de comissões

### 10.3 Serviços
- Serviços oferecidos
- Preços
- Duração média

---

## 11. ADMINISTRAÇÃO (SUPER ADMIN)

### 11.1 Visão Geral
- Lista de todas as clínicas
- Métricas da plataforma

### 11.2 Clínicas
- Gerenciar clínicas cadastradas
- Ver detalhes de cada uma

### 11.3 Assinaturas
- Planos: Basic, Pro, Ultra
- Gerenciar cobranças

### 11.4 Sistema
- Status do servidor
- Métricas de uso
- Componentes

### 11.5 Segurança
- Logs de auditoria
- Políticas de senha

---

## SUPORTE

Em caso de dúvidas:
- Email: suporte@luminaflow.com.br
- WhatsApp: (11) 99999-9999

---

*LuminaFlow ERP v1.2.0*
*Manual atualizado em: Março 2026*
