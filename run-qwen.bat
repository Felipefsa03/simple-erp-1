@echo off
REM ========================================
REM OpenClaude - Qwen 3.6 Plus Free
REM Configurado para Auditoria e Desenvolvimento Avançado
REM ========================================

set CLAUDE_CODE_USE_OPENAI=1
set OPENAI_API_KEY=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
set OPENAI_BASE_URL=https://opencode.ai/zen/v1
set OPENAI_MODEL=qwen3.6-plus-free
set OPENAI_MAX_RETRIES=10
set OPENAI_RETRY_DELAY=5000
set OPENAI_TIMEOUT=180000

echo ========================================
echo OpenClaude - Qwen 3.6 Plus Free
echo Configurado para Auditoria e Seguranca
echo ========================================
echo.
echo Modelo: qwen3.6-plus-free
echo Max Retries: 10
echo Timeout: 180s
echo.
echo Skills ativados:
echo   - Code Auditor (.claude/skills/code-auditor.md)
echo   - Advanced Developer (.claude/skills/advanced-developer.md)
echo   - SECURITY.md (Instrucoes de seguranca)
echo   - AGENTS.md (Regras do projeto)
echo.

openclaude %*
set EXITCODE=%ERRORLEVEL%

if %EXITCODE% neq 0 (
    echo.
    echo [AVISO] Sessao encerrada com erro: %EXITCODE%
    echo.
    echo Possiveis causas:
    echo   - Rate limit excedido
    echo   - Erro de rede
    echo.
    echo Tentativas sugeridas:
    echo   1. Execute run-qwen.bat novamente apos 1-2 minutos
    echo   2. Use outro modelo gratuito se o problema persistir:
    echo      - nemotron-3-super-free
    echo      - minimax-m2.5-free  
    echo      - big-pickle
)

pause
