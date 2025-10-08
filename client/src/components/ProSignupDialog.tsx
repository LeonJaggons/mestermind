import { useState } from "react";
import AuthForm from "@/components/AuthForm";
import { signupWithEmail } from "@/lib/auth";
import { createUserRecord } from "@/lib/api";

export default function ProSignupDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-md shadow-lg w-[92%] max-w-md mx-auto">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Create your pro account</h2>
            <p className="text-sm text-gray-600">Sign up to save your onboarding and start getting leads.</p>
          </div>
          <AuthForm
            mode="signup"
            isSubmitting={submitting}
            error={error}
            onSubmit={async ({ email, password, firstName, lastName }) => {
              setError(null);
              setSubmitting(true);
              try {
                const displayName = [firstName, lastName].filter(Boolean).join(" ");
                const user = await signupWithEmail({ email, password, displayName });
                void createUserRecord({
                  email,
                  first_name: firstName || "",
                  last_name: lastName || "",
                  firebase_uid: user.uid,
                });
                onSuccess();
              } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : "Signup failed";
                setError(errorMessage);
              } finally {
                setSubmitting(false);
              }
            }}
          />
          <button onClick={onClose} className="text-sm text-gray-600 underline">Maybe later</button>
        </div>
      </div>
    </div>
  );
}


