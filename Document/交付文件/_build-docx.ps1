# Minimal Markdown-subset -> DOCX (Office Open XML) builder. ASCII-only script.
# Chinese content lives in the UTF-8 .md sources (read as UTF8); XML written as UTF-8 bytes.
# Supported: @C / @c (centered title/subtitle), # ## ### #### headings, > quote,
#   - bullet, "N. " numbered, | tables |, [[PAGEBREAK]], **bold** inline. --- ignored.
param(
  [Parameter(Mandatory=$true)][string]$In,
  [Parameter(Mandatory=$true)][string]$Out
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null

function Esc([string]$s) {
  if ($null -eq $s) { return '' }
  $s = $s -replace '&','&amp;'
  $s = $s -replace '<','&lt;'
  $s = $s -replace '>','&gt;'
  return $s
}
function Runs([string]$text, [bool]$boldBase = $false, [string]$extraRpr = '') {
  $parts = $text -split '\*\*'
  $sb = New-Object System.Text.StringBuilder
  for ($i = 0; $i -lt $parts.Count; $i++) {
    $seg = $parts[$i]
    if ($seg -eq '') { continue }
    $bold = $boldBase
    if (($i % 2) -eq 1) { $bold = -not $bold }
    $rpr = ''
    if ($bold -or $extraRpr -ne '') {
      $rpr = '<w:rPr>' + $(if ($bold) { '<w:b/>' } else { '' }) + $extraRpr + '</w:rPr>'
    }
    [void]$sb.Append('<w:r>' + $rpr + '<w:t xml:space="preserve">' + (Esc $seg) + '</w:t></w:r>')
  }
  if ($sb.Length -eq 0) { [void]$sb.Append('<w:r><w:t xml:space="preserve"></w:t></w:r>') }
  return $sb.ToString()
}
function Para([string]$inner, [string]$ppr = '') { return '<w:p>' + $ppr + $inner + '</w:p>' }
function Heading([string]$text, [int]$lvl) {
  return Para (Runs $text $false) ('<w:pPr><w:pStyle w:val="Heading' + $lvl + '"/></w:pPr>')
}
function CenterTitle([string]$text, [int]$halfpt, [bool]$bold) {
  $ppr = '<w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>'
  $extr = '<w:sz w:val="' + $halfpt + '"/><w:szCs w:val="' + $halfpt + '"/>'
  return Para (Runs $text $bold $extr) $ppr
}
function Bullet([string]$text) {
  return Para (Runs ('&#8226;  ' + $text)) '<w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:after="40"/></w:pPr>'
}
function Numbered([string]$text) {
  return Para (Runs $text) '<w:pPr><w:ind w:left="480" w:hanging="360"/><w:spacing w:after="40"/></w:pPr>'
}
function Quote([string]$text) {
  return Para (Runs $text $false '<w:i/><w:color w:val="595959"/>') '<w:pPr><w:ind w:left="360"/><w:spacing w:before="40" w:after="40"/></w:pPr>'
}
function Normal([string]$text) {
  return Para (Runs $text) '<w:pPr><w:spacing w:after="80" w:line="288" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
}
function PageBreak() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' }
function BuildTable([object[]]$rows) {
  if ($rows.Count -eq 0) { return '' }
  $ncol = 0
  foreach ($r in $rows) { if ($r.Count -gt $ncol) { $ncol = $r.Count } }
  if ($ncol -lt 1) { return '' }
  $total = 9498
  $cw = [int]($total / $ncol)
  $grid = '<w:tblGrid>'
  for ($c = 0; $c -lt $ncol; $c++) { $grid += '<w:gridCol w:w="' + $cw + '"/>' }
  $grid += '</w:tblGrid>'
  $tblPr = '<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0"/></w:tblPr>'
  $bodyRows = ''
  $first = $true
  foreach ($r in $rows) {
    $trp = ''
    if ($first) { $trp = '<w:trPr><w:tblHeader/></w:trPr>' }
    $cells = ''
    for ($c = 0; $c -lt $ncol; $c++) {
      $txt = ''
      if ($c -lt $r.Count) { $txt = $r[$c] }
      $shade = ''
      if ($first) { $shade = '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' }
      $tcPr = '<w:tcPr><w:tcW w:w="' + $cw + '" w:type="dxa"/>' + $shade + '<w:vAlign w:val="center"/></w:tcPr>'
      $cells += '<w:tc>' + $tcPr + (Para (Runs $txt $first) '<w:pPr><w:spacing w:after="0"/></w:pPr>') + '</w:tc>'
    }
    $bodyRows += '<w:tr>' + $trp + $cells + '</w:tr>'
    $first = $false
  }
  return '<w:tbl>' + $tblPr + $grid + $bodyRows + '</w:tbl>'
}

$lines = Get-Content -LiteralPath $In -Encoding UTF8
$blocks = New-Object System.Collections.ArrayList
$i = 0
while ($i -lt $lines.Count) {
  $t = $lines[$i].TrimEnd()
  if ($t -match '^\s*$') { $i++; continue }
  if ($t -eq '[[PAGEBREAK]]') { [void]$blocks.Add((PageBreak)); $i++; continue }
  if ($t -match '^---+$') { $i++; continue }
  if ($t.StartsWith('@C ')) { [void]$blocks.Add((CenterTitle $t.Substring(3) 44 $true)); $i++; continue }
  if ($t.StartsWith('@c ')) { [void]$blocks.Add((CenterTitle $t.Substring(3) 26 $false)); $i++; continue }
  if ($t.StartsWith('#### ')) { [void]$blocks.Add((Heading $t.Substring(5) 4)); $i++; continue }
  if ($t.StartsWith('### ')) { [void]$blocks.Add((Heading $t.Substring(4) 3)); $i++; continue }
  if ($t.StartsWith('## ')) { [void]$blocks.Add((Heading $t.Substring(3) 2)); $i++; continue }
  if ($t.StartsWith('# ')) { [void]$blocks.Add((Heading $t.Substring(2) 1)); $i++; continue }
  if ($t.StartsWith('> ')) { [void]$blocks.Add((Quote $t.Substring(2))); $i++; continue }
  if ($t.StartsWith('- ')) { [void]$blocks.Add((Bullet $t.Substring(2))); $i++; continue }
  if ($t -match '^\d+\.\s') { [void]$blocks.Add((Numbered $t)); $i++; continue }
  if ($t.StartsWith('|')) {
    $rows = New-Object System.Collections.ArrayList
    while ($i -lt $lines.Count -and $lines[$i].TrimEnd().StartsWith('|')) {
      $rl = $lines[$i].Trim()
      $cells = $rl.Trim('|') -split '\|'
      $cells = @($cells | ForEach-Object { $_.Trim() })
      $isSep = $true
      foreach ($cc in $cells) { if ($cc -notmatch '^:?-{2,}:?$') { $isSep = $false; break } }
      if (-not $isSep) { [void]$rows.Add($cells) }
      $i++
    }
    [void]$blocks.Add((BuildTable $rows.ToArray()))
    continue
  }
  [void]$blocks.Add((Normal $t)); $i++
}

$sectPr = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
$docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
  ($blocks -join '') + $sectPr + '</w:body></w:document>'

$stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="DFKai-SB" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="80" w:after="40"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>' +
  '<w:style w:type="table" w:default="1" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders></w:tblPr></w:style>' +
  '</w:styles>'

$ctypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>'
$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>'
$docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

function Add-Entry($zip, $name, $text) {
  $e = $zip.CreateEntry($name)
  $st = $e.Open()
  $b = [System.Text.Encoding]::UTF8.GetBytes($text)
  $st.Write($b, 0, $b.Length)
  $st.Dispose()
}
if (Test-Path -LiteralPath $Out) { Remove-Item -LiteralPath $Out -Force }
$fs = [System.IO.File]::Open($Out, [System.IO.FileMode]::CreateNew)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
Add-Entry $zip '[Content_Types].xml' $ctypes
Add-Entry $zip '_rels/.rels' $rootRels
Add-Entry $zip 'word/document.xml' $docXml
Add-Entry $zip 'word/styles.xml' $stylesXml
Add-Entry $zip 'word/_rels/document.xml.rels' $docRels
$zip.Dispose()
$fs.Dispose()
Write-Output ("OK: " + $Out + "  (" + $blocks.Count + " blocks)")
