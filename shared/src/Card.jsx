import { css } from '@emotion/react';
import { radius } from './theme';

const cardStyle = css`
    width: 150px;
    height: auto;
    aspect-ratio: 1/1.4;
    border-radius: ${radius.card};
    `

export function Card({card}) {
    return (
        <img css={cardStyle} src={card.image_uri} alt={card.name} />
    )
}