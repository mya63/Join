$files = @("src/app/board/board.ts", "src/app/services/fb-service.ts", "src/app/services/fb-task-service.ts", "src/app/contacts/edit-desktop/edit-desktop.ts")
function Find-LongMethods($filePath) {
    if (-not (Test-Path $filePath)) { return }
    $lines = Get-Content $filePath
    $methodRegex = '^\s*(?:(?:public|private|protected|static|async)\s+)*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{'
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match $methodRegex) {
            $name = $matches[1]
            $startLine = $i + 1
            $braceCount = 0
            for ($j = $i; $j -lt $lines.Count; $j++) {
                $l = $lines[$j]
                $braceCount += ($l.ToCharArray() | Where-Object { $_ -eq '{' }).Count
                $braceCount -= ($l.ToCharArray() | Where-Object { $_ -eq '}' }).Count
                if ($braceCount -eq 0) {
                    $endLine = $j + 1
                    $length = $endLine - $startLine + 1
                    if ($length -gt 14) { 
                        Write-Output "${filePath}:${startLine}:${length} ($name)" 
                    }
                    $i = $j
                    break
                }
            }
        }
    }
}
foreach ($file in $files) { Find-LongMethods $file }
