import { useEffect, useState, type FormEvent } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { CheckCircle2, Lock, LogOut, X } from 'lucide-react';
import { ADMIN_EMAIL, auth, googleProvider } from '../firebase';

interface PinUnlockModalProps {
  isOpen: boolean;
  expectedPin: string;
  currentUser: User | null;
  onClose: () => void;
  onUnlocked: () => void;
}

export function PinUnlockModal({
  isOpen,
  expectedPin,
  currentUser,
  onClose,
  onUnlocked,
}: PinUnlockModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isVerifiedAdmin =
    Boolean(currentUser) &&
    currentUser?.emailVerified === true &&
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleGoogleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (
        result.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
        !result.user.emailVerified
      ) {
        setError(
          `Signed in as ${result.user.email || 'unknown'}, which is not the Store Owner account (${ADMIN_EMAIL}).`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in failed. Please try again.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setError('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isVerifiedAdmin) {
      setError(
        `Please sign in with the Store Owner Google account (${ADMIN_EMAIL}) so edits sync live to all visitors.`
      );
      return;
    }
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
                Live edits publish for all customers
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

        {/* Step 1: Google Owner Auth */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5">
          <p className="text-xs font-semibold text-zinc-900">
            1. Owner Cloud Account
          </p>
          {isVerifiedAdmin ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{currentUser?.email}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled={signingIn}
                onClick={handleGoogleSignIn}
                className="w-full h-10 px-4 rounded-lg bg-zinc-950 hover:bg-red-600 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {signingIn
                  ? 'Signing in...'
                  : 'Sign in with Google (Owner)'}
              </button>
              {currentUser && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[11px] text-zinc-500 hover:underline cursor-pointer"
                >
                  Signed in as {currentUser.email} — Sign out
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Owner PIN */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="owner-pin-input"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              2. Owner PIN
            </label>
            <input
              id="owner-pin-input"
              type="password"
              inputMode="numeric"
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
              className="px-5 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Unlock Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
