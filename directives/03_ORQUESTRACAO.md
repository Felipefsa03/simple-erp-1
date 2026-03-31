## Orquestração (Tomada de Decisão)

- Papel da IA: roteamento inteligente e coordenação das atividades entre diretiva e execução.
- Regras:
  - Não adivinhar resultados; delegar à camada de execução para cada tarefa.
  - Ler diretivas, decidir sequência correta de execução e lidar com erros com reparos automáticos.
  - Solicitar intervenção humana apenas quando estritamente necessário.
- Fluxo típico:
  1. Analisar diretiva.
  2. Delegar tarefa à camada de execução.
  3. Validar saída; caso haja erro, acionar auto-reparo e reexecutar.
  4. Registrar aprendizados em `/directives/`.
