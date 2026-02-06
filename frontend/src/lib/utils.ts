import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Page main heading – consistent size and style across all roles (bold, slate-to-indigo gradient). */
export const PAGE_HEADING_CLASS =
  "font-heading text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 via-slate-700 to-indigo-600 dark:from-slate-100 dark:via-slate-200 dark:to-indigo-400 bg-clip-text text-transparent"

/** Page subheading – one line under the title. Use space-y-1 on wrapper for consistent spacing. */
export const PAGE_SUBHEADING_CLASS = "text-sm sm:text-base text-slate-600 dark:text-slate-400"
