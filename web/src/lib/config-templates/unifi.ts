import type { ConfigContext, ConfigFile } from '../config-generator'

/**
 * Generate UniFi network QoS configuration template
 * NOTE: This is a REFERENCE TEMPLATE only - cannot be auto-imported
 * User must manually configure these settings in UniFi Controller
 */
export function generateUniFiConfig(context: ConfigContext): ConfigFile[] {
  const { persona } = context

  const config = generateUniFiJSON(persona)

  const instructions = `UNIFI QoS CONFIGURATION GUIDE

⚠️  IMPORTANT: This is a REFERENCE TEMPLATE only
UniFi does not support config file imports due to security/credential requirements.
You must manually apply these settings in the UniFi Controller.

===================================================================
STEP 1: RUN BUFFERBLOAT TEST
===================================================================
Before configuring QoS, test your connection:
→ Visit: https://www.waveform.com/tools/bufferbloat
→ Run the test (takes ~1 minute)
→ Note your results:
  - Download speed: _____ Mbps
  - Upload speed: _____ Mbps
  - Bufferbloat grade: A/B/C/D/F

===================================================================
STEP 2: ENABLE SMART QUEUES (SQM)
===================================================================
1. Open UniFi Controller (https://unifi.ui.com or local)
2. Go to: Settings → Internet → WAN
3. Enable "Smart Queues"
4. Set bandwidth limits:
   - Download: 90-95% of your speed test result
   - Upload: 90-95% of your speed test result
   Example: 500 Mbps = set to 475 Mbps
5. Algorithm: fq_codel (default)
6. Click "Apply Changes"

===================================================================
STEP 3: CONFIGURE TRAFFIC RULES (DSCP TAGGING)
===================================================================
1. Go to: Settings → Traffic Management
2. Create New Rule: "Gaming Priority"
   - Type: Custom
   - Network: Your LAN
   - Action: Set DSCP
   - DSCP Tag: EF (46) or CS5 (40)
   - Ports:
     * UDP 3074-3100 (Xbox/PlayStation)
     * UDP 27000-27100 (Steam/Source games)
     * UDP 7777-7878 (Unreal Engine games)
     * TCP 80, 443 (Game downloads)

3. Create New Rule: "Streaming Priority"
   - Type: Custom
   - Network: Your LAN
   - Action: Set DSCP
   - DSCP Tag: AF41 (34)
   - Ports:
     * TCP 1935 (RTMP - Twitch/YouTube)
     * TCP 443 (HTTPS - streaming platforms)

===================================================================
STEP 4: WIFI OPTIMIZATION
===================================================================
1. Go to: Settings → WiFi
2. Enable "Band Steering" (5GHz priority)
3. Enable "DFS Channels" (more channels, less congestion)
4. Channel Width:
   - 2.4GHz: 20MHz (compatibility)
   - 5GHz: 80MHz (speed)
5. Transmit Power: Medium-High (not max - reduces interference)

===================================================================
STEP 5: DISABLE PERFORMANCE-KILLING FEATURES
===================================================================
Go to: Settings → System and DISABLE:
- Deep Packet Inspection (DPI) - adds latency
- IDS/IPS - false positives, performance hit
- Multicast DNS - not needed for gaming

===================================================================
STEP 6: VERIFY & TEST
===================================================================
1. Rerun bufferbloat test (waveform.com/tools/bufferbloat)
   - Goal: A or B grade
   - Before QoS: Often D/F grade
   - After QoS: Should be A/B grade

2. Test in-game:
   - Ping should be stable (not spiking)
   - No packet loss
   - Downloads shouldn't tank your ping

===================================================================
PERSONA: ${persona.toUpperCase()}
===================================================================
${getPersonaStrategy(persona)}

===================================================================
REFERENCE CONFIG (for your notes)
===================================================================
The attached JSON file contains suggested values.
Do NOT attempt to import this file - use it as a reference guide.

SUPPORT RESOURCES:
- UniFi Forum: https://community.ui.com
- Bufferbloat Info: https://www.bufferbloat.net
- Gaming Optimization: https://www.reddit.com/r/Ubiquiti`

  return [
    {
      filename: `rocktune-unifi-qos-template-${persona}.json`,
      content: config,
      format: 'json',
      instructions,
    },
  ]
}

function getPersonaStrategy(persona: string): string {
  switch (persona) {
    case 'gamer':
      return `Focus: Low latency gaming
- Smart Queues at 90% bandwidth (balance)
- Gaming traffic: EF (46) DSCP tag
- Basic WiFi optimization`

    case 'pro_gamer':
      return `Focus: Ultra-low latency competitive gaming
- Smart Queues at 95% bandwidth (aggressive)
- Gaming traffic: EF (46) DSCP tag (highest priority)
- Disable ALL DPI/IDS/IPS
- Wired connection MANDATORY
- 5GHz WiFi only if wired impossible`

    case 'streamer':
      return `Focus: Stable upload for streaming
- Smart Queues at 90% bandwidth
- Gaming: EF (46) tag
- Streaming: AF41 (34) tag
- Upload bandwidth management critical
- Test stream while gaming`

    case 'benchmarker':
      return `Focus: Consistent performance testing
- Smart Queues at 85% (conservative)
- Minimal QoS rules (reduce variables)
- Wired connection for reproducibility`

    default:
      return 'Balanced low-latency configuration'
  }
}

function generateUniFiJSON(persona: string): string {
  const bandwidthPercent = persona === 'pro_gamer' ? 95 : 90

  return JSON.stringify(
    {
      _note:
        'REFERENCE TEMPLATE - Do not attempt to import. Configure manually in UniFi Controller.',
      generated_by: 'RockTune',
      url: 'https://rocktune.pedroferrari.com',
      persona,

      smart_queues: {
        enabled: true,
        download_limit_percent: bandwidthPercent,
        upload_limit_percent: bandwidthPercent,
        note: 'Set to 90-95% of your actual speed test results',
        algorithm: 'fq_codel',
      },

      traffic_rules: {
        gaming: {
          name: 'Gaming Priority',
          dscp_tag: 'EF (46)',
          ports: {
            udp: ['3074-3100', '27000-27100', '7777-7878'],
            tcp: ['80', '443'],
          },
        },
        streaming:
          persona === 'streamer'
            ? {
                name: 'Streaming Priority',
                dscp_tag: 'AF41 (34)',
                ports: {
                  tcp: ['1935', '443'],
                },
              }
            : undefined,
      },

      wifi_settings: {
        band_steering: true,
        dfs_channels: true,
        channel_width: {
          '2.4ghz': '20MHz',
          '5ghz': '80MHz',
        },
        transmit_power: 'medium-high',
      },

      disable_features: {
        deep_packet_inspection: false,
        ids_ips: false,
        multicast_dns: false,
        note: 'These features add latency - disable for gaming',
      },

      testing: {
        bufferbloat_test: 'https://www.waveform.com/tools/bufferbloat',
        target_grade: 'A or B',
      },
    },
    null,
    2,
  )
}
