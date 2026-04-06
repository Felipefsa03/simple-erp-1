$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="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"
$env:OPENAI_BASE_URL="https://opencode.ai/zen/v1"
$env:OPENAI_MODEL="qwen-plus-free"

Write-Host "=== Testando OpenClaude ==="
Write-Host "Modelo: qwen-plus-free"
Write-Host "Provider: OpenCode Zen"
Write-Host ""

openclaude -p "Say hi in 3 words" 2>&1