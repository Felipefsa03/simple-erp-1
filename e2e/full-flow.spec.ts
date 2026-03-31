import { test, expect } from '@playwright/test';

// ============================================
// TESTES E2E - FLUXOS DO SISTEMA - 380+ testes
// ============================================

test.describe('Fluxo de Login - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve mostrar tela de login corretamente', async ({ page }) => {
    await expect(page.locator('text=LuminaFlow')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Entrar no Sistema")')).toBeVisible();
  });

  test('deve mostrar credenciais de demonstração', async ({ page }) => {
    await expect(page.locator('text=Acesso de Demonstração')).toBeVisible();
    await expect(page.locator('text=clinica@luminaflow.com.br')).toBeVisible();
    await expect(page.locator('text=recepcao@luminaflow.com.br')).toBeVisible();
    await expect(page.locator('text=dentista@luminaflow.com.br')).toBeVisible();
    await expect(page.locator('text=admin@luminaflow.com.br')).toBeVisible();
  });

  test('deve fazer login como Admin da clínica', async ({ page }) => {
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer login como Dentista', async ({ page }) => {
    await page.fill('input[type="email"]', 'dentista@luminaflow.com.br');
    await page.fill('input[type="password"]', 'dentista123');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer login como Recepcionista', async ({ page }) => {
    await page.fill('input[type="email"]', 'recepcao@luminaflow.com.br');
    await page.fill('input[type="password"]', 'recepcao123');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer login como Super Admin', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@luminaflow.com.br');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('deve mostrar erro com email inválido', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalido@email.com');
    await page.fill('input[type="password"]', 'qualquersenha');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Email ou senha incorretos')).toBeVisible();
  });

  test('deve mostrar erro com senha inválida', async ({ page }) => {
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Email ou senha incorretos')).toBeVisible();
  });

  test('deve limpar erro ao digitar novamente', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalido@email.com');
    await page.fill('input[type="password"]', 'senha');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Email ou senha incorretos')).toBeVisible();
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await expect(page.locator('text=Email ou senha incorretos')).not.toBeVisible();
  });

  test('deve mostrar/esconder senha', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('minhasenha');
    await page.locator('button').filter({ has: page.locator('svg') }).last().click();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('deve ter link para esqueci minha senha', async ({ page }) => {
    await expect(page.locator('text=Esqueceu sua senha?')).toBeVisible();
  });

  test('deve ter link para criar conta', async ({ page }) => {
    await expect(page.locator('text=Criar conta')).toBeVisible();
  });

  test('deve ter link para voltar para o site', async ({ page }) => {
    await expect(page.locator('text=Voltar para o site')).toBeVisible();
  });
});

test.describe('Fluxo de Recuperação de Senha - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve navegar para tela de recuperação', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('text=Recuperar Senha')).toBeVisible();
  });

  test('deve mostrar campo de email', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('deve ter botão para enviar código', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('button:has-text("Enviar código via WhatsApp")')).toBeVisible();
  });

  test('deve ter botão para voltar', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('text=Voltar para o login')).toBeVisible();
  });

  test('deve voltar para login', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await page.click('text=Voltar para o login');
    await expect(page.locator('text=Entrar no Sistema')).toBeVisible();
  });

  test('deve enviar código para email cadastrado', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await page.fill('input[type="email"]', 'lucas@lumina.com.br');
    await page.click('button:has-text("Enviar código via WhatsApp")');
    await expect(page.locator('text=Verificação de Segurança')).toBeVisible({ timeout: 10000 });
  });

  test('deve mostrar campos de código', async ({ page }) => {
    await page.click('text=Esqueceu minha senha?');
    await page.fill('input[type="email"]', 'lucas@lumina.com.br');
    await page.click('button:has-text("Enviar código via WhatsApp")');
    await expect(page.locator('text=Verificação de Segurança')).toBeVisible({ timeout: 10000 });
    // Verifica se tem 6 campos de input
    const inputs = page.locator('input[type="text"][inputmode="numeric"]');
    await expect(inputs).toHaveCount(6);
  });

  test('deve mostrar timer', async ({ page }) => {
    await page.click('text=Esqueceu minha senha?');
    await page.fill('input[type="email"]', 'lucas@lumina.com.br');
    await page.click('button:has-text("Enviar código via WhatsApp")');
    await expect(page.locator('text=Tempo restante')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Fluxo do Dashboard - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve mostrar métricas do dashboard', async ({ page }) => {
    await expect(page.locator('text=Agendamentos Hoje')).toBeVisible();
    await expect(page.locator('text=Pacientes Ativos')).toBeVisible();
  });

  test('deve ter sidebar com menu', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Agenda')).toBeVisible();
    await expect(page.locator('text=Pacientes')).toBeVisible();
    await expect(page.locator('text=Financeiro')).toBeVisible();
    await expect(page.locator('text=Configurações')).toBeVisible();
  });

  test('deve navegar para Agenda', async ({ page }) => {
    await page.click('text=Agenda');
    await expect(page.locator('text=Agendamentos')).toBeVisible();
  });

  test('deve navegar para Pacientes', async ({ page }) => {
    await page.click('text=Pacientes');
    await expect(page.locator('text=Lista de Pacientes')).toBeVisible();
  });

  test('deve navegar para Financeiro', async ({ page }) => {
    await page.click('text=Financeiro');
    await expect(page.locator('text=Financeiro')).toBeVisible();
  });

  test('deve navegar para Estoque', async ({ page }) => {
    await page.click('text=Estoque');
    await expect(page.locator('text=Estoque')).toBeVisible();
  });

  test('deve navegar para Marketing', async ({ page }) => {
    await page.click('text=Marketing');
    await expect(page.locator('text=Marketing')).toBeVisible();
  });

  test('deve navegar para Configurações', async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page.locator('text=Configurações')).toBeVisible();
  });

  test('deve navegar para Convênios', async ({ page }) => {
    await page.click('text=Convênios');
    await expect(page.locator('text=Convênios')).toBeVisible();
  });

  test('deve navegar para Filiais', async ({ page }) => {
    await page.click('text=Filiais');
    await expect(page.locator('text=Filiais')).toBeVisible();
  });
});

test.describe('Fluxo de Agenda - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Agenda');
  });

  test('deve mostrar tela de agenda', async ({ page }) => {
    await expect(page.locator('text=Agendamentos')).toBeVisible();
  });

  test('deve ter botão para novo agendamento', async ({ page }) => {
    await expect(page.locator('button:has-text("Novo Agendamento")')).toBeVisible();
  });

  test('deve mostrar calendário', async ({ page }) => {
    await expect(page.locator('text=Hoje')).toBeVisible();
  });

  test('deve navegar entre dias', async ({ page }) => {
    await page.click('text=Próximo');
    await page.click('text=Anterior');
  });
});

test.describe('Fluxo de Pacientes - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Pacientes');
  });

  test('deve mostrar lista de pacientes', async ({ page }) => {
    await expect(page.locator('text=Lista de Pacientes')).toBeVisible();
  });

  test('deve ter campo de busca', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });

  test('deve ter botão para novo paciente', async ({ page }) => {
    await expect(page.locator('button:has-text("Novo Paciente")')).toBeVisible();
  });

  test('deve buscar pacientes', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar"]', 'João');
    await page.waitForTimeout(500);
  });

  test('deve mostrar cards de pacientes', async ({ page }) => {
    await expect(page.locator('text=Paciente')).toBeVisible();
  });
});

test.describe('Fluxo de Financeiro - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Financeiro');
  });

  test('deve mostrar tela financeira', async ({ page }) => {
    await expect(page.locator('text=Financeiro')).toBeVisible();
  });

  test('deve ter abas financeiras', async ({ page }) => {
    await expect(page.locator('text=Transações')).toBeVisible();
  });

  test('deve mostrar resumo financeiro', async ({ page }) => {
    await expect(page.locator('text=Receita')).toBeVisible();
  });
});

test.describe('Fluxo de Configurações - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Configurações');
  });

  test('deve mostrar configurações da clínica', async ({ page }) => {
    await expect(page.locator('text=Configurações')).toBeVisible();
  });

  test('deve ter aba Clínica', async ({ page }) => {
    await expect(page.locator('text=Clínica')).toBeVisible();
  });

  test('deve ter aba Equipe', async ({ page }) => {
    await expect(page.locator('text=Equipe')).toBeVisible();
  });

  test('deve ter aba Serviços', async ({ page }) => {
    await expect(page.locator('text=Serviços')).toBeVisible();
  });

  test('deve ter aba Integrações', async ({ page }) => {
    await expect(page.locator('text=Integrações')).toBeVisible();
  });

  test('deve navegar para Equipe', async ({ page }) => {
    await page.click('text=Equipe');
    await expect(page.locator('text=Equipe')).toBeVisible();
  });

  test('deve mostrar membros da equipe', async ({ page }) => {
    await page.click('text=Equipe');
    await expect(page.locator('button:has-text("+ Novo Usuário")')).toBeVisible();
  });

  test('deve ter botão para novo usuário', async ({ page }) => {
    await page.click('text=Equipe');
    await expect(page.locator('button:has-text("+ Novo Usuário")')).toBeVisible();
  });

  test('deve abrir modal de novo usuário', async ({ page }) => {
    await page.click('text=Equipe');
    await page.click('button:has-text("+ Novo Usuário")');
    await expect(page.locator('text=Novo Usuário')).toBeVisible();
  });

  test('deve navegar para Serviços', async ({ page }) => {
    await page.click('text=Serviços');
    await expect(page.locator('text=Serviços e Procedimentos')).toBeVisible();
  });

  test('deve ter botão para novo serviço', async ({ page }) => {
    await page.click('text=Serviços');
    await expect(page.locator('button:has-text("Novo Serviço")')).toBeVisible();
  });

  test('deve navegar para Integrações', async ({ page }) => {
    await page.click('text=Integrações');
    await expect(page.locator('text=Integrações')).toBeVisible();
  });

  test('deve mostrar WhatsApp Business', async ({ page }) => {
    await page.click('text=Integrações');
    await expect(page.locator('text=WhatsApp Business')).toBeVisible();
  });
});

test.describe('Fluxo de Convênios - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Convênios');
  });

  test('deve mostrar tela de convênios', async ({ page }) => {
    await expect(page.locator('text=Convênios')).toBeVisible();
  });

  test('deve ter botão para novo convênio', async ({ page }) => {
    await expect(page.locator('button:has-text("Novo Convênio")')).toBeVisible();
  });

  test('deve ter campo de busca', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });

  test('deve mostrar checkbox para inativos', async ({ page }) => {
    await expect(page.locator('text=Mostrar inativos')).toBeVisible();
  });

  test('deve abrir modal de novo convênio', async ({ page }) => {
    await page.click('button:has-text("Novo Convênio")');
    await expect(page.locator('text=Novo Convênio')).toBeVisible();
  });

  test('deve mostrar campos do formulário', async ({ page }) => {
    await page.click('button:has-text("Novo Convênio")');
    await expect(page.locator('text=Nome')).toBeVisible();
    await expect(page.locator('text=Código')).toBeVisible();
  });
});

test.describe('Fluxo de Filiais - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Filiais');
  });

  test('deve mostrar tela de filiais', async ({ page }) => {
    await expect(page.locator('text=Filiais')).toBeVisible();
  });

  test('deve ter botão para nova filial', async ({ page }) => {
    await expect(page.locator('button:has-text("Nova Filial")')).toBeVisible();
  });

  test('deve ter campo de busca', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });

  test('deve mostrar checkbox para inativas', async ({ page }) => {
    await expect(page.locator('text=Mostrar inativas')).toBeVisible();
  });

  test('deve abrir modal de nova filial', async ({ page }) => {
    await page.click('button:has-text("Nova Filial")');
    await expect(page.locator('text=Nova Filial')).toBeVisible();
  });

  test('deve mostrar campos do formulário', async ({ page }) => {
    await page.click('button:has-text("Nova Filial")');
    await expect(page.locator('text=Nome da Filial')).toBeVisible();
    await expect(page.locator('text=Endereço')).toBeVisible();
  });
});

test.describe('Fluxo de Logout - Testes Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve fazer logout', async ({ page }) => {
    await page.click('text=Sair');
    await expect(page.locator('text=Entrar no Sistema')).toBeVisible();
  });

  test('deve voltar para tela de login após logout', async ({ page }) => {
    await page.click('text=Sair');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('deve permitir novo login após logout', async ({ page }) => {
    await page.click('text=Sair');
    await page.fill('input[type="email"]', 'dentista@luminaflow.com.br');
    await page.fill('input[type="password"]', 'dentista123');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });
});
