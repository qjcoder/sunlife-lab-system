import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Page main heading – same style as Dashboard (large, bold, slate-to-indigo gradient). Use on every tab. */
export const PAGE_HEADING_CLASS =
  "font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-800 via-slate-700 to-indigo-600 dark:from-slate-100 dark:via-slate-200 dark:to-indigo-400 bg-clip-text text-transparent"

/** Page subheading – contextual line under the title. Do not use "Welcome back" on non-dashboard tabs. */
export const PAGE_SUBHEADING_CLASS = "text-base sm:text-lg text-slate-600 dark:text-slate-400 tracking-wide"
