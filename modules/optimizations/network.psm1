#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Get-ActiveNetworkAdapter {
    try {
        $adapter = Get-NetAdapter | Where-Object {
            $_.Status -eq "Up" -and
            ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*")
        } | Select-Object -First 1

        if ($adapter) {
            Write-Log "Detected network adapter: $($adapter.Name)" "INFO"
        } else {
            Write-Log "No active network adapter found" "ERROR"
        }

        return $adapter
    } catch {
        Write-Log "Error detecting network adapter: $_" "ERROR"
        return $null
    }
}


function Test-NetworkOptimizations {
    $allPassed = $true

    Write-Log "Verifying network optimizations..." "INFO"

    $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
    $rssEnabled = Get-RegistryValue -Path $tcpPath -Name "EnableRSS"
    if ($rssEnabled -eq 1) {
        Write-Log "✓ RSS (Receive Side Scaling) enabled" "SUCCESS"
    } else {
        Write-Log "✗ RSS not enabled" "ERROR"
        $allPassed = $false
    }

    return $allPassed
}




function Set-NetworkAdapterOptimizations {
    param(
        [bool]$DisableRSC = $false
    )

    try {
        $adapter = Get-ActiveNetworkAdapter
        if (-not $adapter) { return }

        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        Backup-RegistryKey -Path $tcpPath

        Set-RegistryValue -Path $tcpPath -Name "EnableRSS" -Value 1 -Type "DWORD"
        Write-Log "Enabled RSS (Receive Side Scaling) for multi-core performance" "SUCCESS"

        if ($DisableRSC) {
            Set-RegistryValue -Path $tcpPath -Name "EnableRSC" -Value 0 -Type "DWORD"
            Write-Log "Disabled RSC (opt-in, validate with network monitoring)" "SUCCESS"
        } else {
            Write-Log "RSC kept enabled (default, disable only if measured jitter)" "INFO"
        }

        try {
            $adapterGuid = $adapter.InterfaceGuid
            $powerMgmt = Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | Where-Object { $_.InstanceName -like "*$adapterGuid*" }
            if ($powerMgmt) {
                $powerMgmt.Enable = $false
                $powerMgmt.Put() | Out-Null
                Write-Log "Disabled power saving for network adapter" "SUCCESS"
            }
        } catch {
            Write-Log "Could not disable network adapter power saving (may require manual config)" "ERROR"
        }

    } catch {
        Write-Log "Error optimizing network adapter: $_" "ERROR"
        throw
    }
}


function Set-DNSProvider {
    param(
        [ValidateSet("cloudflare", "google", "quad9", "adguard", "opendns", "isp")]
        [string]$Provider = "cloudflare"
    )

    try {
        $adapter = Get-ActiveNetworkAdapter
        if (-not $adapter) { return }

        $primaryDNS = ""
        $secondaryDNS = ""

        switch ($Provider) {
            "cloudflare" {
                $primaryDNS = "1.1.1.1"
                $secondaryDNS = "1.0.0.1"
                Write-Log "Setting Cloudflare DNS (high privacy)" "INFO"
            }
            "google" {
                $primaryDNS = "8.8.8.8"
                $secondaryDNS = "8.8.4.4"
                Write-Log "Setting Google DNS (reliable)" "INFO"
            }
            "quad9" {
                $primaryDNS = "9.9.9.9"
                $secondaryDNS = "149.112.112.112"
                Write-Log "Setting Quad9 DNS (high privacy, blocks malware)" "INFO"
            }
            "adguard" {
                $primaryDNS = "94.140.14.14"
                $secondaryDNS = "94.140.15.15"
                Write-Log "Setting AdGuard DNS (privacy + blocking)" "INFO"
            }
            "opendns" {
                $primaryDNS = "208.67.222.222"
                $secondaryDNS = "208.67.220.220"
                Write-Log "Setting OpenDNS (reliable, filtering options)" "INFO"
            }
            "isp" {
                Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses
                Write-Log "Restored ISP default DNS (DHCP)" "SUCCESS"
                return
            }
        }

        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ($primaryDNS, $secondaryDNS) -ErrorAction Stop
        Write-Log "IPv4 DNS set to ${Provider}: ${primaryDNS}, ${secondaryDNS}" "SUCCESS"

        ipconfig /flushdns 2>&1 | Out-Null
        Write-Log "DNS cache flushed" "SUCCESS"

        try {
            $testResult = Resolve-DnsName -Name "google.com" -Server $primaryDNS -ErrorAction Stop -QuickTimeout
            if ($testResult) {
                Write-Log "DNS resolution test successful" "SUCCESS"
            }
        } catch {
            Write-Log "DNS resolution test failed (network may need time to update)" "ERROR"
        }

        Write-Log "NOTE: DNS provider does NOT affect ping to game servers" "INFO"
        Write-Log "It only improves name resolution speed (e.g., when typing URLs)" "INFO"

    } catch {
        Write-Log "Error configuring DNS: $_" "ERROR"
        throw
    }
}


function Set-IPv4Preference {
    param(
        [bool]$Enable = $false
    )

    if (-not $Enable) {
        Write-Log "IPv4 preference skipped" "INFO"
        return
    }

    try {
        $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        Backup-RegistryKey -Path $path
        Set-RegistryValue -Path $path -Name "DisabledComponents" -Value 32 -Type "DWORD"
        Write-Log "Set IPv4 preference over IPv6 (reboot required)" "SUCCESS"
    } catch {
        Write-Log "Error setting IPv4 preference: $_" "ERROR"
    }
}


function Disable-Teredo {
    param(
        [bool]$Enable = $false
    )

    if (-not $Enable) {
        Write-Log "Teredo disable skipped" "INFO"
        return
    }

    try {
        netsh interface teredo set state disabled 2>&1 | Out-Null
        Write-Log "Teredo disabled (reboot recommended)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Teredo: $_" "ERROR"
    }
}


function Set-QoSConfiguration {
    param(
        [string[]]$GameExecutables = @("cs2.exe", "dota2.exe", "helldivers2.exe", "SpaceMarine2.exe")
    )

    try {
        Write-Log "Configuring QoS policies..." "INFO"

        foreach ($exe in $GameExecutables) {
            $qosPolicy = Get-NetQosPolicy -Name "Game-$exe" -ErrorAction SilentlyContinue
            if (-not $qosPolicy) {
                New-NetQosPolicy -Name "Game-$exe" -AppPathNameMatchCondition $exe -DSCPAction 46 -NetworkProfile All -ErrorAction Stop | Out-Null
                Write-Log "Created QoS policy for $exe (DSCP 46)" "SUCCESS"
            } else {
                Write-Log "QoS policy for $exe already exists" "INFO"
            }
        }

        Write-Log "QoS configuration complete" "SUCCESS"
        Write-Log "NOTE: Requires router QoS/SQM support to be effective" "INFO"

    } catch {
        Write-Log "Error configuring QoS (requires Windows Pro/Enterprise): $_" "ERROR"
    }
}




function Set-IPv4Preference {
    try {
        Write-Log "Setting IPv4 preference..." "INFO"

        $ipv6Path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        Backup-RegistryKey -Path $ipv6Path

        # Value 32 = Prefer IPv4 over IPv6 (see Microsoft KB 929852)
        Set-RegistryValue -Path $ipv6Path -Name "DisabledComponents" -Value 32 -Type "DWORD"

        Write-Log "IPv4 preferred over IPv6" "SUCCESS"
        Write-Log "Warning: May break IPv6-only paths or Xbox/Store features" "INFO"
        Write-Log "Requires reboot to take effect" "INFO"

    } catch {
        Write-Log "Error setting IPv4 preference: $_" "ERROR"
        throw
    }
}


function Disable-Teredo {
    try {
        Write-Log "Disabling Teredo IPv6 tunneling..." "INFO"

        $result = netsh interface teredo set state disabled 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Teredo disabled via netsh" "SUCCESS"
        }

        $ipv6Path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        Backup-RegistryKey -Path $ipv6Path

        $currentValue = Get-RegistryValue -Path $ipv6Path -Name "DisabledComponents"
        if ($null -eq $currentValue) { $currentValue = 0 }

        $newValue = $currentValue -bor 1
        Set-RegistryValue -Path $ipv6Path -Name "DisabledComponents" -Value $newValue -Type "DWORD"

        Write-Log "Teredo IPv6 tunneling disabled" "SUCCESS"
        Write-Log "Warning: May break Xbox Live connectivity" "INFO"
        Write-Log "Requires reboot to take effect" "INFO"

    } catch {
        Write-Log "Error disabling Teredo: $_" "ERROR"
        throw
    }
}




function Invoke-NetworkOptimizations {
    param(
        [ValidateSet("cloudflare", "google", "quad9", "adguard", "opendns", "isp")]
        [string]$DNSProvider = "cloudflare",

        [bool]$DisableRSC = $false,

        [bool]$PreferIPv4 = $false,

        [bool]$DisableTeredo = $false,

        [bool]$EnableQoS = $false,

        [string[]]$GameExecutables = @("cs2.exe", "dota2.exe", "helldivers2.exe", "SpaceMarine2.exe")
    )

    Write-Log "Applying network optimizations..." "INFO"

    try {
        Set-NetworkAdapterOptimizations -DisableRSC $DisableRSC

        Set-DNSProvider -Provider $DNSProvider

        Set-IPv4Preference -Enable $PreferIPv4

        Disable-Teredo -Enable $DisableTeredo

        if ($EnableQoS) {
            Set-QoSConfiguration -GameExecutables $GameExecutables
        }

        if ($PreferIPv4) {
            Set-IPv4Preference
        }

        if ($DisableTeredo) {
            Disable-Teredo
        }

        Write-Log "Network optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying network optimizations: $_" "ERROR"
        throw
    }
}


function Undo-NetworkOptimizations {
    Write-Log "Rolling back network optimizations..." "INFO"

    try {
        $adapter = Get-ActiveNetworkAdapter
        if ($adapter) {
            Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses
            Write-Log "Restored ISP default DNS" "SUCCESS"
        }

        try {
            Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" -Name "DisabledComponents" -Value 0 -ErrorAction SilentlyContinue
            Write-Log "Restored IPv6 component defaults" "SUCCESS"
        } catch {}

        try { netsh interface teredo set state default 2>&1 | Out-Null } catch {}

        $qosPolicies = Get-NetQosPolicy | Where-Object { $_.Name -like "Game-*" }
        foreach ($policy in $qosPolicies) {
            Remove-NetQosPolicy -Name $policy.Name -Confirm:$false -ErrorAction SilentlyContinue
            Write-Log "Removed QoS policy: $($policy.Name)" "SUCCESS"
        }

        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        if (Restore-RegistryKey -Path $tcpPath) {
            Write-Log "Restored TCP/IP registry settings" "SUCCESS"
        }

        Write-Log "Network optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Get-ActiveNetworkAdapter',
    'Set-NetworkAdapterOptimizations',
    'Set-DNSProvider',
    'Set-IPv4Preference',
    'Disable-Teredo',
    'Set-QoSConfiguration',
    'Set-IPv4Preference',
    'Disable-Teredo',
    'Test-NetworkOptimizations',
    'Invoke-NetworkOptimizations',
    'Undo-NetworkOptimizations'
)

