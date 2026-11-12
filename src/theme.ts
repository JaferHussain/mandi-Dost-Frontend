// Colours match the web prototype so both feel like the same product.
export const colors = {
  brand50: '#f0fdf4',
  brand100: '#dcfce7',
  brand200: '#bbf7d0',
  brand500: '#22a04b',
  brand600: '#16803c',
  brand700: '#166534',
  brand800: '#14532d',
  cream: '#faf7f0',
  sand: '#f1ead9',
  earth: '#5b3a1e',
  gold: '#f5b82e',
  ink: '#1f2a22',
  muted: '#6b7466',
  white: '#ffffff',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  border: 'rgba(0,0,0,0.08)',
}

/** Loaded in the root layout. Nastaliq needs a tall line height or the letters are cut off. */
export const fonts = {
  urdu: 'NotoNastaliqUrdu_400Regular',
  urduBold: 'NotoNastaliqUrdu_700Bold',
}

export const lineHeightFor = (size: number) => Math.round(size * 1.95)

export const radius = { sm: 10, md: 16, lg: 24, full: 999 }

/** Minimum touch target – larger than the usual 48 because many users have rough hands or older phones. */
export const touch = 56
