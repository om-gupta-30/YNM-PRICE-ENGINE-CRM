'use client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (activity: any) => void;
}

export default function ActivityCreationModal({ isOpen, onClose, onCreated }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glassmorphic-premium rounded-3xl border border-white/10 p-6 w-full max-w-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Add Activity</p>
            <h3 className="text-2xl font-bold text-white">Modal placeholder</h3>
            <p className="text-slate-300 text-sm">
              In Step 5 we will add all the smart baby fields.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <button
          onClick={() => onCreated({})}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-premium-gold to-dark-gold text-white font-semibold shadow-lg hover:shadow-premium-gold/50 transition"
        >
          Pretend to Add Activity
        </button>
      </div>
    </div>
  );
}
