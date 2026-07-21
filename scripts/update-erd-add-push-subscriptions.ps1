param(
    [string]$InputPath = 'C:\Users\arnol\skripsialan\docs\ERD-baru-tanpa-auth-users.xml',
    [string]$OutputPath = 'C:\Users\arnol\skripsialan\docs\ERD-baru-dengan-push-subscriptions.xml'
)

$ErrorActionPreference = 'Stop'

$document = New-Object System.Xml.XmlDocument
$document.PreserveWhitespace = $true
$document.Load($InputPath)

$root = $document.mxfile.diagram.mxGraphModel.root
$group = $root.UserObject | Where-Object { $_.id -eq '2' }
$usersEntity = $root.UserObject | Where-Object { $_.label -eq 'USERS' }

if (-not $group -or -not $usersEntity) {
    throw 'Struktur ERD tidak sesuai: group atau tabel USERS tidak ditemukan.'
}
if ($root.UserObject | Where-Object { $_.label -eq 'PUSH_SUBSCRIPTIONS' }) {
    throw 'Tabel PUSH_SUBSCRIPTIONS sudah terdapat pada ERD sumber.'
}

$tableId = 342
$relationId = 387
$tableWidth = 390
$typeWidth = 115
$nameWidth = 232
$keyWidth = 43
$rowHeight = 43
$tableX = 1110
$tableY = 2000

$fields = @(
    @('uuid',        'id',               'PK'),
    @('uuid',        'user_id',          'FK'),
    @('text',        'endpoint',         'UK'),
    @('text',        'p256dh',           ''),
    @('text',        'auth_key',         ''),
    @('bigint',      'expiration_time',  ''),
    @('text',        'user_agent',       ''),
    @('timestamptz', 'created_at',       ''),
    @('timestamptz', 'updated_at',       ''),
    @('timestamptz', 'last_success_at',  ''),
    @('timestamptz', 'last_failure_at',  '')
)

$tableBaseStyle = 'shape=table;startSize=43;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontSize=16;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;strokeWidth=1;align=center;resizeLast=1;html=1;fillColor=light-dark(#ECECFF,#1f2020);strokeColor=light-dark(#9370DB,#cccccc);fontColor=light-dark(#333333,#cccccc);'
$tableStyle = 'shape=table;startSize=43;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontSize=16;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;strokeWidth=1;align=center;resizeLast=1;html=1;rounded=0;labelBackgroundColor=none;'
$rowStyle = 'shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=1;strokeWidth=1;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;top=0;left=0;right=0;bottom=0;rounded=0;labelBackgroundColor=none;'
$cellStyle = 'shape=partialRectangle;connectable=0;fillColor=none;strokeWidth=1;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;top=1;left=1;bottom=1;right=1;align=left;spacingLeft=8;overflow=hidden;fontSize=16;rounded=0;labelBackgroundColor=none;'

function Set-Attributes {
    param(
        [System.Xml.XmlElement]$Element,
        [hashtable]$Attributes
    )
    foreach ($entry in $Attributes.GetEnumerator()) {
        $Element.SetAttribute([string]$entry.Key, [string]$entry.Value)
    }
}

function New-Geometry {
    param(
        [int]$Height,
        [int]$Width,
        [Nullable[int]]$X,
        [Nullable[int]]$Y
    )
    $geometry = $document.CreateElement('mxGeometry')
    Set-Attributes $geometry @{ height = $Height; width = $Width; as = 'geometry' }
    if ($null -ne $X) { $geometry.SetAttribute('x', [string]$X) }
    if ($null -ne $Y) { $geometry.SetAttribute('y', [string]$Y) }
    return $geometry
}

$anchor = $root.UserObject | Where-Object { $_.id -eq '335' }
if (-not $anchor) { throw 'Anchor relasi pertama tidak ditemukan.' }

$table = $document.CreateElement('UserObject')
Set-Attributes $table @{
    label = 'PUSH_SUBSCRIPTIONS'
    mermaidId = 'n:PUSH_SUBSCRIPTIONS'
    mermaidBaseStyle = $tableBaseStyle
    mermaidBaseValue = 'PUSH_SUBSCRIPTIONS'
    id = $tableId
}
$tableCell = $document.CreateElement('mxCell')
Set-Attributes $tableCell @{ parent = '2'; style = $tableStyle; vertex = '1' }
$tableHeight = $rowHeight * ($fields.Count + 1)
[void]$tableCell.AppendChild((New-Geometry -Height $tableHeight -Width $tableWidth -X $tableX -Y $tableY))
[void]$table.AppendChild($tableCell)
[void]$root.InsertBefore($table, $anchor)

for ($index = 0; $index -lt $fields.Count; $index++) {
    $rowId = $tableId + 1 + ($index * 4)
    $row = $document.CreateElement('mxCell')
    Set-Attributes $row @{ id = $rowId; parent = $tableId; style = $rowStyle; vertex = '1' }
    [void]$row.AppendChild((New-Geometry -Height $rowHeight -Width $tableWidth -X $null -Y ($rowHeight * ($index + 1))))
    [void]$root.InsertBefore($row, $anchor)

    $values = $fields[$index]
    $widths = @($typeWidth, $nameWidth, $keyWidth)
    $xPositions = @(0, $typeWidth, $typeWidth + $nameWidth)

    for ($column = 0; $column -lt 3; $column++) {
        $cell = $document.CreateElement('mxCell')
        Set-Attributes $cell @{
            id = $rowId + $column + 1
            parent = $rowId
            style = $cellStyle
            value = [string]$values[$column]
            vertex = '1'
        }
        $cellGeometry = New-Geometry -Height $rowHeight -Width $widths[$column] -X $(if ($column -eq 0) { $null } else { $xPositions[$column] }) -Y $null
        $alternate = $document.CreateElement('mxRectangle')
        Set-Attributes $alternate @{ height = $rowHeight; width = $widths[$column]; as = 'alternateBounds' }
        [void]$cellGeometry.AppendChild($alternate)
        [void]$cell.AppendChild($cellGeometry)
        [void]$root.InsertBefore($cell, $anchor)
    }
}

$relation = $document.CreateElement('UserObject')
Set-Attributes $relation @{
    label = '"mendaftarkan perangkat"'
    mermaidId = 'e:USERS->PUSH_SUBSCRIPTIONS#0'
    mermaidBaseStyle = 'curved=0;startArrow=ERmandOne;startSize=14;endArrow=ERzeroToMany;endSize=14;strokeColor=light-dark(#333333,#cccccc);strokeWidth=1;html=1;fontSize=14;labelBackgroundColor=light-dark(#F8FFEC4D,#2a2a2a4D);fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=light-dark(#333333,#cccccc);exitX=0.84;exitY=1;entryX=0.5;entryY=0;'
    mermaidBaseValue = '"mendaftarkan perangkat"'
    id = $relationId
}
$relationCell = $document.CreateElement('mxCell')
Set-Attributes $relationCell @{
    edge = '1'
    parent = '2'
    source = [string]$usersEntity.id
    target = [string]$tableId
    style = 'curved=0;startArrow=ERmandOne;startSize=14;endArrow=ERzeroToMany;endSize=14;strokeWidth=1;html=1;fontSize=14;labelBackgroundColor=none;fontFamily=Trebuchet MS,Verdana,Arial,sans-serif;fontColor=default;exitX=0.84;exitY=1;entryX=0.5;entryY=0;rounded=0;'
}
$relationGeometry = $document.CreateElement('mxGeometry')
Set-Attributes $relationGeometry @{ relative = '1'; as = 'geometry' }
[void]$relationCell.AppendChild($relationGeometry)
[void]$relation.AppendChild($relationCell)
[void]$root.AppendChild($relation)

# Sinkronkan metadata Mermaid agar tabel tidak hilang jika diagram diedit ulang.
$mermaidData = $group.GetAttribute('mermaidData') | ConvertFrom-Json
$diagramSource = [string]$mermaidData.data
$bookingRelation = '    USERS ||--o{ BOOKINGS : "membuat"'
$pushRelation = '    USERS ||--o{ PUSH_SUBSCRIPTIONS : "mendaftarkan perangkat"'
if (-not $diagramSource.Contains($pushRelation)) {
    $diagramSource = $diagramSource.Replace(
        $bookingRelation,
        $bookingRelation + "`n" + $pushRelation
    )
}

$pushEntitySource = @'

    PUSH_SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        text endpoint UK
        text p256dh
        text auth_key
        bigint expiration_time
        text user_agent
        timestamptz created_at
        timestamptz updated_at
        timestamptz last_success_at
        timestamptz last_failure_at
    }
'@

if (-not $diagramSource.Contains('    PUSH_SUBSCRIPTIONS {')) {
    $diagramSource = $diagramSource.TrimEnd() + $pushEntitySource + "`n"
}
$mermaidData.data = $diagramSource
$group.SetAttribute('mermaidData', ($mermaidData | ConvertTo-Json -Compress -Depth 10))

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.IndentChars = '  '
$settings.NewLineChars = "`r`n"
$settings.NewLineHandling = [System.Xml.NewLineHandling]::Replace
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)

$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$writer = [System.Xml.XmlWriter]::Create($OutputPath, $settings)
try {
    $document.Save($writer)
}
finally {
    $writer.Dispose()
}

Write-Output $OutputPath
