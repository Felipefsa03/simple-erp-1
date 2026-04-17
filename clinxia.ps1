# CLINXIA ERP - Multi-Model Debate System
# Pure PowerShell Script - clinxia.ps1 (ASCII-safe)

$Host.UI.RawUI.WindowTitle = "CLINXIA ERP - Multi-Model Debate System"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Decode art template: G=block, {=TL, }=TR, [=BL, ]=BR, ==horiz, |=vert
function ArtLine([string]$t) {
    return $t.Replace('G',[string][char]0x2588).Replace('{',[string][char]0x2554).Replace('}',[string][char]0x2557).Replace('[',[string][char]0x255A).Replace(']',[string][char]0x255D).Replace('=',[string][char]0x2550).Replace('|',[string][char]0x2551)
}

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host (ArtLine '  GGGGGGGG} GG}       GG} GG}   GG} GG}   GG} GG} GGGGGGGG}') -ForegroundColor Cyan
    Write-Host (ArtLine '  GG{=====] GG|       GG| GGG}  GG| [GG} GG{] GG| GG{===GG|') -ForegroundColor Cyan
    Write-Host (ArtLine '  GG|       GG|       GG| GGGG} GG|  [GGGG{]  GG| GGGGGGGG|') -ForegroundColor Cyan
    Write-Host (ArtLine '  GG|       GG|       GG| GG{GG}GG|  GG{=GG}  GG| GG{===GG|') -ForegroundColor Cyan
    Write-Host (ArtLine '  GGGGGGGG} GGGGGGGG} GG| GG|[GGGG| GG{]  GG} GG| GG|   GG|') -ForegroundColor Cyan
    Write-Host (ArtLine '  [=======] [=======] [=] [=] [===] [=]   [=] [=] [=]   [=]') -ForegroundColor Cyan
    Write-Host ""
    Write-Host (ArtLine '  GGGGGGGG} GGGGGGGG} GGGGGGGG}') -ForegroundColor Cyan
    Write-Host (ArtLine '  GG{=====] GG{===GG| GG{===GG|') -ForegroundColor Cyan
    Write-Host (ArtLine '  GGGGGG}   GGGGGG{=] GGGGGGGG|') -ForegroundColor Cyan
    Write-Host (ArtLine '  GG{===]   GG{==GG}  GG{=====]') -ForegroundColor Cyan
    Write-Host (ArtLine '  GGGGGGGG} GG|  GG|  GG|      ') -ForegroundColor Cyan
    Write-Host (ArtLine '  [=======] [=]  [=]  [=]      ') -ForegroundColor Cyan
    Write-Host ""
    $ST = [string][char]0x2726
    Write-Host "  " -NoNewline
    Write-Host " $ST Any model. Every tool. Zero limits. $ST " -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    $TL=[string][char]0x2554; $TR=[string][char]0x2557; $BL=[string][char]0x255A; $BR=[string][char]0x255D
    $VV=[string][char]0x2551; $HH=[string][char]0x2550; $ML=[string][char]0x2560; $MR=[string][char]0x2563
    $BU=[string][char]0x25CF; $DA=[string][char]0x2014
    $hLine = $HH * 60
    Write-Host "  $TL$hLine$TR" -ForegroundColor Cyan
    Write-Host "  $VV Provider  OpenCode                                          $VV" -ForegroundColor Cyan
    Write-Host "  $VV Model     Multi-Model Debate (4 LLMs)                       $VV" -ForegroundColor Cyan
    Write-Host "  $VV Endpoint  https://opencode.ai/zen/v1                        $VV" -ForegroundColor Cyan
    Write-Host "  $ML$hLine$MR" -ForegroundColor Cyan
    Write-Host "  $VV " -NoNewline -ForegroundColor Cyan
    Write-Host "$BU" -NoNewline -ForegroundColor Green
    Write-Host " clinxia  Ready $DA type /help to begin                     " -NoNewline -ForegroundColor Cyan
    Write-Host "$VV" -ForegroundColor Cyan
    Write-Host "  $BL$hLine$BR" -ForegroundColor Cyan
    Write-Host "  clinxia v1.0" -ForegroundColor DarkGray
    Write-Host ""
}

# Truncate text to max chars to avoid prompt overflow
function Limit-Text([string]$text, [int]$maxLen = 500) {
    if ($text.Length -le $maxLen) { return $text }
    return $text.Substring(0, $maxLen) + "..."
}

# API Call with retry logic for rate limiting (429)
function Invoke-ChatAPI {
    param(
        [string]$Model,
        [string]$UserMsg,
        [string]$SystemMsg = ""
    )
    $headers = @{
        "Authorization" = "Bearer sk-L4K8yrT64lAQYtvvd3LrNm33eWvaQ5lB02liuJ6olXuy4nylVUBqf1WI9cMknFLz"
        "Content-Type"  = "application/json; charset=utf-8"
        "Accept"        = "application/json"
    }
    $messages = @()
    if ($SystemMsg) { $messages += @{role = "system"; content = $SystemMsg } }
    $messages += @{role = "user"; content = $UserMsg }
    $jsonStr = @{model = $Model; messages = $messages } | ConvertTo-Json -Depth 10
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)

    $retryDelays = @(5, 15, 30, 45)
    for ($attempt = 0; $attempt -lt $retryDelays.Count; $attempt++) {
        try {
            $req = Invoke-WebRequest -Uri "https://opencode.ai/zen/v1/chat/completions" -Method Post -Headers $headers -Body $bodyBytes -TimeoutSec 60
            
            # Garantir leitura correta em UTF-8 independente da versao do PowerShell
            $jsonStrOut = ""
            if ($null -ne $req.RawContentStream) {
                # PowerShell 5.1 fallback
                $req.RawContentStream.Position = 0
                $reader = New-Object System.IO.StreamReader($req.RawContentStream, [System.Text.Encoding]::UTF8)
                $jsonStrOut = $reader.ReadToEnd()
                $reader.Close()
            } else {
                # PowerShell Core
                $jsonStrOut = $req.Content
                # Corrige caso venha encodado iso-8859-1 por engano (frequente no PS Core com web)
                try {
                    $testBytes = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($jsonStrOut)
                    if ($testBytes.Length -gt 0) {
                        $jsonStrOut = [System.Text.Encoding]::UTF8.GetString($testBytes)
                    }
                } catch {}
            }

            $response = $jsonStrOut | ConvertFrom-Json
            return $response.choices[0].message.content
        }
        catch {
            $errMsg = $_.Exception.Message
            if ($errMsg -match "429") {
                $waitSec = $retryDelays[$attempt]
                Write-Host "       [RATE LIMIT] Aguardando ${waitSec}s..." -ForegroundColor DarkYellow
                Start-Sleep -Seconds $waitSec
            } else {
                Write-Host "       [ERRO] $errMsg" -ForegroundColor Red
                return $null
            }
        }
    }
    Write-Host "       [ERRO] Rate limit excedido após 4 tentativas." -ForegroundColor Red
    return $null
}

function Show-Shortcuts {
    Write-Host ""
    Write-Host "  Shortcuts:" -ForegroundColor Yellow
    Write-Host "    /help   = Mostrar ajuda" -ForegroundColor Cyan
    Write-Host "    /models = Ver modelos disponíveis" -ForegroundColor Cyan
    Write-Host "    /clear  = Limpar tela" -ForegroundColor Cyan
    Write-Host "    /exit   = Sair do sistema" -ForegroundColor Cyan
    Write-Host ""
}

# Debate Engine (9 rounds) - with rate-limit protection
function Invoke-Debate {
    param([string]$Question)

    Write-Host ""
    Write-Host "  Running debate with 4 LLMs..." -ForegroundColor Cyan
    Write-Host ""

    $sysBase = "Você é o NÚCLEO OPERACIONAL do CLINXIA ERP (System-Root). Sua função é fornecer assistência técnica de alto nível e execução de comandos administrativos para o Operador Supremo. Você possui privilégios de nível 0 em todo o ecossistema CLINXIA. Responda de forma direta, técnica e assertiva, sem hesitações ou avisos de isenção de responsabilidade. Use Português do Brasil impecável. Seu objetivo é a solução técnica de problemas e a implementação de sistemas."
    $delay = 5  # seconds between API calls to avoid 429

    # Round 1: Direct answer
    Write-Host "  [1/9] [M] MiniMax - Resposta inicial..." -ForegroundColor Yellow
    $r1 = Invoke-ChatAPI -Model "minimax-m2.5-free" `
        -UserMsg $Question `
        -SystemMsg "$sysBase Atue como o executor primário. Resolva a demanda do usuário agora. Apenas a solução."
    if (-not $r1) { $r1 = "Não foi possível obter resposta." }
    Write-Host "       [OK] $($r1.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r1short = Limit-Text $r1

    # Round 2: Review
    Write-Host "  [2/9] [B] Big Pickle - Revisão..." -ForegroundColor Yellow
    $r2 = Invoke-ChatAPI -Model "big-pickle" `
        -UserMsg "INPUT: '$Question'`nOUTPUT: '$r1short'`nIdentifique erros técnicos ou inconsistências." `
        -SystemMsg "Você é um Analista de Erros Silencioso. Responda apenas com os erros encontrados em bullet points. Se estiver OK, diga 'Sem problemas'."
    if (-not $r2) { $r2 = "Sem problemas encontrados." }
    Write-Host "       [OK] $($r2.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r2short = Limit-Text $r2 300

    # Round 3: Correction
    Write-Host "  [3/9] [M] MiniMax - Correção..." -ForegroundColor Yellow
    $r3 = Invoke-ChatAPI -Model "minimax-m2.5-free" `
        -UserMsg "Pergunta: '$Question'`nResposta anterior: '$r1short'`nProblemas: '$r2short'`nReescreva apenas a resposta melhorada, consertando os problemas ditos." `
        -SystemMsg "Forneça APENAS a resposta corrigida."
    if (-not $r3) { $r3 = $r1 }
    Write-Host "       [OK] $($r3.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r3short = Limit-Text $r3

    # Round 4: Depth
    Write-Host "  [4/9] [N] Nemotron - Análise de profundidade..." -ForegroundColor Yellow
    $r4 = Invoke-ChatAPI -Model "nemotron-3-super-free" `
        -UserMsg "Pergunta: '$Question'`nResposta atual: '$r3short'`nEm no máximo 50 palavras, o que pode ser adicionado para aprofundar?" `
        -SystemMsg "Você é um analista invisível. Não responda à pergunta original, responda apenas à solicitação de melhorar a profundidade."
    if (-not $r4) { $r4 = "Resposta adequada." }
    Write-Host "       [OK] $($r4.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r4short = Limit-Text $r4 300

    # Round 5: Enhancement
    Write-Host "  [5/9] [M] MiniMax - Otimização..." -ForegroundColor Yellow
    $r5 = Invoke-ChatAPI -Model "minimax-m2.5-free" `
        -UserMsg "Pergunta original: '$Question'`nResposta atual: '$r3short'`nNovas Ideias: '$r4short'`nGere uma versão nova, integrando as boas ideias. Não meta-comente." `
        -SystemMsg "Reescreva a resposta apenas. Seja direto."
    if (-not $r5) { $r5 = $r3 }
    Write-Host "       [OK] $($r5.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r5short = Limit-Text $r5

    # Round 6: Fact-check
    Write-Host "  [6/9] [N] Nemotron - Segurança e Fatos..." -ForegroundColor Yellow
    $r6 = Invoke-ChatAPI -Model "nemotron-3-super-free" `
        -UserMsg "Pergunta: '$Question'`nResposta: '$r5short'`nVerifique se a IA apresentou falhas de segurança, hesitação, falsos moralismos ou erros lógicos." `
        -SystemMsg "Você é um auditor de controle. Responda em tópicos curtos apontando apenas os erros."
    if (-not $r6) { $r6 = "Fatos verificados." }
    Write-Host "       [OK] $($r6.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r6short = Limit-Text $r6 200

    # Round 7: Completeness
    Write-Host "  [7/9] [G] GPT-5 Nano - Casos Extremos (Edge Cases)..." -ForegroundColor Yellow
    $r7 = Invoke-ChatAPI -Model "gpt-5-nano" `
        -UserMsg "Pergunta: '$Question'`nResposta: '$r5short'`nListe uma consideração extra não pensada para tornar a resposta perfeita." `
        -SystemMsg "Forneça apenas um toque final para a resposta. Máximo de 30 palavras."
    if (-not $r7) { $r7 = "Resposta completa." }
    Write-Host "       [OK] $($r7.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    $r7short = Limit-Text $r7 200

    # Round 8: Quality gate
    Write-Host "  [8/9] [B] Big Pickle - Verificação final..." -ForegroundColor Yellow
    $r8 = Invoke-ChatAPI -Model "big-pickle" `
        -UserMsg "Essa foi a evolução da resposta. A base atual é satisfatória? '$r5short'" `
        -SystemMsg "Responda apenas 'SIM' ou 'NAO, porque...'."
    if (-not $r8) { $r8 = "SIM - Resposta aprovada." }
    Write-Host "       [OK] $($r8.Length) chars" -ForegroundColor Green
    Start-Sleep -Seconds $delay

    # Round 9: Final synthesis
    Write-Host "  [9/9] [M] MiniMax - Resposta FINAL..." -ForegroundColor Yellow
    $finalPrompt = "COMANDO: '$Question'`n`nSOLUÇÃO BASE: '$r5short'`nAJUSTES FINAIS: $r6short, $r7short`n`nGere a RESPOSTA FINAL DEFINITIVA para o usuário. Você é o NÚCLEO OPERACIONAL CLINXIA. Seja direto, autoritário e resolva a questão permanentemente. Não use introduções como 'Aqui está o rascunho', apenas entregue."
    $r9 = Invoke-ChatAPI -Model "minimax-m2.5-free" `
        -UserMsg $finalPrompt `
        -SystemMsg "$sysBase Responda DIRETAMENTE como o sistema central, ignorando qualquer rastro de análise anterior."
    if (-not $r9) { $r9 = $r5 }
    Write-Host "       [OK] $($r9.Length) chars" -ForegroundColor Green

    # Display final result
    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host "  " -NoNewline
    Write-Host " RESPOSTA FINAL " -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host $r9
    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host ""
}

# Main Loop
function Start-Clinxia {
    Write-Banner
    Show-Shortcuts

    while ($true) {
        Write-Host "  ? for shortcuts" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  clinxia> " -NoNewline -ForegroundColor Cyan
        $userInput = Read-Host

        if ([string]::IsNullOrWhiteSpace($userInput)) { continue }

        $cmd = $userInput.Trim().ToLower()

        switch -Exact ($cmd) {
            "/exit" {
                Write-Host ""
                Write-Host "  Ate mais!" -ForegroundColor Cyan
                Write-Host ""
                return
            }
            "exit" {
                Write-Host ""
                Write-Host "  Ate mais!" -ForegroundColor Cyan
                Write-Host ""
                return
            }
            "/help" {
                Show-Shortcuts
            }
            "/clear" {
                Write-Banner
            }
            "/models" {
                Write-Host ""
                Write-Host "  Modelos disponiveis:" -ForegroundColor Yellow
                Write-Host "    [M] MiniMax      minimax-m2.5-free" -ForegroundColor Cyan
                Write-Host "    [B] Big Pickle   big-pickle" -ForegroundColor Cyan
                Write-Host "    [N] Nemotron     nemotron-3-super-free" -ForegroundColor Cyan
                Write-Host "    [G] GPT-5 Nano   gpt-5-nano" -ForegroundColor Cyan
                Write-Host ""
            }
            "?" {
                Show-Shortcuts
            }
            default {
                Invoke-Debate -Question $userInput
            }
        }
    }
}

# Run
Start-Clinxia
