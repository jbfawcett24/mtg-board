import { css } from "@emotion/react"
import { spacing, colors, Button } from "@mtg/shared"
import SocketStatusIcon from "./SocketStatusIcon"

export default function Header({ title, actions }) {
  return (
    <header
      css={css`
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: ${spacing.sm} ${spacing.lg};
        background: ${colors.bgSurface};
      `}
    >
      <h1 css={css`
            background-color: transparent;
            font-size: 1.1rem;
            font-weight: bold;
            width: 100%;
            color: ${colors.textPrimary};
            border: none;
            outline: none;
        `}>
        {title}
      </h1>
      <div css={css`
          display: flex;
          align-items: center;
          gap: ${spacing.md};
        `}>
        {actions}
      </div>
    </header>
  )
}
