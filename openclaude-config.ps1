# OpenClaude Configuration
# Para usar: execute este script e depois digite 'openclaude'

$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="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"
$env:OPENAI_BASE_URL="https://opencode.ai/zen/v1"
$env:OPENAI_MODEL="qwen-plus-free"

Write-Host "=== OpenClaude Configurado ==="
Write-Host "Modelo: Qwen Plus Free"
Write-Host "Provider: OpenCode Zen"
Write-Host ""
Write-Host "Para iniciar, execute: openclaude"
Write-Host ""

# Testar conexão
try {
    $testUrl = "https://opencode.ai/zen/v1/models"
    $headers = @{
        "Authorization" = "Bearer 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"
        "Content-Type" = "application/json"
    }
    $response = Invoke-WebRequest -Uri $testUrl -Method Get -Headers $headers
    Write-Host "✅ Conexão com OpenCode Zen: OK"
} catch {
    Write-Host "❌ Erro na conexão: $($_.Exception.Message)"
}