'use client';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  quotationId: number;
  customerName: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  quotationId,
  customerName,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      onClick={onCancel}
    >
      <div 
        className="glassmorphic-premium rounded-3xl p-8 max-w-md w-full border-2 border-red-500/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50">
            <span className="text-4xl">🗑️</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-white mb-4 text-center drop-shadow-lg">
          Delete Quotation?
        </h2>

        {/* Message */}
        <p className="text-slate-200 text-center mb-2">
          Are you sure you want to delete this quotation?
        </p>
        <p className="text-slate-300 text-sm text-center mb-6">
          <span className="font-semibold">ID: {quotationId}</span>
          {customerName && (
            <>
              <span className="mx-2">•</span>
              <span className="font-semibold">{customerName}</span>
            </>
          )}
        </p>
        <p className="text-red-300 text-center font-semibold mb-8">
          This action cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-500/50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

