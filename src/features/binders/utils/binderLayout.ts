// Utility to calculate cards per page and map slot indices to pages for a binder
import { BinderPreset } from '@/src/shared/config/binder-presets';

export function getCardsPerPage(preset: BinderPreset): number {
  return preset.rows * preset.cols;
}

// Returns an array of arrays, where each inner array contains the slot indices for that page
export function mapSlotsToPages(totalSlots: number, preset: BinderPreset): number[][] {
  const cardsPerPage = getCardsPerPage(preset);
  const pages: number[][] = [];
  for (let i = 0; i < totalSlots; i += cardsPerPage) {
    const pageSlots = [];
    for (let j = 0; j < cardsPerPage && i + j < totalSlots; j++) {
      pageSlots.push(i + j);
    }
    pages.push(pageSlots);
  }
  return pages;
}
