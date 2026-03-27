# LuminaFlow ERP - Documentação de Testes e CI/CD

## Visão Geral

Este projeto utiliza uma pipeline completa de CI/CD com:

- **Vitest** para testes unitários (~1.700 testes planejados)
- **Playwright** para testes E2E (~380 testes planejados)
- **TypeScript** para verificação de tipos
- **ESLint** para linting e qualidade de código
- **GitHub Actions** para integração contínua

## Estrutura de Testes

```
simple-erp/
├── frontend/src/__tests__/     # Testes unitários
│   ├── utils.test.ts          # Testes de funções utilitárias
│   ├── clinicStore.test.ts    # Testes do store de clínica
│   └── passwordReset.test.ts  # Testes de recuperação de senha
├── e2e/                        # Testes E2E
│   ├── auth.spec.ts           # Testes de autenticação
│   ├── dashboard.spec.ts      # Testes do dashboard
│   └── whatsapp.spec.ts       # Testes de integração WhatsApp
├── vitest.config.ts            # Configuração do Vitest
├── vitest.setup.ts             # Setup para testes
├── playwright.config.ts        # Configuração do Playwright
└── eslint.config.js            # Configuração do ESLint
```

## Como Executar os Testes

### 1. Instalar Dependências

```bash
npm install
```

### 2. Testes Unitários (Vitest)

```bash
# Executar todos os testes
npm run test

# Executar com interface visual
npm run test:ui

# Executar com cobertura
npm run test:coverage

# Executar em modo watch
npm run test:watch
```

### 3. Testes E2E (Playwright)

```bash
# Primeiro, inicie o servidor de desenvolvimento
npm run dev

# Em outro terminal, execute os testes E2E
npm run test:e2e

# Executar com interface visual
npm run test:e2e:ui

# Ver relatório
npm run test:e2e:report
```

### 4. Verificação de Tipos TypeScript

```bash
npm run typecheck
```

### 5. Linting

```bash
# Verificar problemas
npm run lint

# Corrigir problemas automaticamente
npm run lint:fix
```

### 6. Pipeline Completa de CI

```bash
# Executar todos os testes e verificações
npm run ci

# Ou use o script completo
./scripts/ci.sh
```

## Cobertura de Testes

A meta de cobertura é:

- **Linhas**: 70%
- **Funções**: 70%
- **Branches**: 70%
- **Statements**: 70%

O relatório de cobertura é gerado em `coverage/` após executar:

```bash
npm run test:coverage
```

## Testes E2E Cobertos

### Fluxo de Autenticação
- Login com credenciais válidas
- Login com credenciais inválidas
- Recuperação de senha
- Criação de conta
- Logout

### Fluxo do Dashboard
- Navegação entre módulos
- Visualização de métricas
- Interações com widgets

### Fluxo de WhatsApp
- Configuração do sistema global
- Configuração por clínica
- Isolamento multi-tenant
- Recuperação de senha via WhatsApp

## CI/CD com GitHub Actions

A pipeline de CI/CD é executada automaticamente a cada push e pull request:

1. **Type Check** - Verificação de tipos TypeScript
2. **Lint** - Verificação de qualidade de código
3. **Unit Tests** - Testes unitários com Vitest
4. **E2E Tests** - Testes end-to-end com Playwright
5. **Build** - Build da aplicação
6. **Deploy** - Deploy automático (apenas na branch main)

### Configuração do GitHub Actions

O arquivo de workflow está em `.github/workflows/ci.yml`.

Para configurar o deploy automático:

1. Configure as variáveis de ambiente no GitHub Secrets
2. Adicione os comandos de deploy no job `deploy`
3. Faça push para a branch `main`

## Adicionando Novos Testes

### Teste Unitário

Crie um arquivo `.test.ts` em `frontend/src/__tests__/`:

```typescript
import { describe, it, expect } from 'vitest';

describe('MinhaFuncao', () => {
  it('deve fazer algo', () => {
    expect(true).toBe(true);
  });
});
```

### Teste E2E

Crie um arquivo `.spec.ts` em `e2e/`:

```typescript
import { test, expect } from '@playwright/test';

test('deve fazer algo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Algo')).toBeVisible();
});
```

## Troubleshooting

### Testes E2E falhando

1. Verifique se o servidor está rodando: `npm run dev`
2. Verifique se a porta 3000 está livre
3. Instale os navegadores: `npx playwright install`

### Erro de tipos TypeScript

1. Execute: `npm run typecheck`
2. Corrija os erros reportados
3. Verifique se os imports estão corretos

### Erro de linting

1. Execute: `npm run lint:fix`
2. Revise as alterações feitas
3. Faça commit das correções

## Métricas

### Testes Unitários
- **Total planejado**: ~1.700 testes
- **Cobertura mínima**: 70%
- **Tempo máximo**: 30 segundos

### Testes E2E
- **Total planejado**: ~380 testes
- **Navegadores**: Chrome, Firefox, Safari, Mobile
- **Tempo máximo**: 5 minutos

### Qualidade de Código
- **Linting**: 0 erros
- **Tipos**: 100% verificados
- **Cobertura**: ≥70%
