<#
.SYNOPSIS
    Registry helper utilities with logging and optional backup/restore.
.DESCRIPTION
    Wraps common registry operations (set/get/remove) and uses reg.exe for
    full key backups and restores, with logging via the core logger module.
.NOTES
    Requires admin for HKLM writes. Uses reg.exe for export/import to capture
    full key state before modifications.
#>

Import-Module (Join-Path $PSScriptRoot "logger.psm1") -Force

$script:RegistryBackupIndexPath = Join-Path $PSScriptRoot "..\..\config\registry-backups.json"
$script:RegistryBackupIndex = $null


# --- Undo journal and dry-run state ---
# Every registry value, service start type and scheduled task this module
# changes is recorded once (first write wins, so the value from before RockTune
# is kept across runs). Undo-RockTuneChanges replays the journal in reverse.

$script:UndoJournalPath = Join-Path $env:ProgramData "RockTune\undo-journal.json"
$script:UndoJournal = $null
$script:DryRunMode = $false
$script:ChangeStats = @{ Applied = 0; Skipped = 0; Failed = 0; DryRun = 0 }

function Set-RockTuneDryRun {
    <#
    .SYNOPSIS
        Turns dry-run mode on or off for every helper in this module.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][bool]$Enabled)
    $script:DryRunMode = $Enabled
}

function Test-RockTuneDryRun {
    return [bool]$script:DryRunMode
}

function Set-UndoJournalPath {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Path)
    $script:UndoJournalPath = $Path
    $script:UndoJournal = $null
}

function Get-UndoJournalPath {
    return $script:UndoJournalPath
}

function Get-RockTuneChangeStats {
    return $script:ChangeStats
}

function Add-ChangeStat {
    param([ValidateSet('Applied', 'Skipped', 'Failed', 'DryRun')][string]$Kind)
    $script:ChangeStats[$Kind] = $script:ChangeStats[$Kind] + 1
}

function Get-UndoJournal {
    if ($null -ne $script:UndoJournal) {
        return ,$script:UndoJournal
    }
    $list = New-Object System.Collections.ArrayList
    if (Test-Path $script:UndoJournalPath) {
        try {
            $raw = Get-Content $script:UndoJournalPath -Raw -ErrorAction Stop
            if ($raw) {
                foreach ($entry in @($raw | ConvertFrom-Json)) {
                    [void]$list.Add($entry)
                }
            }
        } catch {
            Write-Log "Undo journal unreadable, starting a new one: $_" "WARNING"
        }
    }
    $script:UndoJournal = $list
    return ,$script:UndoJournal
}

function Save-UndoJournal {
    if ($null -eq $script:UndoJournal) { return }
    try {
        $dir = Split-Path $script:UndoJournalPath -Parent
        if ($dir -and -not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $json = ConvertTo-Json -InputObject @($script:UndoJournal.ToArray()) -Depth 6
        Set-Content -Path $script:UndoJournalPath -Value $json -Encoding UTF8 -Force
    } catch {
        Write-Log "Failed to save undo journal: $_" "WARNING"
    }
}

function Test-JournalHasEntry {
    param([string]$Kind, [string]$Target, [string]$Name)
    foreach ($entry in (Get-UndoJournal)) {
        if ($entry.Kind -eq $Kind -and $entry.Target -eq $Target -and $entry.Name -eq $Name) {
            return $true
        }
    }
    return $false
}

function Add-UndoJournalEntry {
    <#
    .SYNOPSIS
        Records the current state of a registry value, service or task before it changes.
    .PARAMETER Kind
        Registry, Service or Task.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][ValidateSet('Registry', 'Service', 'Task')][string]$Kind,
        [Parameter(Mandatory=$true)][string]$Target,
        [string]$Name = ""
    )

    if ($script:DryRunMode) { return }
    if (Test-JournalHasEntry -Kind $Kind -Target $Target -Name $Name) { return }

    $entry = [ordered]@{
        Kind = $Kind
        Target = $Target
        Name = $Name
        Existed = $false
        ValueKind = $null
        Value = $null
        RecordedAt = (Get-Date).ToString('o')
    }

    try {
        switch ($Kind) {
            'Registry' {
                if (Test-Path $Target) {
                    $key = Get-Item -Path $Target -ErrorAction Stop
                    if ($key.GetValueNames() -contains $Name) {
                        $entry.Existed = $true
                        $entry.ValueKind = $key.GetValueKind($Name).ToString()
                        $entry.Value = $key.GetValue($Name, $null, 'DoNotExpandEnvironmentNames')
                    }
                }
            }
            'Service' {
                $svc = Get-Service -Name $Target -ErrorAction SilentlyContinue
                if ($svc) {
                    $entry.Existed = $true
                    $entry.Value = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\$Target" -Name Start -ErrorAction SilentlyContinue).Start
                }
            }
            'Task' {
                $task = Get-ScheduledTask -TaskPath $Target -TaskName $Name -ErrorAction SilentlyContinue
                if ($task) {
                    $entry.Existed = $true
                    $entry.Value = $task.State.ToString()
                }
            }
        }
    } catch {
        Write-Log "Could not record undo state for $Target\$Name : $_" "WARNING"
    }

    [void](Get-UndoJournal).Add([pscustomobject]$entry)
    Save-UndoJournal
}

function Set-ServiceStartTracked {
    <#
    .SYNOPSIS
        Changes a service start type, recording the previous one for undo. Honors dry-run.
    .PARAMETER StartupType
        Automatic, Manual or Disabled.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][ValidateSet('Automatic', 'Manual', 'Disabled')][string]$StartupType,
        [switch]$Stop
    )

    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Log "Service not present, skipped: $Name" "INFO"
        Add-ChangeStat Skipped
        return $false
    }
    if ($script:DryRunMode) {
        Write-Log "[DRY RUN] Would set service $Name to $StartupType" "INFO"
        Add-ChangeStat DryRun
        return $true
    }
    try {
        Add-UndoJournalEntry -Kind Service -Target $Name
        if ($Stop) {
            Stop-Service -Name $Name -Force -ErrorAction SilentlyContinue
        }
        Set-Service -Name $Name -StartupType $StartupType -ErrorAction Stop
        Write-Log "Service $Name set to $StartupType" "SUCCESS"
        Add-ChangeStat Applied
        return $true
    } catch {
        Write-Log "Failed to set service $Name : $_" "ERROR"
        Add-ChangeStat Failed
        return $false
    }
}

function Set-ScheduledTaskTracked {
    <#
    .SYNOPSIS
        Enables or disables a scheduled task by full path, recording the old state. Honors dry-run.
    .PARAMETER FullPath
        Task path including the name, e.g. "\Microsoft\Windows\Autochk\Proxy".
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$FullPath,
        [ValidateSet('Disabled', 'Enabled')][string]$State = 'Disabled'
    )

    $normalized = '\' + $FullPath.Trim('\')
    $idx = $normalized.LastIndexOf('\')
    $taskPath = $normalized.Substring(0, $idx + 1)
    $taskName = $normalized.Substring($idx + 1)

    $task = Get-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Log "Scheduled task not present, skipped: $normalized" "INFO"
        Add-ChangeStat Skipped
        return $false
    }
    if ($script:DryRunMode) {
        Write-Log "[DRY RUN] Would set task $normalized to $State" "INFO"
        Add-ChangeStat DryRun
        return $true
    }
    try {
        Add-UndoJournalEntry -Kind Task -Target $taskPath -Name $taskName
        if ($State -eq 'Disabled') {
            Disable-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction Stop | Out-Null
        } else {
            Enable-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction Stop | Out-Null
        }
        Write-Log "Scheduled task $normalized set to $State" "SUCCESS"
        Add-ChangeStat Applied
        return $true
    } catch {
        Write-Log "Failed to set task $normalized : $_" "ERROR"
        Add-ChangeStat Failed
        return $false
    }
}

function Undo-RockTuneChanges {
    <#
    .SYNOPSIS
        Restores every registry value, service start type and task recorded in the undo journal.
    .DESCRIPTION
        Replays the journal newest-first. Values that did not exist before are deleted.
        On success the journal is renamed so a second undo does nothing.
    .OUTPUTS
        [hashtable] Restored and Failed counts.
    #>
    [CmdletBinding()]
    param()

    $journal = Get-UndoJournal
    $result = @{ Restored = 0; Failed = 0 }
    if ($journal.Count -eq 0) {
        Write-Log "Undo journal is empty: nothing to restore ($script:UndoJournalPath)" "WARNING"
        return $result
    }

    $startTypes = @{ 2 = 'Automatic'; 3 = 'Manual'; 4 = 'Disabled' }
    for ($i = $journal.Count - 1; $i -ge 0; $i--) {
        $e = $journal[$i]
        try {
            if ($script:DryRunMode) {
                Write-Log "[DRY RUN] Would restore $($e.Kind) $($e.Target) $($e.Name)" "INFO"
                continue
            }
            switch ($e.Kind) {
                'Registry' {
                    if ($e.Existed) {
                        if (-not (Test-Path $e.Target)) { New-Item -Path $e.Target -Force | Out-Null }
                        $value = $e.Value
                        if ($e.ValueKind -eq 'Binary') { $value = [byte[]]@($e.Value) }
                        elseif ($e.ValueKind -eq 'MultiString') { $value = [string[]]@($e.Value) }
                        New-ItemProperty -Path $e.Target -Name $e.Name -Value $value -PropertyType $e.ValueKind -Force -ErrorAction Stop | Out-Null
                    } elseif (Test-Path $e.Target) {
                        Remove-ItemProperty -Path $e.Target -Name $e.Name -ErrorAction SilentlyContinue
                    }
                }
                'Service' {
                    if ($e.Existed -and $null -ne $e.Value) {
                        $start = [int]$e.Value
                        if ($startTypes.ContainsKey($start)) {
                            Set-Service -Name $e.Target -StartupType $startTypes[$start] -ErrorAction Stop
                        } else {
                            Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\$($e.Target)" -Name Start -Value $start -Type DWord -ErrorAction Stop
                        }
                    }
                }
                'Task' {
                    if ($e.Existed) {
                        if ($e.Value -eq 'Disabled') {
                            Disable-ScheduledTask -TaskPath $e.Target -TaskName $e.Name -ErrorAction Stop | Out-Null
                        } else {
                            Enable-ScheduledTask -TaskPath $e.Target -TaskName $e.Name -ErrorAction Stop | Out-Null
                        }
                    }
                }
            }
            $result.Restored++
            Write-Log "Restored $($e.Kind): $($e.Target) $($e.Name)" "SUCCESS"
        } catch {
            $result.Failed++
            Write-Log "Could not restore $($e.Kind) $($e.Target) $($e.Name): $_" "ERROR"
        }
    }

    if (-not $script:DryRunMode -and $result.Failed -eq 0) {
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        Rename-Item -Path $script:UndoJournalPath -NewName "undo-journal.restored-$stamp.json" -ErrorAction SilentlyContinue
        $script:UndoJournal = $null
    }
    return $result
}

function Get-RegistryBackupIndex {
    if ($null -ne $script:RegistryBackupIndex) {
        return $script:RegistryBackupIndex
    }

    if (-not (Test-Path $script:RegistryBackupIndexPath)) {
        $script:RegistryBackupIndex = @{}
        return $script:RegistryBackupIndex
    }

    try {
        $json = Get-Content $script:RegistryBackupIndexPath -Raw | ConvertFrom-Json
        $index = @{}
        if ($null -ne $json) {
            foreach ($property in $json.PSObject.Properties) {
                $index[$property.Name] = $property.Value
            }
        }
        $script:RegistryBackupIndex = $index
        return $script:RegistryBackupIndex
    } catch {
        Write-Log "Failed to load registry backup index: $_" "WARNING"
        $script:RegistryBackupIndex = @{}
        return $script:RegistryBackupIndex
    }
}

function Save-RegistryBackupIndex {
    if ($null -eq $script:RegistryBackupIndex) {
        return
    }

    try {
        $indexDir = Split-Path $script:RegistryBackupIndexPath -Parent
        if ($indexDir -and -not (Test-Path $indexDir)) {
            New-Item -ItemType Directory -Path $indexDir -Force | Out-Null
        }

        $json = $script:RegistryBackupIndex | ConvertTo-Json -Depth 6
        Set-Content -Path $script:RegistryBackupIndexPath -Value $json -Force
    } catch {
        Write-Log "Failed to save registry backup index: $_" "WARNING"
    }
}

function Register-RegistryBackup {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$BackupPath,

        [Parameter(Mandatory=$true)]
        [string]$BackupDir
    )

    $index = Get-RegistryBackupIndex
    $index[$Path] = @{
        LastBackup = $BackupPath
        BackupDir = $BackupDir
        UpdatedAt = (Get-Date).ToString('o')
    }

    $script:RegistryBackupIndex = $index
    Save-RegistryBackupIndex
}

function Resolve-RegistryBackupPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [string]$BackupDir = $null
    )

    $index = Get-RegistryBackupIndex
    if ($index.ContainsKey($Path)) {
        $entry = $index[$Path]
        if ($entry.LastBackup -and (Test-Path $entry.LastBackup)) {
            return $entry.LastBackup
        }
        if (-not $BackupDir -and $entry.BackupDir) {
            $BackupDir = $entry.BackupDir
        }
    }

    if (-not $BackupDir) {
        $BackupDir = "$env:TEMP\RegistryBackup"
    }

    if (-not (Test-Path $BackupDir)) {
        return $null
    }

    $safeName = $Path.Replace('\', '_').Replace(':', '')
    $backup = Get-ChildItem -Path $BackupDir -Filter "Backup-*$safeName.reg" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($backup) {
        return $backup.FullName
    }

    return $null
}


function Backup-RegistryKey {
    <#
    .SYNOPSIS
        Exports a registry key to a .reg file for backup.
    .DESCRIPTION
        Uses reg.exe to export the key to a timestamped file in a backup directory.
        Returns the backup file path or $false on failure.
    .PARAMETER Path
        Registry key path (HKLM:\ or HKCU:\).
    .PARAMETER BackupDir
        Directory to store .reg backups. Defaults to %TEMP%\RegistryBackup.
    .OUTPUTS
        [string] Backup file path on success, or [bool] $false on failure.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [string]$BackupDir = "$env:TEMP\RegistryBackup"
    )

    if (-not (Test-Path $Path)) {
        Write-Log "Registry path does not exist, skipping backup: $Path" "WARNING"
        return $false
    }

    try {
        if (-not (Test-Path $BackupDir)) {
            New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        }

        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $safeName = $Path.Replace('\', '_').Replace(':', '')
        $backupPath = Join-Path $BackupDir "Backup-$timestamp-$safeName.reg"

        $exportPath = $Path.Replace('HKLM:\', 'HKEY_LOCAL_MACHINE\').Replace('HKCU:\', 'HKEY_CURRENT_USER\')

        $result = reg export $exportPath $backupPath /y 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Backed up registry key: $Path -> $backupPath" "SUCCESS"
            Register-RegistryBackup -Path $Path -BackupPath $backupPath -BackupDir $BackupDir
            return $backupPath
        } else {
            Write-Log "Failed to backup registry key: $Path (Exit code: $LASTEXITCODE)" "ERROR"
            return $false
        }

    } catch {
        Write-Log "Exception backing up registry key $Path : $_" "ERROR"
        return $false
    }
}

function Restore-RegistryKey {
    <#
    .SYNOPSIS
        Restores a registry key from a .reg backup file.
    .DESCRIPTION
        Uses reg.exe to import a .reg file. Logs success or failure.
    .PARAMETER BackupPath
        Path to the .reg file produced by Backup-RegistryKey.
    .PARAMETER Path
        Registry key path (HKLM:\ or HKCU:\) to resolve the latest backup.
    .OUTPUTS
        [bool] True on success, false on failure.
    .NOTES
        reg.exe writes some output to stderr even on success, so output is suppressed.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [Alias('Path')]
        [string]$BackupPath
    )

    $resolvedBackupPath = $BackupPath
    if ($BackupPath -match '^(HKLM|HKCU):\\') {
        $resolvedBackupPath = Resolve-RegistryBackupPath -Path $BackupPath
        if (-not $resolvedBackupPath) {
            Write-Log "No registry backup found for key: $BackupPath" "ERROR"
            return $false
        }
    }

    if (-not (Test-Path $resolvedBackupPath)) {
        Write-Log "Backup file not found: $resolvedBackupPath" "ERROR"
        return $false
    }

    try {
        # Suppress errors from reg.exe output (it writes success to stderr)
        $null = reg import $resolvedBackupPath 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Restored registry from backup: $resolvedBackupPath" "SUCCESS"
            return $true
        } else {
            Write-Log "Failed to restore registry from backup: $resolvedBackupPath (Exit code: $LASTEXITCODE)" "ERROR"
            return $false
        }

    } catch {
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Restored registry from backup: $resolvedBackupPath" "SUCCESS"
            return $true
        } else {
            Write-Log "Exception restoring registry from backup $resolvedBackupPath : $_" "ERROR"
            return $false
        }
    }
}


function Set-RegistryValue {
    <#
    .SYNOPSIS
        Creates or updates a registry value with optional backup.
    .DESCRIPTION
        Optionally backs up the parent key, creates the key if missing, and then
        writes the value using Set-ItemProperty.
    .PARAMETER Path
        Registry key path.
    .PARAMETER Name
        Registry value name.
    .PARAMETER Value
        Registry value data.
    .PARAMETER Type
        Registry value type (DWORD, String, etc).
    .PARAMETER SkipBackup
        When true, skips reg export before modifying the key.
    .OUTPUTS
        [bool] True on success, false on failure.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [Parameter(Mandatory=$true)]
        [object]$Value,

        [string]$Type = "DWORD",

        [bool]$SkipBackup = $false
    )

    if ($script:DryRunMode) {
        Write-Log "[DRY RUN] Would set $Path\$Name = $Value ($Type)" "INFO"
        Add-ChangeStat DryRun
        return $true
    }

    try {
        Add-UndoJournalEntry -Kind Registry -Target $Path -Name $Name

        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
            Write-Log "Created registry path: $Path"
        }

        New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force -ErrorAction Stop | Out-Null
        Write-Log "Set registry value: $Path\$Name = $Value ($Type)" "SUCCESS"
        Add-ChangeStat Applied
        return $true

    } catch {
        Write-Log "Failed to set registry value $Path\$Name : $_" "ERROR"
        Add-ChangeStat Failed
        return $false
    }
}

function Get-RegistryValue {
    <#
    .SYNOPSIS
        Reads a registry value with a default fallback.
    .DESCRIPTION
        Returns the registry value if it exists, otherwise returns DefaultValue.
    .PARAMETER Path
        Registry key path.
    .PARAMETER Name
        Registry value name.
    .PARAMETER DefaultValue
        Value returned when the registry value does not exist.
    .OUTPUTS
        [object] The stored registry data or DefaultValue.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [object]$DefaultValue = $null
    )

    try {
        if (Test-Path $Path) {
            $value = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
            if ($null -ne $value) {
                return $value.$Name
            }
        }
    } catch {
        Write-Verbose "Registry value not found: $Path\$Name"
    }

    return $DefaultValue
}

function Remove-RegistryValue {
    <#
    .SYNOPSIS
        Deletes a registry value with optional backup.
    .DESCRIPTION
        Optionally backs up the parent key, then removes the value.
    .PARAMETER Path
        Registry key path.
    .PARAMETER Name
        Registry value name.
    .PARAMETER SkipBackup
        When true, skips reg export before deleting the value.
    .OUTPUTS
        [bool] True on success, false on failure.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [bool]$SkipBackup = $false
    )

    if ($script:DryRunMode) {
        Write-Log "[DRY RUN] Would remove $Path\$Name" "INFO"
        Add-ChangeStat DryRun
        return $true
    }

    try {
        Add-UndoJournalEntry -Kind Registry -Target $Path -Name $Name

        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        Remove-ItemProperty -Path $Path -Name $Name -ErrorAction Stop
        Write-Log "Removed registry value: $Path\$Name" "SUCCESS"
        return $true

    } catch {
        Write-Log "Failed to remove registry value $Path\$Name : $_" "ERROR"
        return $false
    }
}

function Test-RegistryKeyExists {
    <#
    .SYNOPSIS
        Tests whether a registry key exists.
    .PARAMETER Path
        Registry key path to test.
    .OUTPUTS
        [bool] True if key exists, else false.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    return Test-Path $Path
}

function Test-RegistryValueExists {
    <#
    .SYNOPSIS
        Tests whether a registry value exists.
    .PARAMETER Path
        Registry key path.
    .PARAMETER Name
        Registry value name.
    .OUTPUTS
        [bool] True if the value exists, else false.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name
    )

    try {
        if (Test-Path $Path) {
            $value = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
            return ($null -ne $value)
        }
    } catch {
        return $false
    }

    return $false
}


function Set-ProtectedRegistryValue {
    <#
    .SYNOPSIS
        Sets a registry value on ACL-protected keys by temporarily taking ownership.
    .DESCRIPTION
        Some registry keys (like audio device keys under MMDevices) are owned by
        TrustedInstaller and have restrictive ACLs. This function temporarily takes
        ownership, grants admin permissions, sets the value, then optionally restores
        the original ACL.
    .PARAMETER Path
        Registry key path (HKLM:\ or HKCU:\).
    .PARAMETER Name
        Registry value name.
    .PARAMETER Value
        Registry value data.
    .PARAMETER Type
        Registry value type (DWORD, String, etc).
    .OUTPUTS
        [bool] True on success, false on failure.
    .NOTES
        Requires Administrator. Enables SeTakeOwnershipPrivilege and SeRestorePrivilege.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [Parameter(Mandatory=$true)]
        [object]$Value,

        [string]$Type = "DWORD"
    )

    $success = $false

    if ($script:DryRunMode) {
        Write-Log "[DRY RUN] Would set protected $Path\$Name = $Value ($Type)" "INFO"
        Add-ChangeStat DryRun
        return $true
    }

    Add-UndoJournalEntry -Kind Registry -Target $Path -Name $Name

    try {
        # First try normal registry write
        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force -ErrorAction Stop | Out-Null
        }
        New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force -ErrorAction Stop | Out-Null
        Write-Log "Set protected registry value: $Path\$Name = $Value ($Type)" "SUCCESS"
        $success = $true
    }
    catch [System.Security.SecurityException], [System.UnauthorizedAccessException] {
        # Need to take ownership and grant permissions
        try {
            # Convert PowerShell path to registry key path
            $regPath = $Path -replace '^HKLM:\\', 'HKEY_LOCAL_MACHINE\' -replace '^HKCU:\\', 'HKEY_CURRENT_USER\'
            $regPath = $regPath -replace '^Microsoft.PowerShell.Core\\Registry::', ''

            # Determine the hive and subpath
            if ($regPath -match '^HKEY_LOCAL_MACHINE\\(.+)$') {
                $hive = [Microsoft.Win32.Registry]::LocalMachine
                $subKey = $Matches[1]
            }
            elseif ($regPath -match '^HKEY_CURRENT_USER\\(.+)$') {
                $hive = [Microsoft.Win32.Registry]::CurrentUser
                $subKey = $Matches[1]
            }
            else {
                throw "Unsupported registry hive: $regPath"
            }

            # Enable SeRestorePrivilege and SeTakeOwnershipPrivilege
            $tokenPriv = @'
using System;
using System.Runtime.InteropServices;
public class TokenPrivilege {
    [DllImport("advapi32.dll", SetLastError=true)]
    public static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);
    [DllImport("advapi32.dll", SetLastError=true)]
    public static extern bool LookupPrivilegeValue(string lpSystemName, string lpName, out long lpLuid);
    [DllImport("advapi32.dll", SetLastError=true)]
    public static extern bool AdjustTokenPrivileges(IntPtr TokenHandle, bool DisableAllPrivileges, ref TOKEN_PRIVILEGES NewState, uint BufferLength, IntPtr PreviousState, IntPtr ReturnLength);
    [StructLayout(LayoutKind.Sequential)]
    public struct TOKEN_PRIVILEGES {
        public uint PrivilegeCount;
        public long Luid;
        public uint Attributes;
    }
    public const uint SE_PRIVILEGE_ENABLED = 0x00000002;
    public const uint TOKEN_ADJUST_PRIVILEGES = 0x0020;
    public const uint TOKEN_QUERY = 0x0008;

    public static void EnablePrivilege(string privilege) {
        IntPtr hToken;
        if (!OpenProcessToken(System.Diagnostics.Process.GetCurrentProcess().Handle, TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, out hToken))
            return;
        TOKEN_PRIVILEGES tp = new TOKEN_PRIVILEGES();
        tp.PrivilegeCount = 1;
        tp.Attributes = SE_PRIVILEGE_ENABLED;
        if (!LookupPrivilegeValue(null, privilege, out tp.Luid))
            return;
        AdjustTokenPrivileges(hToken, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero);
    }
}
'@
            if (-not ([System.Management.Automation.PSTypeName]'TokenPrivilege').Type) {
                Add-Type -TypeDefinition $tokenPriv -Language CSharp
            }
            [TokenPrivilege]::EnablePrivilege("SeTakeOwnershipPrivilege")
            [TokenPrivilege]::EnablePrivilege("SeRestorePrivilege")

            # Open the key with TakeOwnership permission
            $key = $hive.OpenSubKey($subKey, [Microsoft.Win32.RegistryKeyPermissionCheck]::ReadWriteSubTree,
                [System.Security.AccessControl.RegistryRights]::TakeOwnership)

            if ($null -eq $key) {
                throw "Cannot open registry key for ownership: $subKey"
            }

            # Take ownership as Administrators
            $adminSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-32-544")
            $acl = $key.GetAccessControl([System.Security.AccessControl.AccessControlSections]::Owner)
            $acl.SetOwner($adminSid)
            $key.SetAccessControl($acl)
            $key.Close()

            # Re-open with ChangePermissions
            $key = $hive.OpenSubKey($subKey, [Microsoft.Win32.RegistryKeyPermissionCheck]::ReadWriteSubTree,
                [System.Security.AccessControl.RegistryRights]::ChangePermissions)

            # Grant Administrators full control
            $acl = $key.GetAccessControl()
            $rule = New-Object System.Security.AccessControl.RegistryAccessRule(
                $adminSid,
                [System.Security.AccessControl.RegistryRights]::FullControl,
                [System.Security.AccessControl.InheritanceFlags]::None,
                [System.Security.AccessControl.PropagationFlags]::None,
                [System.Security.AccessControl.AccessControlType]::Allow)
            $acl.AddAccessRule($rule)
            $key.SetAccessControl($acl)
            $key.Close()

            # Now set the value
            New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force -ErrorAction Stop | Out-Null
            Write-Log "Set protected registry value (after ownership change): $Path\$Name = $Value ($Type)" "SUCCESS"
            $success = $true

        }
        catch {
            Write-Log "Cannot modify protected key: $Path\$Name - $_" "WARNING"
        }
    }
    catch {
        Write-Log "Failed to set protected registry value $Path\$Name : $_" "ERROR"
    }

    return $success
}


Export-ModuleMember -Function @(
    'Backup-RegistryKey',
    'Restore-RegistryKey',
    'Set-RegistryValue',
    'Set-ProtectedRegistryValue',
    'Get-RegistryValue',
    'Remove-RegistryValue',
    'Test-RegistryKeyExists',
    'Test-RegistryValueExists',
    'Set-RockTuneDryRun',
    'Test-RockTuneDryRun',
    'Set-UndoJournalPath',
    'Get-UndoJournalPath',
    'Get-RockTuneChangeStats',
    'Add-UndoJournalEntry',
    'Set-ServiceStartTracked',
    'Set-ScheduledTaskTracked',
    'Undo-RockTuneChanges'
)
