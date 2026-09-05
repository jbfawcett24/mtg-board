import { useEffect } from 'react';
import { css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, radius, spacing } from '@mtg/shared';

const bgStyle = css`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`

const sizeMap = {
  sm: { width: '30%', height: '40%' },
  md: { width: '60%', height: '60%' },
  lg: { width: '80%', height: '80%' },
  xl: { width: '95%', height: '95%' },
}

const modalStyle = (size) => css`
    background-color: ${colors.bgSurface};
    width: ${sizeMap[size].width};
    height: ${sizeMap[size].height};
    border-radius: ${radius.lg};
    display: grid;
    grid-template-rows: auto 1fr;
`

const closeButtonStyle = css`
    justify-self: end;
    margin: ${spacing.sm};
    padding: ${spacing.sm};
    background-color: ${colors.accent};
    border-radius: ${radius.sm};
    border: none;
    color: ${colors.textPrimary};
    cursor: pointer;
    &:hover {
        background-color: ${colors.accentHover};
    }
`

const bgVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, when: 'beforeChildren' } },
  exit: { opacity: 0, transition: { duration: 0.2, when: 'afterChildren' } }
}

const modalVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3, duration: 0.2 } },
  exit: { opacity: 0, y: -50, transition: { duration: 0.2 } }
}

export default function ModalPopup({ children, onClose, isOpen, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && <motion.div
        css={bgStyle}
        variants={bgVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => { onClose() }}
      >
        <motion.div
          css={modalStyle(size)}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { onClose() }} css={closeButtonStyle}>Close</button>
          {children}
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  )
}
