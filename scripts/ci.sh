#!/bin/bash

echo "=========================================="
echo "  LuminaFlow ERP - CI/CD Pipeline Script  "
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Erro: package.json não encontrado. Execute este script no diretório raiz do projeto.${NC}"
    exit 1
fi

echo "1. Verificando dependências..."
npm ci --silent
print_status $? "Dependências instaladas"

echo ""
echo "2. Executando verificação de tipos TypeScript..."
npm run typecheck
print_status $? "Verificação de tipos TypeScript"

echo ""
echo "3. Executando linting..."
npm run lint:fix
print_status $? "Linting"

echo ""
echo "4. Executando testes unitários (Vitest)..."
npm run test -- --coverage --reporter=verbose
print_status $? "Testes unitários"

echo ""
echo "5. Verificando se o build funciona..."
npm run build
print_status $? "Build"

echo ""
echo "6. Executando testes E2E (Playwright)..."
# Nota: Para testes E2E, o servidor de desenvolvimento precisa estar rodando
echo -e "${YELLOW}Nota: Testes E2E requerem o servidor de desenvolvimento rodando.${NC}"
echo -e "${YELLOW}Execute 'npm run dev' em outro terminal antes de executar os testes E2E.${NC}"
echo ""
read -p "Deseja executar os testes E2E agora? (s/n): " run_e2e
if [ "$run_e2e" = "s" ] || [ "$run_e2e" = "S" ]; then
    npm run test:e2e
    print_status $? "Testes E2E"
else
    echo -e "${YELLOW}Testes E2E pulados.${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Todos os testes passaram com sucesso!  ${NC}"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Revise o relatório de cobertura em coverage/"
echo "2. Revise o relatório Playwright em playwright-report/"
echo "3. Faça commit das alterações"
echo "4. Crie um Pull Request para revisão"
