import { z } from 'zod'
import { CATEGORIES } from './lib/types'

/**
 * Package key schema - branded string for catalog keys
 * Ensures unique identification across the software catalog
 */
export const PackageKeySchema = z
  .string()
  .min(1, 'Package key cannot be empty')
  .regex(
    /^[a-z0-9._-]+$/,
    'Package key must be lowercase alphanumeric with dots, hyphens, or underscores',
  )
  .describe('Unique lowercase identifier for a software package (dots, hyphens, or underscores)')
  .brand<'PackageKey'>()

/**
 * Winget ID schema - branded string for package installation
 * Format: Publisher.PackageName (e.g., "Valve.Steam")
 */
const WingetIdSchema = z
  .string()
  .min(1, 'Winget ID is required')
  .regex(
    /^[\w.+-]+$/,
    'Winget ID must contain only alphanumeric characters, dots, hyphens, and plus signs',
  )
  .describe('Winget package identifier (e.g., Valve.Steam)')
  .brand<'WingetId'>()

const CategorySchema = z
  .enum(CATEGORIES)
  .describe('Software category for filtering and organization')

/**
 * Trimmed non-empty string - removes whitespace and validates
 */
const TrimmedStringSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, 'String cannot be empty after trimming')

/**
 * Emoji schema - validates single emoji character
 */
const EmojiSchema = z
  .string()
  .regex(/^\p{Emoji}$/u, 'Must be a single emoji')
  .optional()
  .describe('Optional emoji icon for visual display')

/**
 * Icon slug schema - validates icon identifier format
 */
const IconSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$|^icons\/[a-z0-9-]+\.svg$/, 'Invalid icon format')
  .optional()
  .describe('Simple Icons slug or local SVG path')

/**
 * Description schema - limited length with trimming
 */
const DescriptionSchema = z
  .string()
  .max(200, 'Description must be 200 characters or less')
  .transform((s) => s.trim())
  .optional()
  .describe('Brief description of the software package')

const SoftwarePackageSchema = z
  .object({
    id: WingetIdSchema,
    name: TrimmedStringSchema.describe('Human-readable package display name'),
    category: CategorySchema,
    icon: IconSlugSchema,
    emoji: EmojiSchema,
    desc: DescriptionSchema,
    selected: z.boolean().default(false).describe('Default selection state'),
  })
  .describe('Software package definition for the arsenal catalog')

/**
 * Software catalog schema with preprocessing
 * Normalizes keys to lowercase and filters out null entries
 */
const SoftwareCatalogSchema = z
  .preprocess(
    (data) => {
      if (typeof data !== 'object' || data === null) return data

      return Object.fromEntries(
        Object.entries(data as Record<string, unknown>)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k.toLowerCase(), v]),
      )
    },
    z.record(PackageKeySchema, SoftwarePackageSchema),
  )
  .describe('Complete software catalog with package definitions')

export type ValidatedPackage = z.infer<typeof SoftwarePackageSchema>
export type ValidatedCatalog = z.infer<typeof SoftwareCatalogSchema>

type ParseSuccess<T> = { readonly success: true; readonly data: T }
type ParseFailure = { readonly success: false; readonly error: z.ZodError }
type ParseResult<T> = ParseSuccess<T> | ParseFailure

export function isParseSuccess<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.success
}

export function safeParseCatalog(data: unknown): ParseResult<ValidatedCatalog> {
  const result = SoftwareCatalogSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function formatZodErrors(error: z.ZodError, maxIssues = 3): string {
  return error.issues
    .slice(0, maxIssues)
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
    .join(', ')
}
