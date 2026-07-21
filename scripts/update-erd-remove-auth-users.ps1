param(
    [string]$InputPath = 'D:\Skripsi\All diagram\ERD\ERD baru.xml',
    [string]$OutputPath = 'C:\Users\arnol\skripsialan\docs\ERD-baru-tanpa-auth-users.xml'
)

$ErrorActionPreference = 'Stop'

$document = New-Object System.Xml.XmlDocument
$document.PreserveWhitespace = $true
$document.Load($InputPath)

$root = $document.mxfile.diagram.mxGraphModel.root
$group = $root.UserObject | Where-Object { $_.id -eq '2' }
$authEntity = $root.UserObject | Where-Object { $_.label -eq 'AUTH_USERS' }
$usersEntity = $root.UserObject | Where-Object { $_.label -eq 'USERS' }

if (-not $group -or -not $authEntity -or -not $usersEntity) {
    throw 'Struktur ERD tidak sesuai: group, AUTH_USERS, atau USERS tidak ditemukan.'
}

$authId = [string]$authEntity.id
$usersId = [string]$usersEntity.id

# Hapus AUTH_USERS beserta seluruh baris/kolom tabelnya tanpa menyentuh
# koordinat elemen lain.
$idsToRemove = [System.Collections.Generic.HashSet[string]]::new()
[void]$idsToRemove.Add($authId)

do {
    $added = $false
    foreach ($node in @($root.ChildNodes)) {
        if ($node.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
        $parentId = $node.GetAttribute('parent')
        if (-not $parentId -and $node.Name -eq 'UserObject' -and $node.mxCell) {
            $parentId = $node.mxCell.GetAttribute('parent')
        }
        if ($parentId -and $idsToRemove.Contains($parentId)) {
            $nodeId = $node.GetAttribute('id')
            if ($nodeId -and $idsToRemove.Add($nodeId)) { $added = $true }
        }
    }
} while ($added)

foreach ($node in @($root.ChildNodes)) {
    if ($node.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
    if ($idsToRemove.Contains($node.GetAttribute('id'))) {
        [void]$root.RemoveChild($node)
    }
}

# Relasi AUTH_USERS -> USERS tidak lagi diperlukan.
$profileRelation = $root.UserObject | Where-Object { $_.id -eq '334' }
if ($profileRelation) {
    [void]$root.RemoveChild($profileRelation)
}

# Dua relasi bisnis dialihkan ke USERS. Hanya sumber garis yang berubah;
# geometry dan posisi tabel tetap mengikuti file asli.
foreach ($relationId in @('335', '336')) {
    $relation = $root.UserObject | Where-Object { $_.id -eq $relationId }
    if (-not $relation) { throw "Relasi $relationId tidak ditemukan." }
    $relation.mxCell.SetAttribute('source', $usersId)
    if ($relationId -eq '335') {
        $relation.SetAttribute('mermaidId', 'e:USERS->PROVIDERS#0')
    }
    else {
        $relation.SetAttribute('mermaidId', 'e:USERS->BOOKINGS#0')
    }
}

# Perbarui sumber Mermaid yang tersimpan sebagai metadata draw.io agar tidak
# membuat AUTH_USERS muncul kembali ketika diagram diedit.
$mermaidData = $group.GetAttribute('mermaidData') | ConvertFrom-Json
$diagramSource = [string]$mermaidData.data
$diagramSource = $diagramSource.Replace(
    '    AUTH_USERS ||--|| USERS : "memiliki profil aplikasi"' + "`n",
    ''
)
$diagramSource = $diagramSource.Replace(
    '    AUTH_USERS ||--o| PROVIDERS : "memiliki profil provider"',
    '    USERS ||--o| PROVIDERS : "memiliki profil provider"'
)
$diagramSource = $diagramSource.Replace(
    '    AUTH_USERS ||--o{ BOOKINGS : "membuat"',
    '    USERS ||--o{ BOOKINGS : "membuat"'
)
$diagramSource = [regex]::Replace(
    $diagramSource,
    '(?ms)^    AUTH_USERS \{\r?\n.*?^    \}\r?\n\r?\n',
    ''
)
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
