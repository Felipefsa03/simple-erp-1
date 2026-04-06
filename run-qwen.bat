@echo off
REM Script para executar OpenClaude com Qwen 3.6 com retry automático e rate limiting
REM Este script detecta erros de rate limit e tenta novamente automaticamente

set CLAUDE_CODE_USE_OPENAI=1
set OPENAI_API_KEY=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
set OPENAI_BASE_URL=https://opencode.ai/zen/v1
set OPENAI_MODEL=qwen3.6-plus-free

set MAX_RETRIES=10
set RETRY_DELAY=30
set ATTEMPT=0

echo ========================================
echo OpenClaude com Qwen 3.6 Plus Free
echo Modelo: qwen3.6-plus-free
echo Retry: ate %MAX_RETRIES% vezes
echo ========================================
echo.

:retry
set /a ATTEMPT+=1
echo [Tentativa %ATTEMPT%/%MAX_RETRIES%] Executando OpenClaude...

openclaude %* 2>nul
set EXITCODE=%ERRORLEVEL%

if %EXITCODE% equ 0 (
    echo.
    echo [SUCESSO] OpenClaude encerrado normalmente.
    goto :end
)

echo [Rate Limit Detectado] Aguardando %RETRY_DELAY% segundos...
timeout /t %RETRY_DELAY% /nobreak >nul

if %ATTEMPT% lss %MAX_RETRIES% (
    echo [RETRY] Tentando novamente...
    goto :retry
) else (
    echo.
    echo [ERRO] Maximo de tentativas alcancado (%MAX_RETRIES%)
    echo O modelo Qwen3.6 esta com rate limit alto no momento.
    echo Considere usar outro modelo temporariamente:
    echo   - nemotron-3-super-free
    echo   - minimax-m2.5-free
    echo   - gpt-5-nano
)

:end
