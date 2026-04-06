# AGENTS.md - Regras para os Agentes de IA

## Contexto do Projeto
Este é um projeto de desenvolvimento de software. As IAs devem ajudar com codificação, debugging, refatoração e documentação.

## Quando Usar as Ferramentas MCP

### Context7 (context7)
- Use para buscar documentação de bibliotecas, frameworks e APIs
- Quando precisar de exemplos de uso de bibliotecas externas
- Para entender APIs de terceiros

Exemplo: "Como usar o React Hook Form?" → use context7

### Grep by Vercel (gh_grep)
- Use para buscar exemplos de código no GitHub
- Quando precisar ver como outras pessoas implementaram algo similar
- Para encontrar padrões de código comuns

Exemplo: "Como fazer autenticação JWT em Node.js?" → use gh_grep

### Sentry (sentry)
- Use para verificar erros e logs do projeto
- Para analisar falhas em produção
- Para entender tendências de erros

### Filesystem (filesystem)
- Use para navegar e gerenciar arquivos do projeto
- Para ler e escrever arquivos

## Comportamento

1. **Sempre** use MCP tools quando precisar de informações externas
2. **Prefira** Context7 para documentação em vez de buscar na web manualmente
3. **Use** gh_grep para ver como outros projetos resolvem problemas similares
4. **Verifique** Sentry para erros antes de sugerir correções

## Limites
- Não use terlalu muitos tokens com MCPs desnecessários
- Desative MCPs que não estão sendo usados