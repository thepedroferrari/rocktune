<script lang="ts">
/**
 * DNS Provider Selector - Radio group for choosing DNS provider
 *
 * Shown when the DNS optimization is enabled.
 */

import { app, setDnsProvider } from '$lib/state.svelte'
import { DNS_PROVIDERS, type DnsProviderType } from '$lib/types'

const DNS_OPTIONS: readonly {
  value: DnsProviderType
  label: string
  hint: string
}[] = [
  {
    value: DNS_PROVIDERS.CLOUDFLARE,
    label: 'Cloudflare',
    hint: '1.1.1.1 — fastest, privacy-focused',
  },
  {
    value: DNS_PROVIDERS.GOOGLE,
    label: 'Google',
    hint: '8.8.8.8 — reliable, widely used',
  },
  {
    value: DNS_PROVIDERS.QUAD9,
    label: 'Quad9',
    hint: '9.9.9.9 — blocks malware domains',
  },
  {
    value: DNS_PROVIDERS.OPENDNS,
    label: 'OpenDNS',
    hint: '208.67.222.222 — Cisco, very stable',
  },
  {
    value: DNS_PROVIDERS.ADGUARD,
    label: 'AdGuard',
    hint: '94.140.14.14 — blocks ads at DNS level',
  },
] as const

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  setDnsProvider(target.value as DnsProviderType)
}
</script>

<fieldset class="dns-selector">
  <legend class="dns-label">DNS Provider:</legend>
  <div class="dns-options">
    {#each DNS_OPTIONS as option (option.value)}
      <label
        class="dns-option"
        class:selected={app.dnsProvider === option.value}
      >
        <input
          type="radio"
          name="dns-provider"
          value={option.value}
          checked={app.dnsProvider === option.value}
          autocomplete="off"
          onchange={handleChange}
        />
        <span class="dns-option-label">{option.label}</span>
        <span class="dns-option-hint">{option.hint}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .dns-selector {
    margin-block-start: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .dns-label {
    display: block;
    margin-block-end: var(--space-xs);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
  }

  .dns-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-xs);
  }

  @media (max-width: 768px) {
    .dns-options {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .dns-option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    cursor: pointer;
    transition: var(--transition-fast);
    transition-property: border-color, background;
  }

  .dns-option:hover {
    border-color: var(--accent-dim);
    background: var(--bg-hover);
  }

  .dns-option.selected {
    border-color: var(--accent);
    background: color-mix(in oklch, var(--accent) 10%, var(--bg-secondary));
  }

  .dns-option input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .dns-option-label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .dns-option-hint {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .dns-option.selected .dns-option-label {
    color: var(--accent);
  }

  @media (max-width: 480px) {
    .dns-options {
      grid-template-columns: 1fr;
    }
  }
</style>
