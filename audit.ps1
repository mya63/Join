$includeExtensions = @(".ts", ".js", ".scss", ".css", ".json", ".md", ".yml", ".yaml")
$excludeDirs = @("dist", "node_modules", ".git", ".angular")
$scopeTsJsDirs = @("src", ".")

$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $path = $_.FullName
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    $relativeDir = $_.DirectoryName.Replace((Get-Location).Path, "").TrimStart('\')
    
    $inExcluded = $false
    foreach ($dir in $excludeDirs) {
        if ($relativeDir -eq $dir -or $relativeDir.StartsWith("$dir\")) {
            $inExcluded = $true
            break
        }
    }
    !$inExcluded -and ($includeExtensions -contains $ext)
}

$totalFiles = $files.Count
$rule1Files = @()
$longFunctions = @()
$missingJsDoc = @()

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    if ($lines.Count -gt 400) {
        $rule1Files += $file.FullName
    }

    $ext = [System.IO.Path]::GetExtension($file.FullName).ToLower()
    $relativeDir = $file.DirectoryName.Replace((Get-Location).Path, "").TrimStart('\')
    
    $isTsJsScope = $false
    if ($ext -eq ".ts" -and ($relativeDir -eq "src" -or $relativeDir.StartsWith("src\"))) { $isTsJsScope = $true }
    if ($ext -eq ".js" -and ($relativeDir -eq "" -or $relativeDir -eq ".")) { $isTsJsScope = $true }

    if ($isTsJsScope) {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        # Simplified heuristic: find function-like patterns
        # Matching: function name(...) or (name)? (...) => { or name(...) {
        # This is a basic regex-based heuristic for function detection
        $matches = [regex]::Matches($content, '(?ms)(?:/\*\*.*?\*/\s*)?((?:export\s+|async\s+)*function\s+([a-zA-Z0-9_]+)\s*\(.*?\)\s*\{|([a-zA-Z0-9_]+)\s*\(.*?\)\s*\{)')
        
        foreach ($match in $matches) {
            $startIndex = $match.Index
            $matchText = $match.Value
            
            # Find line number
            $lineNum = ($content.Substring(0, $startIndex).Split("`n")).Count
            
            # Heuristic brace matching to find end of function
            $braceCount = 0
            $foundFirst = $false
            $endIndex = -1
            for ($i = $startIndex; $i -lt $content.Length; $i++) {
                if ($content[$i] -eq '{') {
                    $braceCount++
                    $foundFirst = $true
                } elseif ($content[$i] -eq '}') {
                    $braceCount--
                    if ($foundFirst -and $braceCount -eq 0) {
                        $endIndex = $i
                        break
                    }
                }
            }
            
            if ($endIndex -ne -1) {
                $funcContent = $content.Substring($startIndex, $endIndex - $startIndex + 1)
                $funcLines = ($funcContent.Split("`n")).Count
                
                $funcNameMatch = [regex]::Match($matchText, '(?:function\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\s*\()')
                $funcName = if ($funcNameMatch.Groups[1].Value) { $funcNameMatch.Groups[1].Value } else { $funcNameMatch.Groups[2].Value }

                if ($funcLines -gt 14) {
                    $longFunctions += [PSCustomObject]@{ File = $file.FullName; Line = $lineNum; Length = $funcLines; Name = $funcName }
                }

                if (-not $matchText.StartsWith("/**")) {
                    $missingJsDoc += [PSCustomObject]@{ File = $file.FullName; Line = $lineNum; Function = $funcName }
                }
            }
        }
    }
}

Write-Host "Total Files Scanned: $totalFiles"
Write-Host "`nRule 1: Files with > 400 lines:"
$rule1Files | ForEach-Object { Write-Host $_ }

Write-Host "`nFunctions > 14 lines (Top 100):"
$longFunctions | Sort-Object Length -Descending | Select-Object -First 100 | ForEach-Object {
    Write-Host "$($_.File):$($_.Line):$($_.Length)"
}

Write-Host "`nMissing JSDoc (Top 100):"
$missingJsDoc | Select-Object -First 100 | ForEach-Object {
    Write-Host "$($_.File):$($_.Line):$($_.Function)"
}
