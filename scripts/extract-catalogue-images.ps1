param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$cataloguePath = Join-Path $projectRoot "data\beverages.json"
$assetDirectory = Join-Path $projectRoot "assets\drinks\catalog"
$manifestDirectory = Join-Path $projectRoot "src\data"
$manifestPath = Join-Path $manifestDirectory "catalogueImages.ts"
$reportPath = Join-Path $projectRoot "data\catalogue-images.json"

if (-not (Test-Path -LiteralPath $WorkbookPath -PathType Leaf)) {
  throw "Catalogue workbook not found: $WorkbookPath"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipText {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$EntryName
  )

  $entry = $Archive.GetEntry($EntryName)
  if (-not $entry) {
    return $null
  }

  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    return $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }
}

function Resolve-ZipPath {
  param(
    [string]$BasePath,
    [string]$RelativePath
  )

  $segments = [System.Collections.Generic.List[string]]::new()
  foreach ($segment in (($BasePath + "/" + $RelativePath) -split "/")) {
    if (-not $segment -or $segment -eq ".") {
      continue
    }
    if ($segment -eq "..") {
      if ($segments.Count -gt 0) {
        $segments.RemoveAt($segments.Count - 1)
      }
      continue
    }
    $segments.Add($segment)
  }
  return ($segments -join "/")
}

function Get-RelationshipMap {
  param([xml]$Relationships)

  $map = @{}
  foreach ($relationship in $Relationships.SelectNodes("//*[local-name()='Relationship']")) {
    $map[$relationship.GetAttribute("Id")] = $relationship.GetAttribute("Target")
  }
  return $map
}

$catalogueJson = Get-Content -Raw -LiteralPath $cataloguePath | ConvertFrom-Json
$catalogue = @($catalogueJson | ForEach-Object { $_ })
$catalogueByLocation = @{}
foreach ($beverage in $catalogue) {
  if ($beverage.catalogue_source -and $beverage.workbook_row) {
    $catalogueByLocation["$($beverage.catalogue_source)|$($beverage.workbook_row)"] = $beverage
  }
}

New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $manifestDirectory | Out-Null

$archive = [System.IO.Compression.ZipFile]::OpenRead($WorkbookPath)
$extracted = [System.Collections.Generic.List[object]]::new()
$unmatchedAnchors = [System.Collections.Generic.List[object]]::new()

try {
  [xml]$workbook = Read-ZipText -Archive $archive -EntryName "xl/workbook.xml"
  [xml]$workbookRelationships = Read-ZipText -Archive $archive -EntryName "xl/_rels/workbook.xml.rels"
  $workbookRelationshipMap = Get-RelationshipMap $workbookRelationships

  foreach ($sheet in $workbook.SelectNodes("//*[local-name()='sheet']")) {
    $sheetName = $sheet.GetAttribute("name")
    if ($sheetName -eq "Overview") {
      continue
    }

    $sheetRelationshipId = $sheet.GetAttribute(
      "id",
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    )
    $sheetPath = Resolve-ZipPath -BasePath "xl" -RelativePath $workbookRelationshipMap[$sheetRelationshipId]
    $sheetDirectory = [System.IO.Path]::GetDirectoryName($sheetPath).Replace("\", "/")
    $sheetFileName = [System.IO.Path]::GetFileName($sheetPath)
    $sheetRelationshipsPath = "$sheetDirectory/_rels/$sheetFileName.rels"

    [xml]$sheetXml = Read-ZipText -Archive $archive -EntryName $sheetPath
    $drawingNode = $sheetXml.SelectSingleNode("//*[local-name()='drawing']")
    if (-not $drawingNode) {
      continue
    }

    [xml]$sheetRelationships = Read-ZipText -Archive $archive -EntryName $sheetRelationshipsPath
    $sheetRelationshipMap = Get-RelationshipMap $sheetRelationships
    $drawingRelationshipId = $drawingNode.GetAttribute(
      "id",
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    )
    $drawingPath = Resolve-ZipPath -BasePath $sheetDirectory -RelativePath $sheetRelationshipMap[$drawingRelationshipId]
    $drawingDirectory = [System.IO.Path]::GetDirectoryName($drawingPath).Replace("\", "/")
    $drawingFileName = [System.IO.Path]::GetFileName($drawingPath)
    $drawingRelationshipsPath = "$drawingDirectory/_rels/$drawingFileName.rels"

    [xml]$drawingXml = Read-ZipText -Archive $archive -EntryName $drawingPath
    [xml]$drawingRelationships = Read-ZipText -Archive $archive -EntryName $drawingRelationshipsPath
    $drawingRelationshipMap = Get-RelationshipMap $drawingRelationships

    foreach ($anchor in $drawingXml.SelectNodes("//*[local-name()='twoCellAnchor' or local-name()='oneCellAnchor']")) {
      $rowNode = $anchor.SelectSingleNode("./*[local-name()='from']/*[local-name()='row']")
      $blipNode = $anchor.SelectSingleNode(".//*[local-name()='blip']")
      if (-not $rowNode -or -not $blipNode) {
        continue
      }

      $workbookRow = [int]$rowNode.InnerText + 1
      $beverage = $catalogueByLocation["$sheetName|$workbookRow"]
      if (-not $beverage) {
        $unmatchedAnchors.Add([ordered]@{ sheet = $sheetName; workbook_row = $workbookRow })
        continue
      }

      $imageRelationshipId = $blipNode.GetAttribute(
        "embed",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
      )
      $imagePath = Resolve-ZipPath -BasePath $drawingDirectory -RelativePath $drawingRelationshipMap[$imageRelationshipId]
      $imageEntry = $archive.GetEntry($imagePath)
      if (-not $imageEntry) {
        throw "Embedded image not found for $($beverage.id): $imagePath"
      }
      if ([System.IO.Path]::GetExtension($imagePath).ToLowerInvariant() -ne ".png") {
        throw "Expected a PNG for $($beverage.id), found: $imagePath"
      }

      $destinationPath = Join-Path $assetDirectory "$($beverage.id).png"
      $sourceStream = $imageEntry.Open()
      $destinationStream = [System.IO.File]::Create($destinationPath)
      try {
        $sourceStream.CopyTo($destinationStream)
      }
      finally {
        $destinationStream.Dispose()
        $sourceStream.Dispose()
      }

      $extracted.Add([ordered]@{
        id = $beverage.id
        name = $beverage.name
        category = $beverage.category
        catalogue_source = $sheetName
        workbook_row = $workbookRow
        asset = "assets/drinks/catalog/$($beverage.id).png"
      })
    }
  }
}
finally {
  $archive.Dispose()
}

$uniqueExtracted = @($extracted.ToArray() | Sort-Object { [string]$_['id'] })
$extractedIds = [System.Collections.Generic.HashSet[string]]::new(
  [string[]]@($uniqueExtracted | ForEach-Object { [string]$_['id'] })
)
$missing = @(
  $catalogue |
    Where-Object { -not $extractedIds.Contains([string]$_.id) } |
    Sort-Object catalogue_source, workbook_row |
    ForEach-Object {
      [ordered]@{
        id = $_.id
        name = $_.name
        category = $_.category
        catalogue_source = $_.catalogue_source
        workbook_row = $_.workbook_row
      }
    }
)

$manifestLines = [System.Collections.Generic.List[string]]::new()
$manifestLines.Add('import type { ImageSourcePropType } from "react-native";')
$manifestLines.Add("")
$manifestLines.Add("// Generated from final catalogue.xlsx by scripts/extract-catalogue-images.ps1.")
$manifestLines.Add("// Static require calls ensure Metro bundles every transparent catalogue PNG.")
$manifestLines.Add("export const catalogueImages: Record<string, ImageSourcePropType> = {")
foreach ($image in $uniqueExtracted) {
  $manifestLines.Add("  `"$($image['id'])`": require(`"../../$($image['asset'])`"),")
}
$manifestLines.Add("};")
[System.IO.File]::WriteAllLines($manifestPath, $manifestLines, [System.Text.UTF8Encoding]::new($false))

$report = [ordered]@{
  workbook = [System.IO.Path]::GetFileName($WorkbookPath)
  catalogue_count = $catalogue.Count
  extracted_count = $uniqueExtracted.Count
  missing_count = $missing.Count
  unmatched_anchors = @($unmatchedAnchors.ToArray())
  images = $uniqueExtracted
  missing = $missing
}
[System.IO.File]::WriteAllText(
  $reportPath,
  ($report | ConvertTo-Json -Depth 5),
  [System.Text.UTF8Encoding]::new($false)
)

Write-Output "Extracted $($uniqueExtracted.Count) catalogue PNGs to assets/drinks/catalog."
Write-Output "Missing embedded PNGs: $($missing.Count)."
Write-Output "Unmatched drawing anchors: $($unmatchedAnchors.Count)."
Write-Output "Generated src/data/catalogueImages.ts and data/catalogue-images.json."
