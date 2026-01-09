import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import {
  normalizeManualItem,
  type ManualStepItem,
  type ManualStepSection,
  type GuideCopy,
} from './manual-steps.ts'

function buildSection(items: readonly ManualStepItem[]): ManualStepSection {
  return {
    id: 'test-section',
    title: 'Test Section',
    description: 'Test settings',
    items,
  }
}

Deno.test('normalizeManualItem uses guide.steps when provided', () => {
  const item: ManualStepItem = {
    id: 'test-guide-steps',
    step: 'Settings > Display',
    check: 'Set refresh rate to max',
    why: 'Avoid running at 60Hz by accident.',
    guide: {
      intro: 'Test intro.',
      steps: ['First open Settings.', 'Next set refresh rate.', 'Finish by applying.'],
      benefits: ['May improve responsiveness.'],
      risks: ['May have no measurable effect; test on yours.'],
      skipIf: ['Skip if already set.'],
      verify: ['Verify refresh rate in game.'],
      rollback: ['Restore previous value.'],
    },
  }

  const normalized = normalizeManualItem(item, buildSection([item]))
  assertEquals(normalized.guide.steps[0], 'First open Settings.')
})

Deno.test('normalizeManualItem falls back to manualSteps and prefixes step words', () => {
  const item: ManualStepItem = {
    id: 'test-manual-steps',
    step: 'Registry',
    check: 'Set value',
    why: 'Testing fallback.',
    manualSteps: ['Open Registry Editor', 'Navigate to key', 'Reboot'],
  }

  const normalized = normalizeManualItem(item, buildSection([item]))
  assert(normalized.guide.steps[0].startsWith('First '))
  assert(normalized.guide.steps[1].startsWith('Next '))
  assert(normalized.guide.steps[2].startsWith('Finish '))
})

Deno.test('normalizeManualItem enforces failure modes for registry-like items', () => {
  const item: ManualStepItem = {
    id: 'test-registry-item',
    step: 'Registry: HKLM\\Software',
    check: 'Set Example = 1',
    why: 'Testing failure modes.',
    automated: {
      script: true,
      registryPath: 'HKLM:\\Software\\Test',
      registryKey: 'Example',
      registryValue: 1,
      registryType: 'DWORD',
    },
  }

  const normalized = normalizeManualItem(item, buildSection([item]))
  assert(normalized.guide.assessment.risk >= 3)
  assert(normalized.guide.failureModes.length > 0)
})

Deno.test('normalizeManualItem warns when guide assessment is missing lastReviewed', () => {
  const warnings: string[] = []
  const item: ManualStepItem = {
    id: 'test-review-warning',
    step: 'Settings > Example',
    check: 'Toggle On',
    why: 'Testing review warning.',
    guide: {
      intro: 'Test intro.',
      steps: ['First open settings.', 'Next toggle on.', 'Finish by testing.'],
      benefits: ['May help.'],
      risks: ['May not help.'],
      skipIf: ['Skip if not needed.'],
      verify: ['Verify change applied.'],
      rollback: ['Toggle off.'],
      assessment: {
        evidence: 'community',
        confidence: 3,
        risk: 2,
        impact: {},
        scope: 'global',
      },
    } satisfies GuideCopy,
  }

  normalizeManualItem(item, buildSection([item]), {
    warn: (message) => warnings.push(message),
  })

  assertExists(warnings.find((entry) => entry.includes('Missing lastReviewed')))
})
