import { css, keyframes } from "@emotion/react"
import { useEffect, useRef, useState } from "react"
import { radius, spacing, buttonColors, colors } from "./theme"

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
  spread = false,
  square = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}) {
  const c = buttonColors[danger ? "danger" : variant]
  const s = sizes[size] ?? sizes.xs
  const tooltip = rest["aria-label"]
  const buttonRef = useRef(null)
  const tooltipRef = useRef(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 })

  function positionTooltip() {
    const button = buttonRef.current
    const tooltipElement = tooltipRef.current
    if (!button || !tooltipElement) return

    const buttonRect = button.getBoundingClientRect()
    const tooltipRect = tooltipElement.getBoundingClientRect()
    const edgePadding = 8
    const gap = 4
    const maxLeft = Math.max(
      edgePadding,
      window.innerWidth - tooltipRect.width - edgePadding,
    )
    const left = Math.min(
      Math.max(
        edgePadding,
        buttonRect.left + (buttonRect.width - tooltipRect.width) / 2,
      ),
      maxLeft,
    )
    const top = buttonRect.top - tooltipRect.height - gap >= edgePadding
      ? buttonRect.top - tooltipRect.height - gap
      : buttonRect.bottom + gap

    setTooltipPosition({ left, top })
  }

  useEffect(() => {
    if (!tooltipVisible) return undefined

    const frame = requestAnimationFrame(positionTooltip)
    const reposition = () => positionTooltip()
    window.addEventListener("resize", reposition)
    window.addEventListener("scroll", reposition, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
    }
  }, [tooltipVisible])

  const handleMouseEnter = (event) => {
    onMouseEnter?.(event)
    if (tooltip) setTooltipVisible(true)
  }

  const handleMouseLeave = (event) => {
    onMouseLeave?.(event)
    setTooltipVisible(false)
  }

  const handleFocus = (event) => {
    onFocus?.(event)
    if (tooltip) setTooltipVisible(true)
  }

  const handleBlur = (event) => {
    onBlur?.(event)
    setTooltipVisible(false)
  }

  return (
    <>
      <button
        css={css`
        box-sizing: border-box;
        width: ${spread && !square ? '100%' : 'auto'};
        min-width: ${square ? 0 : spread ? '100%' : s.minWidth};
        height: auto;
        padding: ${square ? s.padding.split(' ')[0] : s.padding};
        font-size: ${s.fontSize};
        line-height: ${square ? 0 : 1.2};
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: ${spacing.sm};
        & + [role="tooltip"] {
          position: fixed;
          left: ${tooltipPosition.left}px;
          top: ${tooltipPosition.top}px;
          padding: ${spacing.xs} ${spacing.sm};
          border-radius: ${radius.sm};
          background-color: ${colors.bgRaised};
          color: ${colors.textPrimary};
          font-size: 12px;
          font-weight: normal;
          line-height: 1.2;
          white-space: nowrap;
          opacity: ${tooltipVisible ? 1 : 0};
          pointer-events: none;
          transition: opacity 0.15s;
          z-index: 1000;
        }
        & > svg {
          display: block;
        }
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
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
      {tooltip && (
        <span ref={tooltipRef} role="tooltip">
          {tooltip}
        </span>
      )}
    </>
  )
}
