import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

/** Back-to-menu button for overlay headers. */
export function OverlayBack({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Natrag na izbornik"
      title="Natrag na izbornik"
      className="grid size-10 shrink-0 place-items-center rounded-md bg-paper text-ink transition active:scale-90"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}

/** Shared modal shell: dimmed backdrop + bottom sheet on mobile, centred card on desktop. */
export default function Overlay({ children, size = 'lg' }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`flex max-h-[92dvh] w-full ${size === 'sm' ? 'max-w-md' : 'max-w-2xl'} flex-col overflow-hidden rounded-t-xl bg-surface shadow-2xl sm:rounded-xl`}
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
