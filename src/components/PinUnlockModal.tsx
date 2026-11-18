import { useEffect, useState, type FormEvent } from 'react';
import { Lock, X } from 'lucide-react';

interface PinUnlockModalProps {
  isOpen: boolean;
  expectedPin: string;
  onClose: () => void;
  onUnlocked: () => void;
}

export function PinUnlockModal({
  isOpen,
  expectedPin,
  onClose,
  onUnlocked,
}: PinUnlockModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === expectedPin.trim()) {
      setError('');
      onUnlocked();
    } else {
      setError('Incorrect PIN. Check your Owner PIN and try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="pin-modal-title"
                className="font-display text-base font-bold text-zinc-950"
              >
                Unlock Store Editor
              </h2>
              <p className="text-xs text-zinc-500">
                Edit products, prices, and site text
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
            aria-label="Close unlock dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="owner-pin-input"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Owner PIN
            </label>
            <input
              id="owner-pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              className="w-full h-11 px-3.5 text-sm font-mono rounded-lg border border-zinc-300 bg-white text-zinc-950"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-10 rounded-lg bg-zinc-950 hover:bg-red-600 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Unlock Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
