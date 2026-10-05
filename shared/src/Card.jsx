import { css } from '@emotion/react';
import { cardRadius } from './theme';

const sizes = {
  md: 150,
  lg: 200,
};

export default function Card({ card, size = 'md' }) {
  const width = sizes[size] ?? sizes.md;

  const cardStyle = css`
    width: ${width}px;
    height: auto;
    aspect-ratio: 1/1.4;
    border-radius: ${cardRadius(width)};
  `;

  return <img css={cardStyle} src={card.image_uri} alt={card.name} />;
}
