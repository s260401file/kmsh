# Generates the system-architecture PNG via System.Drawing. ASCII-only script;
# Chinese labels live in _arch-labels.txt (UTF-8, key=value) and are read as UTF8
# (PowerShell 5.1 mis-decodes non-ASCII script bytes as ANSI, so keep this file ASCII).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# ---- load UTF-8 labels ----
$L = @{}
foreach ($line in (Get-Content -LiteralPath (Join-Path $PSScriptRoot '_arch-labels.txt') -Encoding UTF8)) {
  if ($line -match '^\s*#') { continue }
  $i = $line.IndexOf('=')
  if ($i -gt 0) { $L[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1) }
}

$W = 1040; $H = 660
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::White)

$fam = 'Microsoft JhengHei'
try { $t = New-Object System.Drawing.Font($fam, 12); if ($t.Name -ne $fam) { $fam = 'DFKai-SB' } } catch { $fam = 'DFKai-SB' }
$fTitle = New-Object System.Drawing.Font($fam, 19, [System.Drawing.FontStyle]::Bold)
$fBox   = New-Object System.Drawing.Font($fam, 13, [System.Drawing.FontStyle]::Bold)
$fSub   = New-Object System.Drawing.Font($fam, 10)
$fLbl   = New-Object System.Drawing.Font($fam, 9)

$colInk  = [System.Drawing.ColorTranslator]::FromHtml('#1A2635')
$colSub  = [System.Drawing.ColorTranslator]::FromHtml('#5A6B7B')
$colLine = [System.Drawing.ColorTranslator]::FromHtml('#607D8B')
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'

function RoundRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $r, $r, 180, 90)
  $p.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $p.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $p.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $p.CloseFigure()
  return $p
}
function Box($x, $y, $w, $h, $title, $sub, $fill, $border) {
  $p = RoundRect $x $y $w $h 14
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($fill))), $p)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($border)), 2), $p)
  $inkB = New-Object System.Drawing.SolidBrush $colInk
  $subB = New-Object System.Drawing.SolidBrush $colSub
  if ($sub) {
    $g.DrawString($title, $fBox, $inkB, (New-Object System.Drawing.RectangleF($x, ($y + 9), $w, ($h / 2))), $sf)
    $g.DrawString($sub, $fSub, $subB, (New-Object System.Drawing.RectangleF($x, ($y + $h / 2 - 5), $w, ($h / 2))), $sf)
  } else {
    $g.DrawString($title, $fBox, $inkB, (New-Object System.Drawing.RectangleF($x, $y, $w, $h)), $sf)
  }
}
function Arrow($x1, $y1, $x2, $y2, $both) {
  $pen = New-Object System.Drawing.Pen $colLine, 2
  $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6, 6
  $pen.CustomEndCap = $cap
  if ($both) { $pen.CustomStartCap = $cap }
  $g.DrawLine($pen, [int]$x1, [int]$y1, [int]$x2, [int]$y2)
}
function Lbl($x, $y, $t) { $g.DrawString($t, $fLbl, (New-Object System.Drawing.SolidBrush $colSub), [single]$x, [single]$y) }

$g.DrawString($L['title'], $fTitle, (New-Object System.Drawing.SolidBrush $colInk), (New-Object System.Drawing.RectangleF(0, 14, $W, 40)), $sf)

$grF = '#E8F5EE'; $grB = '#2D7A55'
$blF = '#E3F0FB'; $blB = '#1565C0'
$ylF = '#FBF3DC'; $ylB = '#B8860B'
$gyF = '#EEF1F4'; $gyB = '#607D8B'

Box 150 74  250 66 $L['display'] $L['display_sub'] $grF $grB
Box 640 74  250 66 $L['admin']   $L['admin_sub']   $grF $grB
Box 390 250 260 66 $L['api']     $L['api_sub']     $blF $blB
Box 730 250 210 66 $L['ad']      $L['ad_sub']      $gyF $gyB
Box 390 410 260 66 $L['db']      $L['db_sub']      $ylF $ylB
Box 70  250 230 66 $L['sync']    $L['sync_sub']    $gyF $gyB
Box 70  520 230 66 $L['his']     $L['his_sub']     $gyF $gyB

Arrow 260 140 470 250
Arrow 760 140 560 250
Arrow 520 316 520 410 $true
Arrow 650 283 730 283 $true
Arrow 185 520 185 316
Arrow 300 435 390 443

Lbl 300 176 $L['lbl_http']
Lbl 655 262 $L['lbl_auth']
Lbl 195 400 $L['lbl_sched']
Lbl 525 356 $L['lbl_dapper']

$out = Join-Path $PSScriptRoot $L['out']
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output ("OK " + $W + "x" + $H)
