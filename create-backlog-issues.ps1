param(
  [Parameter(Mandatory = $true)]
  [string]$Repo # formato: owner/repo
)

$ErrorActionPreference = "Stop"

# 1) Labels (cria se não existir)
$labels = @(
  @{ name="priority:P0"; color="B60205"; desc="Alta prioridade" },
  @{ name="priority:P1"; color="D93F0B"; desc="Media prioridade" },
  @{ name="priority:P2"; color="FBCA04"; desc="Baixa prioridade" },
  @{ name="effort:S"; color="0E8A16"; desc="Esforco pequeno" },
  @{ name="effort:M"; color="1D76DB"; desc="Esforco medio" },
  @{ name="effort:L"; color="5319E7"; desc="Esforco grande" },
  @{ name="status:planejar"; color="0052CC"; desc="Aguardando planejamento Antigravity" },
  @{ name="track:backlog"; color="C2E0C6"; desc="Backlog consolidado" }
)

foreach ($l in $labels) {
  gh label create $l.name --repo $Repo --color $l.color --description $l.desc 2>$null | Out-Null
}

# 2) Backlog
$items = @(
  @{id="BG-001"; t="Remover segredo hardcoded e rotacionar chaves expostas"; p="P0"; e="S"; o="Codex"; d=@(); a="Nenhum segredo hardcoded no repo; chaves antigas revogadas."},
  @{id="BG-002"; t="Implementar auth/autorizacao server-side para rotas admin"; p="P0"; e="M"; o="Codex"; d=@("BG-001"); a="Rotas de escrita e admin bloqueadas sem auth valida."},
  @{id="BG-003"; t="Proteger rotas batch com controle de acesso e rate limit"; p="P0"; e="M"; o="Codex"; d=@("BG-002"); a="Endpoints /api/batch-* protegidos e limitados."},
  @{id="BG-004"; t="Remover geminiKey do payload do cliente"; p="P0"; e="S"; o="Codex"; d=@("BG-001"); a="APIs usam somente GEMINI_API_KEY no servidor."},
  @{id="BG-005"; t="Validar payloads de API com Zod"; p="P0"; e="M"; o="Gemini+Codex"; d=@(); a="Schemas de entrada/saida e erros 400 padronizados."},
  @{id="BG-006"; t="Validar variaveis de ambiente com Zod (fail-fast)"; p="P0"; e="S"; o="Gemini+Codex"; d=@("BG-001"); a="App nao sobe com env invalida."},
  @{id="BG-007"; t="Adicionar testes automatizados (unit + integracao API)"; p="P1"; e="L"; o="Gemini"; d=@("BG-005"); a="Fluxos criticos cobertos em CI."},
  @{id="BG-008"; t="Refatorar frontend monolitico em modulos"; p="P1"; e="L"; o="Gemini+Codex"; d=@("BG-007"); a="Arquivo principal quebrado em features/ui/hooks sem regressao."},
  @{id="BG-009"; t="Estruturar gerenciamento de estado e avaliar Zustand/Jotai"; p="P1"; e="M"; o="Gemini"; d=@("BG-008"); a="Estado global centralizado so onde necessario."},
  @{id="BG-010"; t="Endurecer TypeScript progressivamente (strict roadmap)"; p="P1"; e="M"; o="Codex"; d=@("BG-005"); a="Reducao de any e type-check robusto."},
  @{id="BG-011"; t="Padronizar estrategia de acesso a dados (Prisma vs Supabase)"; p="P1"; e="M"; o="Codex"; d=@("BG-005"); a="Estrategia unica documentada e aplicada."},
  @{id="BG-012"; t="Migrar imagens base64 para storage + URL/metadados"; p="P1"; e="L"; o="Codex"; d=@("BG-011"); a="Payload e tamanho de banco reduzidos com compatibilidade."},
  @{id="BG-013"; t="Otimizar imagens com next/image"; p="P2"; e="S"; o="Gemini"; d=@("BG-008"); a="Imagens principais usando next/image com dimensoes definidas."},
  @{id="BG-014"; t="Adicionar observabilidade minima (logs estruturados)"; p="P2"; e="M"; o="Codex"; d=@("BG-005"); a="Logs por request/job e diagnostico basico."},
  @{id="BG-015"; t="Higiene de repositorio (encoding, legados, docs)"; p="P2"; e="S"; o="Codex"; d=@(); a="README/.gitignore limpos e docs coerentes."}
)

function New-Body($i, $depText) {
@"
**ID:** $($i.id)
**Origem:** $($i.o)
**Prioridade:** $($i.p)
**Esforco:** $($i.e)
**Status inicial:** Aguardando Planejamento (Antigravity)

**Descricao**
$($i.t)

**Dependencias**
$depText

**Criterio de aceite**
$($i.a)
"@
}

# 3) Cria issues
$map = @{} # BG-xxx -> issue number
foreach ($i in $items) {
  $depText = if ($i.d.Count -eq 0) { "Nenhuma" } else { ($i.d -join ", ") }
  $body = New-Body $i $depText
  $title = "$($i.id): $($i.t)"
  $out = gh issue create `
    --repo $Repo `
    --title $title `
    --body $body `
    --label "priority:$($i.p)" `
    --label "effort:$($i.e)" `
    --label "status:planejar" `
    --label "track:backlog"

  if ($out -match "/issues/(\d+)$") { $map[$i.id] = $Matches[1] }
}

# 4) Atualiza corpo com dependencias resolvidas (#num)
foreach ($i in $items) {
  $depText = "Nenhuma"
  if ($i.d.Count -gt 0) {
    $links = @()
    foreach ($d in $i.d) {
      if ($map.ContainsKey($d)) { $links += "$d (#$($map[$d]))" } else { $links += $d }
    }
    $depText = ($links -join ", ")
  }

  $body = New-Body $i $depText
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp -Value $body -NoNewline
  gh issue edit $map[$i.id] --repo $Repo --body-file $tmp | Out-Null
  Remove-Item $tmp -Force
}

Write-Host "Concluido. Issues criadas com labels e dependencias em $Repo"
