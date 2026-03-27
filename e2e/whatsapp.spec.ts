import { test, expect } from '@playwright/test';

test.describe('Integração WhatsApp - Sistema Global', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login como Super Admin
    await page.fill('input[type="email"]', 'admin@luminaflow.com.br');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve navegar para Configurações', async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page.locator('text=Configurações da Clínica')).toBeVisible();
  });

  test('deve mostrar aba Sistema (Global) para Super Admin', async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page.locator('text=Sistema (Global)')).toBeVisible();
  });

  test('deve mostrar configuração de WhatsApp do Sistema', async ({ page }) => {
    await page.click('text=Configurações');
    await page.click('text=Sistema (Global)');
    await expect(page.locator('text=WhatsApp do Sistema')).toBeVisible();
  });
});

test.describe('Integração WhatsApp - Clínica', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login como Admin da clínica
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve mostrar aba Integrações para Admin', async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page.locator('text=Integrações')).toBeVisible();
  });

  test('deve mostrar status do WhatsApp da clínica', async ({ page }) => {
    await page.click('text=Configurações');
    await page.click('text=Integrações');
    await expect(page.locator('text=WhatsApp Business')).toBeVisible();
  });

  test('deve ter botão para conectar WhatsApp', async ({ page }) => {
    await page.click('text=Configurações');
    await page.click('text=Integrações');
    await expect(page.locator('button:has-text("Conectar WhatsApp Business")')).toBeVisible();
  });
});

test.describe('Integração WhatsApp - Usuário Comum', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login como Recepcionista (usuário comum)
    await page.fill('input[type="email"]', 'recepcao@luminaflow.com.br');
    await page.fill('input[type="password"]', 'recepcao123');
    await page.click('button:has-text("Entrar no Sistema")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  });

  test('deve mostrar aba Integrações mas com acesso restrito', async ({ page }) => {
    await page.click('text=Configurações');
    await page.click('text=Integrações');
    // Verifica se mostra mensagem de acesso restrito
    await expect(page.locator('text=Acesso restrito')).toBeVisible();
  });
});

test.describe('Fluxo de Recuperação de Senha via WhatsApp', () => {
  test('deve mostrar tela de inserção de email', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('text=Recuperar Senha')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('deve ter botão para enviar código via WhatsApp', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('button:has-text("Enviar código via WhatsApp")')).toBeVisible();
  });

  test('deve mostrar erro para email não cadastrado', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Esqueceu sua senha?');
    await page.fill('input[type="email"]', 'email-nao-existe@teste.com');
    await page.click('button:has-text("Enviar código via WhatsApp")');
    // Sistema não deve revelar se o email existe ou não por segurança
    await expect(page.locator('text=Se este email estiver cadastrado')).toBeVisible();
  });
});
