import { test, expect } from '@playwright/test';

test.describe('Fluxo de Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve mostrar tela de login', async ({ page }) => {
    await expect(page.locator('text=LuminaFlow')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'clinica@luminaflow.com.br');
    await page.fill('input[type="password"]', 'clinica123');
    await page.click('button:has-text("Entrar no Sistema")');

    // Verifica se redirecionou para o dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalido@email.com');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button:has-text("Entrar no Sistema")');

    // Verifica se mostra mensagem de erro
    await expect(page.locator('text=Email ou senha incorretos')).toBeVisible();
  });

  test('deve mostrar/esconder senha ao clicar no ícone', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    await passwordInput.fill('minhasenha');
    await toggleButton.click();

    // Verifica se o input mudou para tipo text
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });
});

test.describe('Fluxo de Recuperação de Senha', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve navegar para tela de recuperação de senha', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('text=Recuperar Senha')).toBeVisible();
  });

  test('deve mostrar campo de email na tela de recuperação', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Enviar código via WhatsApp")')).toBeVisible();
  });

  test('deve voltar para login ao clicar no botão voltar', async ({ page }) => {
    await page.click('text=Esqueceu sua senha?');
    await page.click('text=Voltar para o login');
    await expect(page.locator('text=Entrar no Sistema')).toBeVisible();
  });
});

test.describe('Fluxo de Criação de Conta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve navegar para tela de criação de conta', async ({ page }) => {
    await page.click('text=Criar conta');
    // Verifica se está na tela de criação de conta
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
