<#
.SYNOPSIS
    Checks whether this computer is ready for ITCC47 laboratory work.

.DESCRIPTION
    Finds what is installed, says what is missing, and proves the result by
    actually running a program rather than only reading version numbers.
    Writes an HTML report and opens it in your browser.

    Nothing is installed or changed unless you pass -Install.

.PARAMETER Install
    Install anything missing, using winget. Asks before it starts.

.PARAMETER NoBrowser
    Write the report but do not open it.

.PARAMETER PackagePath
    Path to your ITCC47-Laboratory-Package folder. Only needed if it is
    somewhere unusual; common locations are searched automatically.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File doctor.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File doctor.ps1 -Install
#>
[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$NoBrowser,
    [string]$PackagePath
)

$ErrorActionPreference = 'Continue'

# Python 3.7 is the true floor: tools/run_cases.py uses `from __future__ import
# annotations` with builtin generics, which is 3.7+. Anything older than 3.9 is
# long out of support, so that is what we ask for.
$PythonMinimum = [version]'3.9'
$PythonWanted  = '3.13'

# ---------------------------------------------------------------------------
# check records
# ---------------------------------------------------------------------------

$script:Checks = @()

function Add-Check {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('ok', 'warn', 'fail', 'info')][string]$Status,
        [string]$Detail = '',
        [string]$Fix = '',
        [string]$Link = '',
        [string]$LinkLabel = '',
        [string]$Group = 'Required'
    )
    $script:Checks += [pscustomobject]@{
        Name      = $Name
        Status    = $Status
        Detail    = $Detail
        Fix       = $Fix
        Link      = $Link
        LinkLabel = $LinkLabel
        Group     = $Group
    }
}

function Write-Line {
    param([string]$Status, [string]$Name, [string]$Detail)
    $mark = '  - '
    $colour = 'Gray'
    if ($Status -eq 'ok')   { $mark = '  OK   '; $colour = 'Green' }
    if ($Status -eq 'warn') { $mark = '  WARN '; $colour = 'Yellow' }
    if ($Status -eq 'fail') { $mark = '  FAIL '; $colour = 'Red' }
    if ($Status -eq 'info') { $mark = '  ..   '; $colour = 'DarkGray' }
    Write-Host $mark -ForegroundColor $colour -NoNewline
    Write-Host $Name -NoNewline
    if ($Detail) { Write-Host "  $Detail" -ForegroundColor DarkGray } else { Write-Host '' }
}

# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------

function Get-CommandPath {
    param([string]$Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $cmd) { return $null }
    if ($cmd.Path) { return $cmd.Path }
    return $cmd.Source
}

<#
Windows ships stub files called python.exe and python3.exe in WindowsApps that
do nothing but open the Microsoft Store. They are zero bytes and they sit ahead
of a real install on PATH, so a student can "have Python" and still have every
command fail. This is the single most common way this setup goes wrong, so it
is detected explicitly rather than reported as a mysterious failure.
#>
function Test-StoreStub {
    param([string]$Path)
    if (-not $Path) { return $false }
    if ($Path -notlike '*\AppData\Local\Microsoft\WindowsApps\*') { return $false }
    $item = Get-Item -LiteralPath $Path -ErrorAction SilentlyContinue
    if ($null -eq $item) { return $false }
    return ($item.Length -eq 0)
}

function Invoke-Tool {
    param([string]$File, [string[]]$Arguments)
    $result = [pscustomobject]@{ ExitCode = -1; StdOut = ''; StdErr = '' }
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $File
        $psi.Arguments = ($Arguments -join ' ')
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $proc = [System.Diagnostics.Process]::Start($psi)
        $result.StdOut = $proc.StandardOutput.ReadToEnd()
        $result.StdErr = $proc.StandardError.ReadToEnd()
        $proc.WaitForExit()
        $result.ExitCode = $proc.ExitCode
    } catch {
        $result.StdErr = $_.Exception.Message
    }
    return $result
}

function Get-VersionFromText {
    param([string]$Text)
    $m = [regex]::Match($Text, '(\d+)\.(\d+)(?:\.(\d+))?')
    if (-not $m.Success) { return $null }
    $patch = '0'
    if ($m.Groups[3].Success) { $patch = $m.Groups[3].Value }
    try { return [version]"$($m.Groups[1].Value).$($m.Groups[2].Value).$patch" } catch { return $null }
}

# ---------------------------------------------------------------------------

Write-Host ''
Write-Host '  ITCC47 - Environment Check' -ForegroundColor Cyan
Write-Host '  Data Structures and Algorithms' -ForegroundColor DarkGray
Write-Host ''

# ---------- Windows and PowerShell ----------

$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$osName = 'Windows'
if ($os) { $osName = "$($os.Caption) (build $($os.BuildNumber))" }
Add-Check -Name 'Windows' -Status 'info' -Detail $osName -Group 'System'
Write-Line 'info' 'Windows' $osName

$psVersion = $PSVersionTable.PSVersion.ToString()
Add-Check -Name 'PowerShell' -Status 'info' -Detail $psVersion -Group 'System'
Write-Line 'info' 'PowerShell' $psVersion

# winget is how -Install does its work. Its absence is not a failure on its own.
$wingetPath = Get-CommandPath 'winget'
$hasWinget = [bool]$wingetPath
if ($hasWinget) {
    Add-Check -Name 'winget (App Installer)' -Status 'ok' -Detail 'available' -Group 'System'
    Write-Line 'ok' 'winget' 'available'
} else {
    Add-Check -Name 'winget (App Installer)' -Status 'warn' `
        -Detail 'not found' `
        -Fix 'Without winget this script cannot install anything for you. You can still install each tool by hand using the links below, or install App Installer from the Microsoft Store.' `
        -Link 'https://apps.microsoft.com/detail/9nblggh4nns1' -LinkLabel 'Get App Installer' -Group 'System'
    Write-Line 'warn' 'winget' 'not found - automatic install unavailable'
}

# ---------- Python ----------

$pythonCmd = $null      # the command students should type
$pythonArgs = @()
$pythonVersion = $null

# The py launcher is preferred: it is installed with Python on Windows, it is
# not shadowed by the Store stubs, and it keeps working when several versions
# are installed side by side.
$pyPath = Get-CommandPath 'py'
if ($pyPath) {
    $r = Invoke-Tool -File 'py' -Arguments @('-3', '--version')
    if ($r.ExitCode -eq 0) {
        $v = Get-VersionFromText ($r.StdOut + $r.StdErr)
        if ($v) { $pythonCmd = 'py'; $pythonArgs = @('-3'); $pythonVersion = $v }
    }
}

$pythonExe = Get-CommandPath 'python'
$stubbed = Test-StoreStub $pythonExe

if (-not $pythonCmd -and $pythonExe -and -not $stubbed) {
    $r = Invoke-Tool -File 'python' -Arguments @('--version')
    if ($r.ExitCode -eq 0) {
        $v = Get-VersionFromText ($r.StdOut + $r.StdErr)
        if ($v) { $pythonCmd = 'python'; $pythonArgs = @(); $pythonVersion = $v }
    }
}

if ($stubbed -and -not $pythonCmd) {
    Add-Check -Name 'Python 3' -Status 'fail' `
        -Detail 'only the Microsoft Store placeholder was found' `
        -Fix ("Windows ships a fake python.exe that just opens the Microsoft Store, and it is currently first on your PATH. " +
              "Install real Python, then turn the placeholder off: Settings > Apps > Advanced app settings > App execution aliases, " +
              "and switch off both 'python.exe' and 'python3.exe'.") `
        -Link 'https://www.python.org/downloads/windows/' -LinkLabel 'Download Python'
    Write-Line 'fail' 'Python 3' 'only the Microsoft Store placeholder was found'
} elseif (-not $pythonCmd) {
    Add-Check -Name 'Python 3' -Status 'fail' `
        -Detail 'not installed' `
        -Fix ("Install Python $PythonWanted. On the first screen of the installer, tick " +
              "'Add python.exe to PATH' before pressing Install - almost every later problem comes from missing that box.") `
        -Link 'https://www.python.org/downloads/windows/' -LinkLabel 'Download Python'
    Write-Line 'fail' 'Python 3' 'not installed'
} elseif ($pythonVersion -lt $PythonMinimum) {
    Add-Check -Name 'Python 3' -Status 'fail' `
        -Detail "$pythonVersion is too old (need $PythonMinimum or newer)" `
        -Fix "Install Python $PythonWanted alongside it. You do not need to remove the old one." `
        -Link 'https://www.python.org/downloads/windows/' -LinkLabel 'Download Python'
    Write-Line 'fail' 'Python 3' "$pythonVersion is too old"
} else {
    $how = $pythonCmd
    if ($pythonArgs.Count) { $how = "$pythonCmd $($pythonArgs -join ' ')" }
    Add-Check -Name 'Python 3' -Status 'ok' -Detail "$pythonVersion, run as '$how'"
    Write-Line 'ok' 'Python 3' "$pythonVersion (run it as '$how')"

    if ($stubbed) {
        Add-Check -Name 'Store placeholder for python' -Status 'warn' `
            -Detail 'present, and ahead of your real Python on PATH' `
            -Fix ("Typing 'python' will open the Microsoft Store instead of running your program. Use '$how' instead, " +
                  "or switch the placeholder off: Settings > Apps > Advanced app settings > App execution aliases.")
        Write-Line 'warn' 'Store placeholder' "typing 'python' opens the Store - use '$how'"
    }
}

# ---------- pip ----------

if ($pythonCmd) {
    $r = Invoke-Tool -File $pythonCmd -Arguments ($pythonArgs + @('-m', 'pip', '--version'))
    if ($r.ExitCode -eq 0) {
        $v = Get-VersionFromText $r.StdOut
        $detail = 'available'
        if ($v) { $detail = "$v" }
        Add-Check -Name 'pip' -Status 'ok' -Detail $detail -Group 'Recommended'
        Write-Line 'ok' 'pip' $detail
    } else {
        Add-Check -Name 'pip' -Status 'warn' -Detail 'not working' `
            -Fix "Nothing in this course needs extra packages yet, so you can carry on. To repair it, run: $pythonCmd $($pythonArgs -join ' ') -m ensurepip --upgrade" `
            -Group 'Recommended'
        Write-Line 'warn' 'pip' 'not working (not needed yet)'
    }
}

# ---------- Git ----------

$gitPath = Get-CommandPath 'git'
if ($gitPath) {
    $r = Invoke-Tool -File 'git' -Arguments @('--version')
    $v = Get-VersionFromText $r.StdOut
    $detail = 'installed'
    if ($v) { $detail = "$v" }
    Add-Check -Name 'Git' -Status 'ok' -Detail $detail
    Write-Line 'ok' 'Git' $detail

    $nameOut  = (Invoke-Tool -File 'git' -Arguments @('config', '--global', 'user.name')).StdOut.Trim()
    $emailOut = (Invoke-Tool -File 'git' -Arguments @('config', '--global', 'user.email')).StdOut.Trim()
    if ($nameOut -and $emailOut) {
        Add-Check -Name 'Git identity' -Status 'ok' -Detail "$nameOut <$emailOut>" -Group 'Recommended'
        Write-Line 'ok' 'Git identity' "$nameOut <$emailOut>"
    } else {
        Add-Check -Name 'Git identity' -Status 'warn' -Detail 'not set' `
            -Fix ('Git records who made each change. Set it once with your real name and your CMU address:' + "`n" +
                  'git config --global user.name "Your Name"' + "`n" +
                  'git config --global user.email "you@cmu.edu.ph"') `
            -Group 'Recommended'
        Write-Line 'warn' 'Git identity' 'not set'
    }
} else {
    Add-Check -Name 'Git' -Status 'fail' -Detail 'not installed' `
        -Fix 'Git tracks the history of your work and is how you will collect the laboratory package. Accept the installer defaults.' `
        -Link 'https://git-scm.com/download/win' -LinkLabel 'Download Git'
    Write-Line 'fail' 'Git' 'not installed'
}

# ---------- editor ----------

$codePath = Get-CommandPath 'code'
if ($codePath) {
    # 'code' is a .cmd shim, which does not always report a version through a
    # redirected pipe. Finding it on PATH is the part that matters.
    $r = Invoke-Tool -File 'code' -Arguments @('--version')
    $codeDetail = 'installed'
    if ($r.StdOut) {
        $first = (($r.StdOut -split "`n")[0]).Trim()
        if ($first) { $codeDetail = $first }
    }
    Add-Check -Name 'Visual Studio Code' -Status 'ok' -Detail $codeDetail -Group 'Recommended'
    Write-Line 'ok' 'Visual Studio Code' $codeDetail
} else {
    Add-Check -Name 'Visual Studio Code' -Status 'warn' -Detail 'not found on PATH' `
        -Fix ("Any editor will do, but VS Code is what the demonstrations use. If you already have it, tick " +
              "'Add to PATH' in the installer so the 'code' command works.") `
        -Link 'https://code.visualstudio.com/Download' -LinkLabel 'Download VS Code' -Group 'Recommended'
    Write-Line 'warn' 'Visual Studio Code' 'not found on PATH'
}

# ---------------------------------------------------------------------------
# install (opt-in)
# ---------------------------------------------------------------------------

if ($Install) {
    $wanted = @()
    if (-not $pythonCmd) { $wanted += [pscustomobject]@{ Id = 'Python.Python.3.13'; Label = 'Python 3.13' } }
    if (-not $gitPath)   { $wanted += [pscustomobject]@{ Id = 'Git.Git';            Label = 'Git' } }
    if (-not $codePath)  { $wanted += [pscustomobject]@{ Id = 'Microsoft.VisualStudioCode'; Label = 'Visual Studio Code' } }

    Write-Host ''
    if (-not $hasWinget) {
        Write-Host '  Cannot install: winget is not available on this computer.' -ForegroundColor Yellow
        Write-Host '  Use the download links in the report instead.' -ForegroundColor DarkGray
    } elseif ($wanted.Count -eq 0) {
        Write-Host '  Nothing to install - everything required is already here.' -ForegroundColor Green
    } else {
        Write-Host '  About to install:' -ForegroundColor Cyan
        $wanted | ForEach-Object { Write-Host "    - $($_.Label)" }
        Write-Host ''
        $answer = Read-Host '  Continue? (y/N)'
        if ($answer -eq 'y' -or $answer -eq 'Y') {
            foreach ($pkg in $wanted) {
                Write-Host "  Installing $($pkg.Label)..." -ForegroundColor Cyan
                # --scope user avoids needing an administrator password.
                & winget install --id $pkg.Id -e --scope user --accept-package-agreements --accept-source-agreements
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  winget could not install $($pkg.Label) for you. Use the link in the report." -ForegroundColor Yellow
                }
            }
            Write-Host ''
            Write-Host '  Installation finished.' -ForegroundColor Green
            Write-Host '  Close this window, open a NEW one, and run this script again.' -ForegroundColor Yellow
            Write-Host '  New programs are only visible to terminals opened after they were installed.' -ForegroundColor DarkGray
            Write-Host ''
        } else {
            Write-Host '  Skipped.' -ForegroundColor DarkGray
        }
    }
}

# ---------------------------------------------------------------------------
# proof: actually run something
# ---------------------------------------------------------------------------
# A version number only proves a file exists. The laboratory work needs Python
# to read standard input, write standard output, and exit cleanly, so that is
# what gets tested here.

if ($pythonCmd) {
    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("itcc47-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    try {
        $program = @'
import sys

values = sys.stdin.read().split()
print(int(values[0]) + int(values[1]))
'@
        $mainPy = Join-Path $temp 'main.py'
        [System.IO.File]::WriteAllText($mainPy, $program, (New-Object System.Text.UTF8Encoding($false)))

        # Feed stdin from a file rather than through StandardInput. The writer
        # behind StandardInput emits a UTF-8 byte-order mark when it closes,
        # which reaches the program as a stray character before the first value
        # and breaks int(). Redirecting from a file we wrote ourselves keeps the
        # bytes exactly as intended, which is also how run_cases.py feeds input.
        $stdinFile  = Join-Path $temp 'input.txt'
        $stdoutFile = Join-Path $temp 'stdout.txt'
        $stderrFile = Join-Path $temp 'stderr.txt'
        [System.IO.File]::WriteAllBytes($stdinFile, [System.Text.Encoding]::ASCII.GetBytes("3 4`n"))

        $argList = $pythonArgs + @("`"$mainPy`"")
        $proc = Start-Process -FilePath $pythonCmd -ArgumentList $argList `
            -RedirectStandardInput $stdinFile `
            -RedirectStandardOutput $stdoutFile `
            -RedirectStandardError $stderrFile `
            -NoNewWindow -Wait -PassThru

        $actual = ''
        if (Test-Path -LiteralPath $stdoutFile) { $actual = [System.IO.File]::ReadAllText($stdoutFile) }
        $errText = ''
        if (Test-Path -LiteralPath $stderrFile) { $errText = [System.IO.File]::ReadAllText($stderrFile) }

        $normalised = $actual.Replace("`r`n", "`n").Replace("`r", "`n")
        if ($proc.ExitCode -eq 0 -and $normalised -eq "7`n") {
            Add-Check -Name 'Running a program end to end' -Status 'ok' `
                -Detail 'read input, produced exactly the expected output' -Group 'Proof'
            Write-Line 'ok' 'Running a program end to end' 'exact output matched'
        } else {
            $why = "expected '7', got '" + $normalised.Trim() + "'"
            if ($proc.ExitCode -ne 0) { $why = "exit code $($proc.ExitCode). $($errText.Trim())" }
            Add-Check -Name 'Running a program end to end' -Status 'fail' -Detail $why `
                -Fix 'Python is installed but could not run a simple program. Reinstall Python, ticking "Add python.exe to PATH".' `
                -Group 'Proof'
            Write-Line 'fail' 'Running a program end to end' $why
        }
    } catch {
        Add-Check -Name 'Running a program end to end' -Status 'fail' -Detail $_.Exception.Message -Group 'Proof'
        Write-Line 'fail' 'Running a program end to end' $_.Exception.Message
    } finally {
        Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ---------- the course checker, if the package is here ----------

$packageRoots = @()
if ($PackagePath) { $packageRoots += $PackagePath }
$packageRoots += @(
    (Join-Path $PSScriptRoot '..\ITCC47-Laboratory-Package'),
    (Join-Path $HOME 'Documents\ITCC47-Laboratory-Package'),
    (Join-Path $HOME 'Desktop\ITCC47-Laboratory-Package'),
    (Join-Path $HOME 'Downloads\ITCC47-Laboratory-Package')
)

$runner = $null
foreach ($root in $packageRoots) {
    if (-not $root) { continue }
    $candidate = Join-Path $root 'tools\run_cases.py'
    if (Test-Path -LiteralPath $candidate) { $runner = (Resolve-Path $candidate).Path; break }
}

if ($pythonCmd -and $runner) {
    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("itcc47-cases-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
    $caseDir = Join-Path $temp 'cases'
    New-Item -ItemType Directory -Path $caseDir -Force | Out-Null
    try {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText((Join-Path $temp 'main.py'), "import sys`n`nvalues = sys.stdin.read().split()`nprint(int(values[0]) + int(values[1]))`n", $utf8)
        [System.IO.File]::WriteAllText((Join-Path $caseDir '01-example.in'), "3 4`n", $utf8)
        [System.IO.File]::WriteAllText((Join-Path $caseDir '01-example.out'), "7`n", $utf8)

        # not $args — that is an automatic variable in PowerShell
        $runnerArgs = $pythonArgs + @("`"$runner`"", '--cases', "`"$caseDir`"", '--', $pythonCmd) + $pythonArgs + @("`"$(Join-Path $temp 'main.py')`"")
        $r = Invoke-Tool -File $pythonCmd -Arguments $runnerArgs
        if ($r.ExitCode -eq 0 -and $r.StdOut -match 'RESULT 1/1 passed') {
            Add-Check -Name 'Course checker (run_cases.py)' -Status 'ok' -Detail 'ran a sample case and passed' -Group 'Proof'
            Write-Line 'ok' 'Course checker' 'ran a sample case and passed'
        } else {
            Add-Check -Name 'Course checker (run_cases.py)' -Status 'warn' `
                -Detail ($r.StdOut + $r.StdErr).Trim() `
                -Fix 'The checker was found but did not report a pass. Check that the laboratory package folder is complete.' -Group 'Proof'
            Write-Line 'warn' 'Course checker' 'found, but did not report a pass'
        }
    } catch {
        Add-Check -Name 'Course checker (run_cases.py)' -Status 'warn' -Detail $_.Exception.Message -Group 'Proof'
        Write-Line 'warn' 'Course checker' $_.Exception.Message
    } finally {
        Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
    }
} elseif ($pythonCmd) {
    Add-Check -Name 'Course checker (run_cases.py)' -Status 'info' `
        -Detail 'laboratory package not found on this computer' `
        -Fix 'This is fine for now. Once your instructor gives you the ITCC47-Laboratory-Package folder, put it in Documents and run this check again to confirm the checker works.' `
        -Group 'Proof'
    Write-Line 'info' 'Course checker' 'laboratory package not found (fine for now)'
}

# ---------------------------------------------------------------------------
# report
# ---------------------------------------------------------------------------

function ConvertTo-Html {
    param([string]$Text)
    if ($null -eq $Text) { return '' }
    $out = $Text -replace '&', '&amp;'
    $out = $out -replace '<', '&lt;'
    $out = $out -replace '>', '&gt;'
    $out = $out -replace '"', '&quot;'
    return $out
}

# @() matters: a pipeline yielding nothing or exactly one object does not
# reliably expose .Count in Windows PowerShell 5.1, which would leave these
# null and make an all-clear run report itself as not ready.
$failCount = @($script:Checks | Where-Object { $_.Status -eq 'fail' }).Count
$warnCount = @($script:Checks | Where-Object { $_.Status -eq 'warn' }).Count
$ready = ($failCount -eq 0)

$bannerClass = 'fail'
$bannerTitle = 'Not ready yet'
$bannerBody  = "There $(if ($failCount -eq 1) { 'is 1 thing' } else { "are $failCount things" }) to fix below. Work through them in order, then run this check again."
if ($ready -and $warnCount -gt 0) {
    $bannerClass = 'warn'
    $bannerTitle = 'Ready, with some suggestions'
    $bannerBody  = 'Everything required is working. The items marked Check are optional improvements, not problems.'
} elseif ($ready) {
    $bannerClass = 'ok'
    $bannerTitle = 'Ready'
    $bannerBody  = 'Everything required is installed and a real program ran correctly. You are set up for the laboratory work.'
}

$rows = ''
foreach ($group in @('Required', 'Proof', 'Recommended', 'System')) {
    $inGroup = $script:Checks | Where-Object { $_.Group -eq $group }
    if (-not $inGroup) { continue }
    $rows += "<h2>$group</h2>`n"
    foreach ($c in $inGroup) {
        $label = 'Info'
        if ($c.Status -eq 'ok')   { $label = 'OK' }
        if ($c.Status -eq 'warn') { $label = 'Check' }
        if ($c.Status -eq 'fail') { $label = 'Fix' }

        $rows += "<div class=""check check-$($c.Status)"">`n"
        $rows += "  <div class=""check-head""><span class=""pill pill-$($c.Status)"">$label</span><strong>$(ConvertTo-Html $c.Name)</strong><span class=""detail"">$(ConvertTo-Html $c.Detail)</span></div>`n"
        if ($c.Fix) {
            $fixHtml = (ConvertTo-Html $c.Fix) -replace "`r`n", '<br>' -replace "`n", '<br>'
            $rows += "  <p class=""fix"">$fixHtml</p>`n"
        }
        if ($c.Link) {
            $rows += "  <a class=""btn"" href=""$(ConvertTo-Html $c.Link)"" target=""_blank"" rel=""noopener"">$(ConvertTo-Html $c.LinkLabel)</a>`n"
        }
        $rows += "</div>`n"
    }
}

$css = @'
:root{--bg:#17171a;--panel:#202024;--panel-2:#26262b;--border:#34343a;--text:#ececee;
--muted:#9a9aa2;--accent:#3b82f6;--ok:#22c55e;--warn:#f59e0b;--danger:#ef4444;--radius:10px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.55}
.wrap{max-width:820px;margin:0 auto;padding:32px 24px 64px}
header{border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:24px}
h1{font-size:1.3rem;margin:0 0 4px}
.code{color:var(--accent);font-weight:700}
.sub{color:var(--muted);font-size:.85rem}
h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);
margin:28px 0 10px;font-weight:600}
.banner{border-radius:var(--radius);padding:18px 20px;margin-bottom:8px;border:1px solid var(--border);background:var(--panel)}
.banner strong{display:block;font-size:1.05rem;margin-bottom:4px}
.banner span{color:var(--muted);font-size:.9rem}
.banner-ok{border-left:4px solid var(--ok)}
.banner-warn{border-left:4px solid var(--warn)}
.banner-fail{border-left:4px solid var(--danger)}
.check{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);
padding:14px 16px;margin-bottom:8px}
.check-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.detail{color:var(--muted);font-size:.85rem}
.pill{font-size:.68rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
padding:3px 8px;border-radius:999px;background:var(--panel-2);color:var(--muted)}
.pill-ok{background:rgba(34,197,94,.15);color:var(--ok)}
.pill-warn{background:rgba(245,158,11,.15);color:var(--warn)}
.pill-fail{background:rgba(239,68,68,.15);color:var(--danger)}
.fix{margin:10px 0 0;color:var(--text);font-size:.9rem;background:var(--panel-2);
border-radius:8px;padding:10px 12px}
.btn{display:inline-block;margin-top:10px;background:var(--accent);color:#fff;
text-decoration:none;font-size:.85rem;font-weight:600;padding:7px 14px;border-radius:7px}
.next{margin-top:32px;background:var(--panel);border:1px solid var(--border);
border-radius:var(--radius);padding:18px 20px}
.next h3{margin:0 0 10px;font-size:.95rem}
.next ol{margin:0;padding-left:20px;color:var(--muted);font-size:.9rem}
.next li{margin-bottom:6px}
code{background:var(--panel-2);padding:2px 6px;border-radius:5px;font-size:.85em}
footer{margin-top:28px;color:var(--muted);font-size:.78rem;text-align:center}
'@

$generated = Get-Date -Format 'dddd, d MMMM yyyy, HH:mm'

$nextSteps = ''
if ($ready) {
    $nextSteps = @'
<div class="next">
  <h3>What to do next</h3>
  <ol>
    <li>Open the Algorithm Visualizer and work through a problem set. It needs no setup at all.</li>
    <li>Make a folder for this course somewhere you will find it again, such as <code>Documents\ITCC47</code>.</li>
    <li>When your instructor gives you the laboratory package, put it in that folder and run this check once more.</li>
  </ol>
</div>
'@
} else {
    $nextSteps = @'
<div class="next">
  <h3>What to do next</h3>
  <ol>
    <li>Fix the items marked <strong>Fix</strong> above, from the top down.</li>
    <li>Close this terminal window and open a new one. A newly installed program is invisible to windows that were already open.</li>
    <li>Run the check again: <code>powershell -ExecutionPolicy Bypass -File doctor.ps1</code></li>
  </ol>
</div>
'@
}

$html = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ITCC47 - Environment Check</title>
<style>$css</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1><span class="code">ITCC47</span> Environment Check</h1>
    <div class="sub">Data Structures and Algorithms &middot; generated $generated</div>
  </header>

  <div class="banner banner-$bannerClass">
    <strong>$bannerTitle</strong>
    <span>$bannerBody</span>
  </div>

$rows
$nextSteps

  <footer>Run <code>doctor.ps1</code> again at any time. It changes nothing unless you pass <code>-Install</code>.</footer>
</div>
</body>
</html>
"@

$reportPath = Join-Path $PSScriptRoot 'report.html'
[System.IO.File]::WriteAllText($reportPath, $html, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
if ($ready) {
    Write-Host '  Ready.' -ForegroundColor Green
} else {
    Write-Host "  $failCount thing(s) still need fixing." -ForegroundColor Red
}
Write-Host "  Report: $reportPath" -ForegroundColor DarkGray
Write-Host ''

if (-not $NoBrowser) { Start-Process $reportPath | Out-Null }

if ($ready) { exit 0 } else { exit 1 }
