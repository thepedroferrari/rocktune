<script lang="ts">
  import AuditPanel from './AuditPanel.svelte'
  import { app } from '$lib/state.svelte'

  function buildScript(): string {
    if (Object.keys(app.software).length === 0) {
      return '// Load the software catalog to start building your script.'
    }

    const selectedKeys = Array.from(app.selected)
    if (selectedKeys.length === 0) {
      return '// No software selected yet.'
    }

    const packages = selectedKeys
      .map((key) => app.software[key])
      .filter((pkg) => pkg != null)
      .toSorted((a, b) => a.name.localeCompare(b.name))

    const lines = [
      '# RockTune script preview',
      `# Generated: ${new Date().toISOString()}`,
      '',
      '# Software installs',
      ...packages.map((pkg) =>
        `winget install --id ${pkg.id} --silent --accept-package-agreements --accept-source-agreements`
      ),
    ]

    return lines.join('\n')
  }

  let script = $derived(buildScript())
</script>

<AuditPanel {script} />
