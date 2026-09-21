import { css, keyframes } from "@emotion/react"
import { radius, spacing, buttonColors } from "./theme"

const spin = keyframes`
  to { transform: rotate(360deg); }
`

// Each size scales padding, font, and min width together.
// Vertical padding is smaller than horizontal so buttons stay wider than tall.
const sizes = {
  xs: { padding: "4px 12px", fontSize: "12px", minWidth: "72px", radius: radius.sm },
  sm: { padding: "6px 16px", fontSize: "14px", minWidth: "88px", radius: radius.sm },
  md: { padding: "8px 20px", fontSize: "16px", minWidth: "104px", radius: radius.md },
  lg: { padding: "12px 28px", fontSize: "18px", minWidth: "128px", radius: radius.md },
  xl: { padding: "16px 36px", fontSize: "20px", minWidth: "152px", radius: radius.md },
}

export default function Button({
  onClick,
  children,
  variant = "primary",   // "primary" | "secondary" | "danger"
  danger = false,        // shorthand for variant="danger"
  size = "xs",
  loading = false,
  selected,          // true/false for toggle buttons; leave undefined otherwise
  disabled = false,
  ...rest
}) {
  const c = buttonColors[danger ? "danger" : variant]
  const s = sizes[size] ?? sizes.xs

  return (
    <button
      css={css`
        box-sizing: border-box;
        min-width: ${s.minWidth};
        padding: ${s.padding};
        font-size: ${s.fontSize};
        line-height: 1.2;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: ${spacing.sm};
        background-color: ${c.default.bg};
        color: ${c.default.text};
        border: 1px solid ${c.default.border};
        border-radius: ${s.radius};
        cursor: pointer;
        transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;

        &:hover:not(:disabled) {
          background-color: ${c.hover.bg};
          border-color: ${c.hover.border};
        }
        &:active:not(:disabled) {
          background-color: ${c.active.bg};
          border-color: ${c.active.border};
        }
        &:focus-visible {
          outline: none;
          border-color: ${c.focus.border};
          box-shadow: 0 0 0 3px ${c.focus.ring};
        }
        &:disabled {
          background-color: ${c.disabled.bg};
          color: ${c.disabled.text};
          border-color: ${c.disabled.border};
          cursor: not-allowed;
        }
        &[aria-busy="true"] {
          background-color: ${c.loading.bg};
          border-color: ${c.loading.border};
          color: ${c.loading.text};
          cursor: progress;
        }
        &[aria-pressed="true"] {
          background-color: ${c.selected.bg};
          color: ${c.selected.text};
          border-color: ${c.selected.border};
        }
      `}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={selected}
      {...rest}
    >
      {loading && (
        <span
          css={css`
            width: 1em;
            height: 1em;
            border: 2px solid ${c.loading.spinner};
            border-right-color: transparent;
            border-radius: 50%;
            animation: ${spin} 0.7s linear infinite;
          `}
        />
      )}
      {children}
    </button>
  )
}
