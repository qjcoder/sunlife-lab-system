import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Page main heading – consistent size and style across all roles (bold, slate-to-indigo gradient). */
export const PAGE_HEADING_CLASS =
  "font-heading text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 via-slate-700 to-indigo-600 dark:from-slate-100 dark:via-slate-200 dark:to-indigo-400 bg-clip-text text-transparent"

/** First word of two-tone heading: dark charcoal (matches Product Dispatch / Factory Stock). */
export const PAGE_HEADING_FIRST =
  "font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100"
/** Second word of two-tone heading: purple-blue (matches Product Dispatch / Factory Stock). */
export const PAGE_HEADING_SECOND =
  "font-heading text-2xl sm:text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400"

/** Page subheading – one line under the title. Use space-y-1 on wrapper for consistent spacing. */
export const PAGE_SUBHEADING_CLASS = "text-sm sm:text-base text-slate-600 dark:text-slate-400"

/**
 * Model display name – same logic as Dashboard Product Catalog (battery/VFD/IP65/other).
 * Use everywhere we show a model name for consistency.
 */
export function getModelDisplayName(model: {
  brand?: string
  productLine?: string
  variant?: string
  modelCode?: string
  modelName?: string
} | null | undefined): string {
  if (!model) return ''

  const brand = (model.brand || '').trim()
  const productLine = (model.productLine || '').trim()
  const variant = (model.variant || '').trim()
  const modelCode = (model.modelCode || '').trim()
  const productLineLower = productLine.toLowerCase()
  const brandLower = brand.toLowerCase()
  const fullName = [brand, productLine, variant, modelCode].filter(Boolean).join(' ').toLowerCase()

  const isBattery =
    productLineLower === 'lithium' ||
    productLineLower.includes('battery') ||
    productLineLower.includes('batt') ||
    /(?:SL-|RM-)\d{2}\d+/.test(modelCode) ||
    (variant.includes('V') && variant.includes('AH')) ||
    fullName.includes('51.2v') ||
    fullName.includes('48100') ||
    fullName.includes('48314') ||
    fullName.includes('100ah') ||
    fullName.includes('lithium')

  if (isBattery) return modelCode || variant || ''
  if (productLineLower === 'ip65' || (model.modelCode || '').toUpperCase().includes('IP65')) return 'IP65'
  if (productLineLower === 'vfd') return variant || 'VFD'

  let displayName = productLine
  if (brandLower && displayName.toLowerCase().startsWith(brandLower)) {
    displayName = displayName.substring(brand.length).trim().replace(/^[\s-]+/, '')
  }
  return displayName.toUpperCase() || productLine.toUpperCase()
}

/**
 * Variant/power display for model (e.g. "4kW", "6kW", "1.5kW", "800W", or "51.2V 100AH" for batteries).
 * Use for the "Variant" label on product cards.
 */
export function getVariantDisplay(model: {
  brand?: string
  productLine?: string
  variant?: string
  modelCode?: string
} | null | undefined): string {
  if (!model) return ''
  const productLine = (model.productLine || '').toLowerCase()
  const variant = (model.variant || '').trim()
  const modelCode = (model.modelCode || '').trim()
  const fullName = [model.brand, model.productLine, variant, modelCode].filter(Boolean).join(' ').toLowerCase()

  const isBattery =
    productLine === 'lithium' ||
    productLine.includes('battery') ||
    productLine.includes('batt') ||
    /(?:SL-|RM-)\d{2}\d+/.test(modelCode) ||
    (variant.includes('V') && variant.includes('AH')) ||
    fullName.includes('51.2v') ||
    fullName.includes('48100') ||
    fullName.includes('48314') ||
    fullName.includes('100ah') ||
    fullName.includes('lithium')

  if (isBattery) {
    if (variant && variant.includes('V') && variant.includes('AH')) {
      const voltageMatch = variant.match(/(\d+\.?\d*)\s*V/i)
      const capacityMatch = variant.match(/(\d+\.?\d*)\s*AH/i)
      if (voltageMatch && capacityMatch) return `${voltageMatch[1]}V ${capacityMatch[1]}AH`
      return variant.replace(/^RM\s+/i, '').trim()
    }
    if (modelCode) {
      const codeMatch = modelCode.match(/(?:SL-|RM-)?(\d{2})(\d+)(\w*)/i)
      if (codeMatch) {
        const vol = codeMatch[1] === '48' ? '51.2' : codeMatch[1]
        return `${vol}V ${codeMatch[2]}AH`
      }
    }
    return variant || modelCode || ''
  }

  // VFD (e.g. SL-GD170-011-4-PV, GD170-7R5): 011 = 11kW, 7R5 = 7.5kW (R = decimal)
  if (modelCode && /GD170/i.test(modelCode)) {
    const segmentMatch = modelCode.match(/GD170-(\d*R?\d+)/i) || modelCode.match(/-(\d*R?\d+)-\d+-PV$/i)
    const segment = segmentMatch ? segmentMatch[1].toUpperCase() : ''
    if (segment) {
      if (/R/i.test(segment)) {
        const kw = segment.replace(/R/i, '.')
        const value = parseFloat(kw)
        if (!isNaN(value)) return `${value}kW`
      } else {
        const value = parseInt(segment, 10)
        if (!isNaN(value)) return `${value}kW`
      }
    }
  }

  const searchText = [model.variant || '', model.modelCode || '', model.productLine || ''].join(' ').toLowerCase()
  const kwMatch = searchText.match(/(\d+\.?\d*)\s*k?w/i)
  if (kwMatch) {
    const value = parseFloat(kwMatch[1])
    return value >= 100 ? `${value}W` : `${value}kW`
  }
  const wMatch = searchText.match(/(\d+)\s*w\b/i)
  if (wMatch) {
    const value = parseInt(wMatch[1], 10)
    return value >= 100 ? `${value}W` : `${value}kW`
  }
  const numericMatch = searchText.match(/(\d+\.?\d*)/)
  if (numericMatch) {
    const value = parseFloat(numericMatch[1])
    return value >= 100 ? `${value}W` : `${value}kW`
  }
  return model.variant || model.modelCode || ''
}

/**
 * Extract power rating in watts from model (for sorting).
 * Used to sort models higher to lower; same logic as Factory Stock/Dashboard.
 */
export function extractPowerRating(model: {
  variant?: string
  modelCode?: string
  productLine?: string
  modelName?: string
} | null | undefined): number {
  if (!model) return 0
  const modelCode = (model.modelCode || '').trim()
  const searchText = [
    model.variant || '',
    modelCode,
    model.productLine || '',
    model.modelName || '',
  ].join(' ').toLowerCase()

  // VFD (e.g. GD170-011, GD170-7R5): 011 = 11kW, 7R5 = 7.5kW → watts for sorting
  if (modelCode && /GD170/i.test(modelCode)) {
    const segmentMatch = modelCode.match(/GD170-(\d*R?\d+)/i) || modelCode.match(/-(\d*R?\d+)-\d+-PV$/i)
    const segment = segmentMatch ? segmentMatch[1].toUpperCase() : ''
    if (segment) {
      if (/R/i.test(segment)) {
        const kw = parseFloat(segment.replace(/R/i, '.'))
        if (!isNaN(kw)) return kw * 1000
      } else {
        const kw = parseInt(segment, 10)
        if (!isNaN(kw)) return kw * 1000
      }
    }
  }

  const kwMatch = searchText.match(/(\d+\.?\d*)\s*k?w/i)
  if (kwMatch) {
    const value = parseFloat(kwMatch[1])
    return value < 100 ? value * 1000 : value
  }
  const wMatch = searchText.match(/(\d+)\s*w\b/i)
  if (wMatch) return parseInt(wMatch[1], 10)
  if (searchText.includes('1.5') || searchText.includes('1r5')) return 1500
  const numericMatch = searchText.match(/(\d+\.?\d*)/)
  if (numericMatch) {
    const value = parseFloat(numericMatch[1])
    return value < 100 ? value * 1000 : value
  }
  return 0
}

/**
 * Sort models: active first, then by power higher to lower (discontinued at end).
 */
export function sortModelsByPowerAndActive<T extends { active?: boolean }>(
  models: T[],
  getPower: (m: T) => number
): T[] {
  return [...models].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return getPower(b) - getPower(a)
  })
}

export type ProductCategory = 'inverter' | 'battery' | 'vfd'

/**
 * Categorize a model as inverter, battery, or vfd. Use for category-wise lists.
 */
export function categorizeModel(model: {
  productLine?: string
  brand?: string
  variant?: string
  modelCode?: string
} | null | undefined): ProductCategory {
  if (!model) return 'inverter'
  const productLine = (model.productLine || '').toLowerCase()
  const brand = (model.brand || '').toLowerCase()
  const variant = (model.variant || '').toLowerCase()
  const modelCode = (model.modelCode || '').toLowerCase()
  const fullName = `${brand} ${productLine} ${variant} ${modelCode}`.toLowerCase()
  if (
    productLine.includes('vfd') || brand.includes('vfd') || variant.includes('vfd') ||
    modelCode.includes('vfd') || fullName.includes('vfd') || modelCode.includes('gd170')
  ) return 'vfd'
  if (
    productLine.includes('battery') || productLine.includes('batt') || productLine.includes('lithium') ||
    brand.includes('battery') || brand.includes('lithium') || variant.includes('battery') ||
    variant.includes('lithium') || modelCode.includes('battery') || modelCode.includes('lithium') ||
    fullName.includes('battery') || fullName.includes('lithium') || fullName.includes('51.2v') ||
    fullName.includes('48100') || fullName.includes('48314') || fullName.includes('100ah')
  ) return 'battery'
  return 'inverter'
}
