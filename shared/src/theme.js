export const colors = {
  white: '#FFFFFF',
  lightGrey: '#DDDDDD',

  // Backgrounds (navy, unchanged; teal reads well against these)
  bgBase: '#1a1a2e',
  bgSurface: '#16213e',
  bgRaised: '#0f3460',

  // Accent (teal)
  accent: '#14b8a6',
  accentHover: '#2dd4bf',
  accentActive: '#0d9488',
  accentText: '#1a1a2e',            // label color on top of accent fills
  accentRing: 'rgba(20, 184, 166, 0.5)',

  // Text
  textPrimary: '#eeeeee',
  textMuted: '#aaaaaa',
  textFaint: '#555555',

  // Status
  success: '#7cb342',               // lime-leaning so it isn't confused with teal
  error: '#f44336',
  warning: '#ff9800',

  // Card zones
  zoneBattlefield: '#1a1a2e',
  zoneGraveyard: '#16213e',
  zoneExile: '#16213e',
  zoneCommand: '#16213e',
  zoneLibrary: '#16213e',

  // Borders
  border: '#0f3460',
  borderFocus: '#14b8a6',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  card: '24px',
};

export const font = {
  base: 'sans-serif',
  mono: 'monospace',
};

// Buttons derive from the tokens above, so changing colors.accent updates them too
export const buttonColors = {
  primary: {
    default: { bg: colors.accent, text: colors.accentText, border: colors.accent },
    hover: { bg: colors.accentHover, text: colors.accentText, border: colors.accentHover },
    active: { bg: colors.accentActive, text: colors.accentText, border: colors.accentActive },
    focus: { bg: colors.accent, text: colors.accentText, border: colors.white, ring: colors.accentRing },
    disabled: { bg: '#243447', text: '#7a8794', border: '#243447' },
    loading: { bg: '#12a898', text: colors.accentText, border: '#12a898', spinner: colors.accentText },
    selected: { bg: colors.bgRaised, text: colors.white, border: colors.accent },
  },

  danger: {
    default: { bg: '#d32f2f', text: colors.white, border: '#d32f2f' },
    hover: { bg: '#b71c1c', text: colors.white, border: '#b71c1c' },
    active: { bg: '#8e1616', text: colors.white, border: '#8e1616' },
    focus: { bg: '#d32f2f', text: colors.white, border: colors.white, ring: 'rgba(244, 67, 54, 0.5)' },
    disabled: { bg: '#3a2529', text: '#777777', border: '#3a2529' },
    loading: { bg: '#a82828', text: colors.white, border: '#a82828', spinner: colors.white },
    selected: { bg: '#4a1515', text: colors.white, border: colors.error },
  },

  secondary: {
    default: { bg: 'transparent', text: colors.textPrimary, border: '#3d7a8f' },
    hover: { bg: 'rgba(20, 184, 166, 0.12)', text: colors.accentHover, border: colors.accent },
    active: { bg: 'rgba(20, 184, 166, 0.22)', text: colors.accent, border: colors.accentActive },
    focus: { bg: 'transparent', text: colors.textPrimary, border: colors.white, ring: colors.accentRing },
    disabled: { bg: 'transparent', text: '#5a6673', border: '#243447' },
    loading: { bg: 'rgba(20, 184, 166, 0.08)', text: colors.textMuted, border: '#3d7a8f', spinner: colors.accent },
    selected: { bg: 'rgba(20, 184, 166, 0.18)', text: colors.accentHover, border: colors.accent },
  }
};
