import { css } from "@emotion/react";
import { colors, manaColors, radius, spacing } from "@mtg/shared";

const manaColorOrder = ['G', 'R', 'B', 'U', 'W'];

function getManaColors(colorIdentity) {
  let identity = colorIdentity;

  if (typeof identity === 'string') {
    try {
      identity = JSON.parse(identity);
    } catch {
      identity = [];
    }
  }

  if (!Array.isArray(identity)) return [];

  const identitySet = new Set(identity.map(color => String(color).toUpperCase()));

  return manaColorOrder
    .filter(color => identitySet.has(color))
    .map(color => manaColors[color]);
}

export default function DeckCard({ deck, selected = false, onDeckSelect, onDeckEdit }) {
  const identityColors = getManaColors(deck.color_identity);
  const hasIdentityGradient = selected && identityColors.length > 0;
  const identityGradient = identityColors.join(', ');
  const backgroundImage = deck.background_image ?? deck.backgorund_image;

  return (
    <div
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDeckEdit?.(deck);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onDeckSelect?.();
      }}
      css={css`
        background: ${hasIdentityGradient
          ? colors.bgRaised
          : selected ? colors.bgRaised : colors.bgSurface};
        background-image: ${backgroundImage
          ? `linear-gradient(rgba(22, 33, 62, 0.72), rgba(22, 33, 62, 0.72)), url("${backgroundImage}")`
          : 'none'};
        background-position: center;
        background-size: cover;
        border-radius: ${radius.md};
        min-height: 80px;
        padding: ${spacing.sm};
        cursor: pointer;
        position: relative;
        isolation: isolate;
        border: 2px solid ${hasIdentityGradient ? 'transparent' : selected ? colors.accent : colors.border};
        transition: 0.1s ease-in border;

        ${hasIdentityGradient && `
          @keyframes deck-card-border-reveal {
            from { clip-path: inset(0 50% 0 50%); }
            to { clip-path: inset(0); }
          }

          &::before {
            content: '';
            position: absolute;
            inset: -2px;
            padding: 2px;
            border-radius: inherit;
            background: linear-gradient(-45deg, ${identityGradient});
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: deck-card-border-reveal 0.2s ease-out forwards;
            pointer-events: none;
            z-index: 0;
          }

          & > * {
            position: relative;
            z-index: 1;
          }
        `}
        &:hover {
          background-color: ${colors.bgRaised};
        }
      `}
    >
      <h3
        css={css`
          font-size: 1em;
        `}
      >
        {deck.name}
      </h3>
      <p
        css={css`
          font-size: 0.9em;
          color: ${colors.textMuted};
        `}
      >
        {deck.format}
      </p>
    </div>
  )
}
