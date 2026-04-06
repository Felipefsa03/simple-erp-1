# CLAUDE.md - Contexto do Projeto

## Sobre o Projeto
Este é um projeto de desenvolvimento de software. As IAs devem ajudar com codificação, debugging, refatoração e documentação.

## Ferramentas MCP Disponíveis

O projeto está configurado com os seguintes MCPs que extends as capacidades da IA:

### 1. Context7 (context7)
- **Para:** Busca documentação de bibliotecas, frameworks e APIs
- **Como usar:** `use context7` ou pergunte sobre documentação
- **Exemplo:** "Como usar React Hook Form?" → a IA usa context7

### 2. Grep by Vercel (gh_grep)
- **Para:** Buscar exemplos de código no GitHub
- **Como usar:** `use gh_grep` ou peça exemplos
- **Exemplo:** "Como fazer autenticação JWT em Node.js?"

### 3. Sentry (sentry)
- **Para:** Verificar erros e logs do projeto em produção
- **Como usar:** Solicite análise de erros
- **Exemplo:** "Quais são os erros mais comuns?"

### 4. Filesystem (filesystem)
- **Para:** Navegar e gerenciar arquivos do projeto
- **Disponível:** Toda a pasta do projeto

### 5. Brave Search (brave-search)
- **Para:** Buscas na web
- **Configuração:** Requer API key (opcional)

### 6. Fetch (fetch)
- **Para:** Buscar conteúdo de URLs
- Útil para páginas que não precisam de JavaScript

### 7. Memory (memory)
- **Para:** Armazenar e recuperar informações entre sessões
- Útil para contexto persistente

### 8. Time (time)
- **Para:** Obter informações de tempo e fuso horário

## Regras de Uso

1. **Sempre use MCPs** quando precisar de informações externas
2. **Prefira Context7** para documentação - é mais confiável que busca na web
3. **Use gh_grep** para ver como outros projetos resolveram problemas similares
4. **Verifique Sentry** para erros antes de sugerir correções
5. **Não invente código** - use MCPs para buscar exemplos reais

## Comandos Úteis

- "use context7" → Ativa busca de documentação
- "use gh_grep" → Ativa busca de código no GitHub
- "verifique os erros no sentry" → Analisa erros do projeto
