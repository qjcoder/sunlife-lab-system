/**
 * ====================================================
 * IMAGE UTILITIES
 * ====================================================
 * 
 * This module provides utilities for fetching and handling product images.
 * 
 * FEATURES:
 * - Automatic extension fallback (.jpg, .png, .jpeg)
 * - Model code to image path conversion
 * - Error handling with placeholder fallback
 * 
 * USAGE:
 * import { getProductImage, getImageWithFallback } from '@/lib/image-utils';
 */

/**
 * Get product image path from model data
 * Ensures all paths point to /products/ directory (public/products/)
 * 
 * @param model - Inverter model object with image or modelCode
 * @returns Image path string starting with /products/
 */
export function getProductImage(model: { image?: string; modelCode?: string }): string {
  // Use image from database if available, but ensure it's in /products/
  if (model.image) {
    // If image path doesn't start with /products/, normalize it
    if (model.image.startsWith('/products/')) {
      return model.image;
    }
    // If it's a relative path or just filename, prepend /products/
    if (!model.image.startsWith('/') && !model.image.startsWith('http')) {
      return `/products/${model.image}`;
    }
    // If it already has /products/ in it, use as is
    if (model.image.includes('/products/')) {
      return model.image;
    }
    // Otherwise, assume it's a filename and prepend /products/
    return `/products/${model.image}`;
  }
  
  // Fallback: generate from modelCode
  if (model.modelCode) {
    // Normalize modelCode: convert to lowercase, keep hyphens and alphanumeric
    // This preserves the structure like "SL-2R0KW" -> "sl-2r0kw"
    let modelCode = model.modelCode.toLowerCase().trim();
    
    // Only replace spaces and underscores with hyphens, keep existing hyphens
    modelCode = modelCode
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/_/g, '-')    // Replace underscores with hyphens
      .replace(/-+/g, '-')   // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `/products/${modelCode}.jpg`;
  }
  
  // No image available
  return '';
}

/**
 * Get image with automatic extension fallback
 * Tries .jpg, .png, .jpeg in order
 * Ensures all paths are in /products/ directory
 * 
 * @param basePath - Base image path without extension or with extension
 * @returns Array of paths to try in order (all starting with /products/)
 */
export function getImageFallbackPaths(basePath: string): string[] {
  if (!basePath) return [];
  
  // Ensure path starts with /products/
  let normalizedPath = basePath;
  if (!normalizedPath.startsWith('/products/')) {
    if (normalizedPath.startsWith('/')) {
      normalizedPath = `/products${normalizedPath}`;
    } else {
      normalizedPath = `/products/${normalizedPath}`;
    }
  }
  
  // If path already has extension, try that first, then alternatives
  if (normalizedPath.match(/\.(jpg|jpeg|png)$/i)) {
    const withoutExt = normalizedPath.replace(/\.(jpg|jpeg|png)$/i, '');
    const currentExt = normalizedPath.match(/\.(jpg|jpeg|png)$/i)?.[1]?.toLowerCase() || 'jpg';
    
    // Try current extension first, then others
    const extensions = ['jpg', 'png', 'jpeg'];
    const orderedExtensions = [
      currentExt,
      ...extensions.filter(ext => ext !== currentExt)
    ];
    
    return orderedExtensions.map(ext => `${withoutExt}.${ext}`);
  }
  
  // Otherwise try all extensions in order: jpg, png, jpeg
  return [
    `${normalizedPath}.jpg`,
    `${normalizedPath}.png`,
    `${normalizedPath}.jpeg`,
  ];
}

/**
 * Handle image error with automatic fallback
 * Uses data attribute to track current attempt index
 * 
 * @param e - Error event from img tag
 * @param fallbackPaths - Array of paths to try
 * @param onAllFailed - Callback when all paths fail
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackPaths: string[],
  onAllFailed?: () => void
): void {
  const img = e.target as HTMLImageElement;
  
  if (!fallbackPaths || fallbackPaths.length === 0) {
    img.style.display = 'none';
    if (onAllFailed) onAllFailed();
    return;
  }
  
  // Get current attempt index from data attribute, or start at 0
  let currentIndex = parseInt(img.dataset.fallbackIndex || '0', 10);
  
  // Try next path
  if (currentIndex < fallbackPaths.length - 1) {
    currentIndex++;
    img.dataset.fallbackIndex = currentIndex.toString();
    const nextPath = fallbackPaths[currentIndex];
    
    // Prevent infinite loops by checking if we're trying the same path
    if (img.src === nextPath || img.dataset.lastTried === nextPath) {
      img.style.display = 'none';
      if (onAllFailed) onAllFailed();
      return;
    }
    
    img.dataset.lastTried = nextPath;
    img.src = nextPath;
    return;
  }
  
  // All paths exhausted, hide image and show placeholder
  if (import.meta.env.DEV) {
    console.warn(`[Image] All fallback paths failed: ${fallbackPaths.join(', ')}`);
  }
  img.style.display = 'none';
  if (onAllFailed) {
    onAllFailed();
  }
}

/**
 * Get product image with proper error handling
 * 
 * @param model - Inverter model object
 * @returns Object with image src and error handler
 */
export function getProductImageWithHandler(model: { image?: string; modelCode?: string }) {
  const imagePath = getProductImage(model);
  const fallbackPaths = imagePath ? getImageFallbackPaths(imagePath) : [];
  
  // Debug: log image paths (only in development)
  if (import.meta.env.DEV && imagePath) {
    console.log(`[Image] Model: ${model.modelCode || 'N/A'}, Path: ${imagePath}, Fallbacks: ${fallbackPaths.join(', ')}`);
  }
  
  return {
    src: imagePath,
    fallbackPaths,
    onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = e.target as HTMLImageElement;
      const failedPath = img.src;
      
      // Debug: log failed image attempts
      if (import.meta.env.DEV) {
        console.warn(`[Image] Failed to load: ${failedPath}, Model: ${model.modelCode || 'N/A'}`);
      }
      
      handleImageError(e, fallbackPaths, () => {
        // Hide image on complete failure
        img.style.display = 'none';
        if (import.meta.env.DEV) {
          console.error(`[Image] All paths failed for model: ${model.modelCode || 'N/A'}, Tried: ${fallbackPaths.join(', ')}`);
        }
      });
    },
  };
}
