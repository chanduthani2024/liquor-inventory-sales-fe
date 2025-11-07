// Size mapping for frontend display
export const SIZE_DISPLAY_MAP = {
  '90ml': 'D',
  '180ml': 'N', 
  '330ml': '330ml',
  '375ml': 'P',
  '500ml': '500ml',
  '650ml': '650ml',
  '750ml': 'Q',
  '1L': '1L',
  '2L': '2L'
} as const;

// Reverse mapping for converting display names back to actual sizes
export const DISPLAY_SIZE_MAP = {
  'D': '90ml',
  'N': '180ml',
  '330ml': '330ml',
  'P': '375ml',
  '500ml': '500ml',
  '650ml': '650ml',
  'Q': '750ml',
  '1L': '1L',
  '2L': '2L'
} as const;

// Function to get display name for a size
export const getSizeDisplayName = (size: string): string => {
  return SIZE_DISPLAY_MAP[size as keyof typeof SIZE_DISPLAY_MAP] || size;
};

// Function to get actual size from display name
export const getActualSize = (displayName: string): string => {
  return DISPLAY_SIZE_MAP[displayName as keyof typeof DISPLAY_SIZE_MAP] || displayName;
};

// Get all available sizes with their display names
export const getAllSizeOptions = () => {
  return Object.entries(SIZE_DISPLAY_MAP).map(([actualSize, displayName]) => ({
    actualSize,
    displayName,
    label: `${displayName} (${actualSize})` // For dropdowns
  }));
};