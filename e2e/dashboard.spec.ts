import { test, expect } from '@playwright/test';

test.describe('Fluxo do Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login antes de cada teste
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve mostrar métricas do dashboard', async ({ page }) => {
    await expect(page.locator('text=Agendamentos Hoje')).toBeVisible();
    await expect(page.locator('text=Pacientes Ativos')).toBeVisible();
  });

  test('deve navegar para agenda', async ({ page }) => {
    await page.click('text=Agenda');
    await expect(page.locator('text=Agendamentos')).toBeVisible();
  });

  test('deve navegar para pacientes', async ({ page }) => {
    await page.click('text=Pacientes');
    await expect(page.locator('text=Lista de Pacientes')).toBeVisible();
  });

  test('deve navegar para financeiro', async ({ page }) => {
    await page.click('text=Financeiro');
    await expect(page.locator('text=Financeiro')).toBeVisible();
  });

  test('deve navegar para configurações', async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page.locator('text=Configurações da Clínica')).toBeVisible();
  });
});

test.describe('Fluxo de Agenda', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Agenda');
  });

  test('deve mostrar calendário da agenda', async ({ page }) => {
    await expect(page.locator('text=Agendamentos')).toBeVisible();
  });

  test('deve ter botão para novo agendamento', async ({ page }) => {
    await expect(page.locator('button:has-text("Novo Agendamento")')).toBeVisible();
  });
});

test.describe('Fluxo de Pacientes', () => {
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
});

test.describe('Fluxo de Financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Financeiro');
  });

  test('deve mostrar seção financeira', async ({ page }) => {
    await expect(page.locator('text=Financeiro')).toBeVisible();
  });

  test('deve ter abas para diferentes seções', async ({ page }) => {
    await expect(page.locator('text=Transações')).toBeVisible();
  });
});

test.describe('Fluxo de Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve fazer logout e voltar para tela de login', async ({ page }) => {
    await page.click('text=Sair');
    await expect(page.locator('text=Entrar no Sistema')).toBeVisible();
  });
});
