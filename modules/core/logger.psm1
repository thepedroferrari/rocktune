



$script:LogPath = ".\gaming-pc-setup.log"
$script:StartTime = Get-Date


function Initialize-Logger {
    

    [CmdletBinding()]
    param(
        [string]$LogPath = ".\gaming-pc-setup.log",
        [bool]$ClearExisting = $false
    )

    $script:LogPath = $LogPath
    $script:StartTime = Get-Date

    $logDir = Split-Path $LogPath -Parent
    if ($logDir -and -not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    if ($ClearExisting -and (Test-Path $LogPath)) {
        Remove-Item $LogPath -Force
    }

    Write-Log "=== Gaming PC Setup - Log Started ===" "INFO"
    Write-Log "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO"
    Write-Log "PowerShell Version: $($PSVersionTable.PSVersion)" "INFO"
    Write-Log "Operating System: $([System.Environment]::OSVersion.VersionString)" "INFO"
    Write-Log "Log Path: $LogPath" "INFO"
}

function Write-Log {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [ValidateSet('INFO', 'SUCCESS', 'ERROR', 'WARNING')]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $script:LogPath -Value $logMessage -ErrorAction Stop
    } catch {
        Write-Verbose "Unable to write to log file: $_"
    }

    $color = switch ($Level) {
        'SUCCESS' { 'Green' }
        'ERROR' { 'Red' }
        'WARNING' { 'Yellow' }
        default { 'White' }
    }

    Write-Host $logMessage -ForegroundColor $color
}

function Write-LogSection {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$SectionName
    )

    Write-Log "============================================================" "INFO"
    Write-Log "=== $SectionName ===" "INFO"
    Write-Log "============================================================" "INFO"
}

function Get-LogSummary {
    

    [CmdletBinding()]
    param()

    $duration = (Get-Date) - $script:StartTime

    if (-not (Test-Path $script:LogPath)) {
        return @{
            Duration = $duration
            ErrorCount = 0
            SuccessCount = 0
            WarningCount = 0
            TotalLines = 0
        }
    }

    $logContent = Get-Content $script:LogPath

    return @{
        Duration = $duration
        ErrorCount = ($logContent | Select-String '\[ERROR\]').Count
        SuccessCount = ($logContent | Select-String '\[SUCCESS\]').Count
        WarningCount = ($logContent | Select-String '\[WARNING\]').Count
        TotalLines = $logContent.Count
        LogPath = $script:LogPath
    }
}


Export-ModuleMember -Function @(
    'Initialize-Logger',
    'Write-Log',
    'Write-LogSection',
    'Get-LogSummary'
)
