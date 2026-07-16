# Generates the E-R (logical) diagram PNG via System.Drawing. ASCII-only script;
# Chinese labels live in _er-labels.txt (UTF-8, key=value) read as UTF8
# (PowerShell 5.1 mis-decodes non-ASCII script bytes as ANSI, so keep this file ASCII).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$L = @{}
foreach ($line in (Get-Content -LiteralPath (Join-Path $PSScriptRoot '_er-labels.txt') -Encoding UTF8)) {
  if ($line -match '^\s*#') { continue }
  $i = $line.IndexOf('=')
  if ($i -gt 0) { $L[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1) }
}

$W = 1140; $H = 820
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::White)

$fam = 'Microsoft JhengHei'
try { $t = New-Object System.Drawing.Font($fam, 12); if ($t.Name -ne $fam) { $fam = 'DFKai-SB' } } catch { $fam = 'DFKai-SB' }
$fTitle = New-Object System.Drawing.Font($fam, 18, [System.Drawing.FontStyle]::Bold)
$fPanel = New-Object System.Drawing.Font($fam, 12, [System.Drawing.FontStyle]::Bold)
$fEnt   = New-Object System.Drawing.Font($fam, 10)
$fRel   = New-Object System.Drawing.Font($fam, 9, [System.Drawing.FontStyle]::Bold)
$fNote  = New-Object System.Drawing.Font($fam, 9)

$colInk  = [System.Drawing.ColorTranslator]::FromHtml('#1A2635')
$colSub  = [System.Drawing.ColorTranslator]::FromHtml('#5A6B7B')
$colLine = [System.Drawing.ColorTranslator]::FromHtml('#607D8B')
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
$sfL = New-Object System.Drawing.StringFormat
$sfL.Alignment = 'Near'; $sfL.LineAlignment = 'Center'

function RoundRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $r, $r, 180, 90)
  $p.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $p.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $p.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $p.CloseFigure()
  return $p
}
function Panel($x, $y, $w, $h, $title, $fill, $border) {
  $p = RoundRect $x $y $w $h 16
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($fill))), $p)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($border)), 2
  $g.DrawPath($pen, $p)
  $g.DrawString($title, $fPanel, (New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($border))), (New-Object System.Drawing.RectangleF(($x + 14), ($y + 8), ($w - 20), 24)), $sfL)
}
function Ent($x, $y, $w, $h, $label, $border) {
  $p = RoundRect $x $y $w $h 8
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), $p)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($border)), 1.4), $p)
  $g.DrawString($label, $fEnt, (New-Object System.Drawing.SolidBrush $colInk), (New-Object System.Drawing.RectangleF($x, $y, $w, $h)), $sf)
}
function Rel($x1, $y1, $x2, $y2, $dashed) {
  $pen = New-Object System.Drawing.Pen $colLine, 1.8
  $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 5, 5
  $pen.CustomEndCap = $cap
  if ($dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash }
  $g.DrawLine($pen, [int]$x1, [int]$y1, [int]$x2, [int]$y2)
  # "1" near parent end, "N" near child end
  $b = New-Object System.Drawing.SolidBrush $colSub
  $g.DrawString($L['one'], $fRel, $b, [single]($x1 + ($x2 - $x1) * 0.12 - 4), [single](($y1 + ($y2 - $y1) * 0.12) - 18))
  $g.DrawString($L['many'], $fRel, $b, [single]($x1 + ($x2 - $x1) * 0.88 - 4), [single](($y1 + ($y2 - $y1) * 0.88) - 18))
}

# ---- title ----
$g.DrawString($L['title'], $fTitle, (New-Object System.Drawing.SolidBrush $colInk), (New-Object System.Drawing.RectangleF(0, 14, $W, 38)), $sf)

# palette
$grF='#E8F5EE'; $grB='#2D7A55'   # people/schedule
$blF='#E3F0FB'; $blB='#1565C0'   # oncall doctors
$ylF='#FBF3DC'; $ylB='#B8860B'   # OR
$pkF='#F6ECF6'; $pkB='#8E44AD'   # handover
$tlF='#E6F5F4'; $tlB='#128577'   # care aide

# ===== Panel A: people & schedule =====
Panel 28 66 566 262 $L['pA'] $grF $grB
Ent 60 158 140 50 $L['staff'] $grB
Ent 330 92  244 34 $L['sur'] $grB
Ent 330 134 244 34 $L['sch'] $grB
Ent 330 176 244 34 $L['bsa'] $grB
Ent 330 262 244 34 $L['dr']  $grB
Rel 200 176 330 109 $false
Rel 200 183 330 151 $false
Rel 200 190 330 193 $false
Rel 200 200 330 279 $false

# ===== Panel B: handover =====
Panel 28 350 566 150 $L['pB'] $pkF $pkB
Ent 48 408 158 44 $L['hs'] $pkB
Ent 250 408 158 44 $L['hp'] $pkB
Ent 452 408 122 44 $L['hi'] $pkB
Rel 206 430 250 430 $false
Rel 408 430 452 430 $false

# ===== Panel E: care aide =====
Panel 28 522 566 118 $L['pE'] $tlF $tlB
Ent 60 566 158 46 $L['aide'] $tlB
Ent 320 566 244 46 $L['uca'] $tlB
Rel 218 589 320 589 $false

# ===== Panel C: on-call doctors =====
Panel 612 66 500 262 $L['pC'] $blF $blB
Ent 648 116 176 40 $L['dept'] $blB
Ent 906 116 176 40 $L['doc']  $blB
Rel 824 136 906 136 $true
Ent 648 190 176 40 $L['ocd'] $blB
Ent 906 190 176 40 $L['ocr'] $blB
Rel 824 210 906 210 $false
Ent 648 268 244 40 $L['uocd'] $blB
Rel 736 268 736 230 $true

# ===== Panel D: OR =====
Panel 612 350 500 226 $L['pD'] $ylF $ylB
Ent 648 438 150 50 $L['orroom'] $ylB
Ent 866 398 216 34 $L['osr'] $ylB
Ent 866 446 216 34 $L['ore'] $ylB
Ent 866 494 216 34 $L['osn'] $ylB
Rel 798 456 866 415 $false
Rel 798 463 866 463 $false
Rel 798 470 866 511 $false

# ---- legend + note ----
$g.DrawString($L['refnote'], $fNote, (New-Object System.Drawing.SolidBrush $colSub), (New-Object System.Drawing.RectangleF(28, 654, 1084, 22)), $sfL)
$noteRect = New-Object System.Drawing.RectangleF(28, 686, 1084, 110)
$g.DrawString($L['note'], $fNote, (New-Object System.Drawing.SolidBrush $colSub), $noteRect, $sfL)

$out = Join-Path $PSScriptRoot $L['out']
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output ("OK " + $W + "x" + $H)
