## Execução (Diretiva)

- Objetivo: Definir como as tarefas devem ser executadas de forma determinística, com scripts reutilizáveis na camada de execução.
- Entradas: ordens da camada de diretiva em Markdown; configurações via `.env` quando necessário.
- Saídas: arquivos resultantes, logs de execução, chamadas a APIs determinísticas.
- Regras:
  - Priorizar scripts existentes em `/execution/`; reutilizar quando possível.
  - Qualquer falha deve acionar o mecanismo de auto-reparo (self-annealing) na camada de execução, e atualizar a diretiva correspondente se aplicável.
  - Registrar aprendizados ou melhorias na camada `/directives/` para evolução do sistema.
- Segurança e custos: não executar ações pagas sem confirmação explícita do usuário.
