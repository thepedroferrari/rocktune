import { z } from 'zod'
import { CATEGORIES, CPU_TYPES, GPU_TYPES, PERIPHERAL_TYPES, PROFILE_VERSION } from './types.ts'

export const CategorySchema = z.enum(CATEGORIES)

export const CpuTypeSchema = z.enum([CPU_TYPES.AMD_X3D, CPU_TYPES.AMD, CPU_TYPES.INTEL])

export const GpuTypeSchema = z.enum([GPU_TYPES.NVIDIA, GPU_TYPES.AMD, GPU_TYPES.INTEL])

export const PeripheralTypeSchema = z.enum([
  PERIPHERAL_TYPES.LOGITECH,
  PERIPHERAL_TYPES.RAZER,
  PERIPHERAL_TYPES.CORSAIR,
  PERIPHERAL_TYPES.STEELSERIES,
])

export const SoftwarePackageSchema = z.object({
  id: z.string().min(1, 'Package ID is required'),
  name: z.string().min(1, 'Package name is required'),
  category: CategorySchema,
  icon: z.string().optional(),
  emoji: z.string().optional(),
  desc: z.string().optional(),
  selected: z.boolean().optional(),
})

export const SoftwareCatalogSchema = z.record(z.string().min(1), SoftwarePackageSchema)

export const HardwareProfileSchema = z.object({
  cpu: CpuTypeSchema,
  gpu: GpuTypeSchema,
  peripherals: z.array(PeripheralTypeSchema),
})

export const SavedProfileSchema = z.object({
  version: z.literal(PROFILE_VERSION),
  created: z.string().datetime().or(z.string().min(1)),
  hardware: HardwareProfileSchema,
  optimizations: z.array(z.string()),
  software: z.array(z.string()),
})

export type ValidatedPackage = z.infer<typeof SoftwarePackageSchema>
export type ValidatedCatalog = z.infer<typeof SoftwareCatalogSchema>
export type ValidatedHardware = z.infer<typeof HardwareProfileSchema>
export type ValidatedProfile = z.infer<typeof SavedProfileSchema>

type ParseSuccess<T> = { readonly success: true; readonly data: T }
type ParseFailure = { readonly success: false; readonly error: z.ZodError }
type ParseResult<T> = ParseSuccess<T> | ParseFailure

export function isParseSuccess<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.success
}

export function isParseFailure<T>(result: ParseResult<T>): result is ParseFailure {
  return !result.success
}

export function validateCatalog(data: unknown): ValidatedCatalog {
  return SoftwareCatalogSchema.parse(data)
}

export function validateProfile(data: unknown): ValidatedProfile {
  return SavedProfileSchema.parse(data)
}

export function validatePackage(data: unknown): ValidatedPackage {
  return SoftwarePackageSchema.parse(data)
}

export function safeParseCatalog(data: unknown): ParseResult<ValidatedCatalog> {
  const result = SoftwareCatalogSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function safeParseProfile(data: unknown): ParseResult<ValidatedProfile> {
  const result = SavedProfileSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function safeParsePackage(data: unknown): ParseResult<ValidatedPackage> {
  const result = SoftwarePackageSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function isCatalogEntry(value: unknown): value is [string, ValidatedPackage] {
  if (!Array.isArray(value) || value.length !== 2) return false
  const [key, pkg] = value
  if (typeof key !== 'string') return false
  return SoftwarePackageSchema.safeParse(pkg).success
}

export function isValidCatalog(value: unknown): value is ValidatedCatalog {
  return SoftwareCatalogSchema.safeParse(value).success
}

export function isValidProfile(value: unknown): value is ValidatedProfile {
  return SavedProfileSchema.safeParse(value).success
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
