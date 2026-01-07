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

    try {
        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
            Write-Log "Created registry path: $Path"
        }

        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -ErrorAction Stop
        Write-Log "Set registry value: $Path\$Name = $Value ($Type)" "SUCCESS"
        return $true

    } catch {
        Write-Log "Failed to set registry value $Path\$Name : $_" "ERROR"
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

    try {
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


Export-ModuleMember -Function @(
    'Backup-RegistryKey',
    'Restore-RegistryKey',
    'Set-RegistryValue',
    'Get-RegistryValue',
    'Remove-RegistryValue',
    'Test-RegistryKeyExists',
    'Test-RegistryValueExists'
)
