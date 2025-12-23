



$script:ConfigDir = Join-Path $PSScriptRoot "..\..\config"
$script:DataDir = Join-Path $PSScriptRoot "..\..\data"
$script:DefaultsPath = Join-Path $script:ConfigDir "defaults.json"
$script:UserConfigPath = Join-Path $script:ConfigDir "user-config.json"
$script:ProfilesDir = Join-Path $script:ConfigDir "profiles"


function Get-DefaultConfig {
    

    [CmdletBinding()]
    param()

    if (Test-Path $script:DefaultsPath) {
        try {
            $json = Get-Content $script:DefaultsPath -Raw | ConvertFrom-Json
            return Convert-PSObjectToHashtable $json
        } catch {
            Write-Warning "Failed to load defaults.json: $_. Using hardcoded defaults."
        }
    }

    return @{
        version = "2.0"
        performance = @{
            hpet_disable = $true
            msi_mode = $true
            timer_resolution = $true
            core_parking_disable = $true
            c_states_disable = $false
            memory_compression_disable = $true
            gpu_scheduling = $false
            audio_optimization = $true
            game_bar_disable = $true
            fast_startup_disable = $true
        }
        power = @{
            high_performance_plan = $true
            pcie_link_state_disable = $true
            usb_selective_suspend_disable = $true
            processor_idle_disable = $true
        }
        privacy = @{
            telemetry_services_disable = $true
            location_tracking_disable = $true
            camera_access_disable = $true
            biometrics_disable = $true
            cloud_sync_disable = $false
            hosts_file_blocking = $true
        }
        software = @{
            steam = $true
            discord = $true
            vlc = $false
            brave = $false
            spotify = $false
            qbittorrent = $false
            python = $false
            zed = $false
            hue_sync = $false
            logitech_ghub = $false
        }
        network = @{
            tcp_optimization = $true
            dns_provider = "cloudflare"
            dns_custom_ipv4 = ""
            qos_enable = $true
        }
        games = @{
            steam_paths = @("C:\Program Files (x86)\Steam\steamapps\common")
            auto_detect = $true
            process_priority = $true
            autoexec_generation = $true
        }
    }
}

function Get-UserConfig {
    

    [CmdletBinding()]
    param()

    if (Test-Path $script:UserConfigPath) {
        try {
            $json = Get-Content $script:UserConfigPath -Raw | ConvertFrom-Json
            return Convert-PSObjectToHashtable $json
        } catch {
            Write-Warning "Failed to load user-config.json: $_. Using defaults."
        }
    }

    return Get-DefaultConfig
}

function Save-UserConfig {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Config
    )

    try {
        if (-not (Test-Path $script:ConfigDir)) {
            New-Item -ItemType Directory -Path $script:ConfigDir -Force | Out-Null
        }

        if (Test-Path $script:UserConfigPath) {
            $backupPath = "$script:UserConfigPath.backup"
            Copy-Item $script:UserConfigPath $backupPath -Force
        }

        $json = $Config | ConvertTo-Json -Depth 10
        Set-Content -Path $script:UserConfigPath -Value $json -Force

        Write-Verbose "Configuration saved to: $script:UserConfigPath"
        return $true

    } catch {
        Write-Error "Failed to save configuration: $_"
        return $false
    }
}

function Get-Profile {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('competitive', 'balanced', 'privacy-focused')]
        [string]$ProfileName
    )

    $profilePath = Join-Path $script:ProfilesDir "$ProfileName.json"

    if (Test-Path $profilePath) {
        try {
            $json = Get-Content $profilePath -Raw | ConvertFrom-Json
            return Convert-PSObjectToHashtable $json
        } catch {
            Write-Warning "Failed to load profile '$ProfileName': $_. Using defaults."
        }
    } else {
        Write-Warning "Profile not found: $profilePath. Using defaults."
    }

    return Get-DefaultConfig
}

function Get-AvailableProfiles {
    

    if (Test-Path $script:ProfilesDir) {
        $profiles = Get-ChildItem -Path $script:ProfilesDir -Filter "*.json" |
                    Select-Object -ExpandProperty BaseName
        return $profiles
    }

    return @('competitive', 'balanced', 'privacy-focused')
}

function Merge-Config {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Base,

        [Parameter(Mandatory=$true)]
        [hashtable]$Override
    )

    $merged = $Base.Clone()

    foreach ($key in $Override.Keys) {
        if ($merged.ContainsKey($key)) {
            if ($merged[$key] -is [hashtable] -and $Override[$key] -is [hashtable]) {
                $merged[$key] = Merge-Config -Base $merged[$key] -Override $Override[$key]
            } else {
                $merged[$key] = $Override[$key]
            }
        } else {
            $merged[$key] = $Override[$key]
        }
    }

    return $merged
}

function Test-ConfigValid {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Config
    )

    $requiredKeys = @('performance', 'power', 'privacy', 'software', 'network', 'games')

    foreach ($key in $requiredKeys) {
        if (-not $Config.ContainsKey($key)) {
            Write-Warning "Configuration missing required key: $key"
            return $false
        }
    }

    return $true
}


function Convert-PSObjectToHashtable {
    

    param($InputObject)

    if ($null -eq $InputObject) { return $null }

    if ($InputObject -is [System.Collections.IEnumerable] -and $InputObject -isnot [string]) {
        $collection = @(
            foreach ($object in $InputObject) {
                Convert-PSObjectToHashtable $object
            }
        )
        return $collection
    }
    elseif ($InputObject -is [PSCustomObject]) {
        $hash = @{}
        foreach ($property in $InputObject.PSObject.Properties) {
            $hash[$property.Name] = Convert-PSObjectToHashtable $property.Value
        }
        return $hash
    }
    else {
        return $InputObject
    }
}


Export-ModuleMember -Function @(
    'Get-DefaultConfig',
    'Get-UserConfig',
    'Save-UserConfig',
    'Get-Profile',
    'Get-AvailableProfiles',
    'Merge-Config',
    'Test-ConfigValid'
)
