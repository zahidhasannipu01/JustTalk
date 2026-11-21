'use client';
import { createPortal } from 'react-dom';

// Every modal in the app renders through this portal, attached directly to
// <body>. A position:fixed element is positioned relative to any ancestor
// that has a transform, filter or similar — being a direct child of <body>
// makes that impossible, so the dim layer always covers the whole screen and
// the card is always centred, whatever the page around it is doing.
export default function Overlay({ label, children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="overlay open" role="dialog" aria-modal="true" aria-label={label}>{children}</div>,
    document.body
  );
}
