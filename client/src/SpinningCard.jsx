import { motion } from 'framer-motion';
import { css } from '@emotion/react';
import { cardRadius } from '@mtg/shared';

const faceStyle = css`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: ${cardRadius(280)};
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export default function SpinningCard({ src, alt }) {
  return (
    <div
      css={css`
        width: 100%;
        max-width: 250px;
        aspect-ratio: 2.5 / 3.5;
        perspective: 1000px;
      `}
    >
      <motion.div
        animate={{ rotateY: 360 }}
        transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
        style={{ transformStyle: 'preserve-3d' }}
        css={css`
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        `}
      >
        <div css={faceStyle}>
          <img src={src} alt={alt} />
        </div>
        <div
          css={css`
            ${faceStyle}
            transform: rotateY(180deg);
          `}
        >
          <img src={src} alt="" aria-hidden="true" />
        </div>
      </motion.div>
    </div>
  );
}
