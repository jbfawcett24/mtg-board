import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { colors, radius, spacing } from '@mtg/shared';
import Button from '@mtg/shared/src/Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Sizes are now MAX widths. The modal is only as wide/tall as its content needs,
// up to these limits, and never larger than the viewport.
const maxWidths = { sm: '400px', md: '560px', lg: '800px', xl: '1100px' };

const overlayStyle = css`
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  padding: ${spacing.md};
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const dialogStyle = (size, fullHeight) => css`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: ${maxWidths[size] ?? maxWidths.md};
  max-height: 100%;
  ${fullHeight ? 'height: 100%;' : ''}
  background-color: ${colors.bgSurface};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.border};
  border-radius: ${radius.lg};
  overflow: hidden;
  outline: none; /* the container is focused programmatically, not by the user */
`;

const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${spacing.md};
  padding: ${spacing.md};
  flex: 0 0 auto;
`;

const titleStyle = css`
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
`;

// Only this region scrolls, so the header and actions stay visible.
const bodyStyle = css`
  flex: 1 1 auto;
  min-height: 0;
  padding: ${spacing.md};
  overflow-y: auto;
`;

const footerStyle = css`
  display: flex;
  justify-content: flex-end;
  gap: ${spacing.sm};
  padding: ${spacing.md};
  flex: 0 0 auto;
`;

const overlayVariants = (reduce) => ({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: reduce ? 0 : 0.2 } },
  exit: { opacity: 0, transition: { duration: reduce ? 0 : 0.15 } },
});

const dialogVariants = (reduce) => ({
  hidden: { opacity: 0, y: reduce ? 0 : -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: reduce ? { duration: 0 } : { type: 'spring', bounce: 0.25, duration: 0.25 },
  },
  exit: { opacity: 0, y: reduce ? 0 : -30, transition: { duration: reduce ? 0 : 0.15 } },
});

/**
 * Props
 * - title:          visible heading; labels the dialog for screen readers
 * - ariaLabel:      use instead of `title` when there is no visible heading
 * - actions:        node rendered in a pinned footer (e.g. Cancel / Confirm buttons)
 * - alert:          true for confirmations/warnings: role="alertdialog" and the body
 *                   is announced as the description
 * - fullHeight:     true for content-heavy modals that should fill the viewport height
 * - closeOnBackdrop: click outside to close (default true)
 * - Add data-autofocus to an element inside to choose what gets focus on open
 *   (for destructive confirmations, put it on the Cancel button).
 */
export default function ModalPopup({
  children,
  onClose,
  isOpen,
  size = 'md',
  title = '',
  ariaLabel,
  actions,
  alert = false,
  fullHeight = false,
  closeOnBackdrop = true,
}) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Focus management + scroll lock. Depends only on isOpen so a parent
  // re-render can't yank focus back to the dialog.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    (dialog?.querySelector('[data-autofocus]') ?? dialog)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // Keep Tab / Shift+Tab inside the dialog
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    const items = [...dialog.querySelectorAll(FOCUSABLE)];
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // mousedown (not click) so dragging a text selection out of the dialog doesn't close it
  const handleOverlayMouseDown = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          css={overlayStyle}
          variants={overlayVariants(reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={handleOverlayMouseDown}
        >
          <motion.div
            ref={dialogRef}
            css={dialogStyle(size, fullHeight)}
            role={alert ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel}
            aria-describedby={alert ? bodyId : undefined}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            variants={dialogVariants(reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div css={headerStyle}>
              {title ? <h2 id={titleId} css={titleStyle}>{title}</h2> : <span />}
              <Button variant="secondary" size="xs" onClick={onClose}>
                Close
              </Button>
            </div>

            <div id={bodyId} css={bodyStyle}>
              {children}
            </div>

            {actions && <div css={footerStyle}>{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Usage:
//
// Confirmation (short, sizes to its content):
// <ModalPopup isOpen={open} onClose={close} size="sm" title="Delete deck?" alert
//   actions={<>
//     <Button variant="secondary" data-autofocus onClick={close}>Cancel</Button>
//     <Button danger onClick={confirmDelete}>Delete</Button>
//   </>}>
//   This will permanently delete "Mono Red Burn". This can't be undone.
// </ModalPopup>
//
// Content-heavy (fills the viewport height, body scrolls):
// <ModalPopup isOpen={open} onClose={close} size="xl" title="Card search" fullHeight>
//   ...
// </ModalPopup>
