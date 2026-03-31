# Arquitetura 3 Camadas

## Regras
O sistema segue três camadas rígidas ditando como operações e inteligência devem ser orquestradas:

1. **Camada de Diretiva (`/directives/`)**:
   - Manuais de Instrução e "POPs" (Procedimentos Operacionais Padrão) em Markdown.
   - Define o "O Que Fazer", inputs, ferramentas e outputs esperados.
   - Apenas lidos por desenvolvedores e Orquestradores de IA (como a própria IA estruturando o código).

2. **Camada de Orquestração** (Navegação/API principal):
   - Localizado primeiramente no backend (`/backend/`) servindo as rotas. 
   - Recebe solicitações externas ou do frontend, analisa, e executa chamadas para ferramentas de terceiros ou aciona scripts da camada de execução.
   - Integra-se ao **Model Context Protocol (MCP)** para invocar ferramentas dinâmicas de serviços como Stripe e Supabase.
   - Roteia, toma decisão, não faz processamento ou cálculo hardcoded propício a quebra.

3. **Camada de Execução (`/execution/`)**:
   - Mão na Massa! Scripts determinísticos, predominantemente Python (ou Node.js isolados) que efetuam integrações, geração de dados ou limpezas com 0% de heurística/adivinhação de LLMs.
   - A IA Orquestradora executa estes scripts para finalizar comandos.

## Estrutura de Pastas

```text
/
├── directives/          # Manuais e regras de negócio
├── execution/           # Scripts isolados determinísticos
├── frontend/            # Código Vite/React do usuário final
├── backend/             # Código Node.js/Express, contendo o MCP Client
├── logs/                # Registros
├── data/                # Dados temporários
```

## Integração MCP (Client Mode)
O diretório `/backend/mcp/client.mjs` concentra o setup do cliente de forma que seu app seja capaz de mandar instruções via *Model Context Protocol* e consumir *Tools* expostas em localhosts ou scripts secundários.
