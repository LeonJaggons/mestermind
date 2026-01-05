"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from "@/lib/firebase";
import { syncUserToDatabase } from "@/lib/hooks/useUserSync";
import { API_BASE_URL } from "@/lib/api/config";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Validate password
        if (formData.password.length < 8 || formData.password.length > 72) {
          setError("Password must be between 8 and 72 characters");
          setLoading(false);
          return;
        }

        if (
          formData.password.toLowerCase().includes(formData.email.toLowerCase()) ||
          formData.password.toLowerCase().includes(formData.firstName.toLowerCase()) ||
          formData.password.toLowerCase().includes(formData.lastName.toLowerCase())
        ) {
          setError("Password cannot contain your name or email");
          setLoading(false);
          return;
        }

        const displayName = `${formData.firstName} ${formData.lastName}`.trim();
        const userCredential = await signUpWithEmail(formData.email, formData.password, displayName);
        
        await syncUserToDatabase({
          email: userCredential.user.email!,
          role: 'mester',
          firebaseUid: userCredential.user.uid,
        });

        // Create placeholder pro_profile
        try {
          await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userCredential.user.uid}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
        } catch (err) {
          console.error('Failed to create pro profile:', err);
        }
      } else {
        await signInWithEmail(formData.email, formData.password);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === "signup" ? "sign up" : "log in"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithGoogle();
      await syncUserToDatabase({
        email: userCredential.user.email!,
        role: 'mester',
        firebaseUid: userCredential.user.uid,
      });

      // Create placeholder pro_profile
      try {
        await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userCredential.user.uid}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      } catch (err) {
        console.error('Failed to create pro profile:', err);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 bg-white">
        <DialogHeader className="p-6 pb-3">
          <div className="flex justify-center mb-2">
            <svg
              className="text-black"
              width="36"
              height="36"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0"></path>
              <path
                fill="#FFF"
                d="M8.973 10.385a3.71 3.71 0 0 1-.564 1.957L8 13l-.409-.658a3.704 3.704 0 0 1-.564-1.957v-3.14C7.51 6.62 8.231 6.4 8.973 6.4v3.985zM4 5.69V4h8v1.69H4z"
              ></path>
            </svg>
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            New customers are waiting.
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            There are <span className="font-bold">30,000+</span> leads on Mestermind a day.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth}>
            {mode === "signup" && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    name="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="h-12"
                    required
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    name="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="h-12"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    height="18"
                    width="18"
                    fill="currentColor"
                    viewBox="0 0 18 18"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M3 14V8.59l4.514 2.084a3.541 3.541 0 002.972 0L15 8.59l.001 5.41H3zM3 4h12v2.387l-5.352 2.47c-.412.19-.884.19-1.295 0L3 6.387V4zm12-2H3c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h12c1.104 0 2-.897 2-2V4c0-1.103-.896-2-2-2z"></path>
                  </svg>
                </div>
                <Input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 h-12"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <Input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="h-12"
                required
              />
            </div>

            {mode === "signup" && (
              <div className="mb-4 text-gray-600 text-xs">
                <p className="mb-2">Your password must:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>be 8 to 72 characters long</li>
                  <li>not contain your name or email</li>
                  <li>not be commonly used or easily guessed</li>
                </ul>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
            >
              {loading
                ? mode === "signup"
                  ? "Signing up..."
                  : "Logging in..."
                : mode === "signup"
                ? "Sign up with email"
                : "Log in with email"}
            </Button>

            <p className="text-xs text-gray-600 mt-2 text-center">
              By signing up with email, Facebook, or Google, you agree to our{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-[hsl(var(--primary))] hover:underline"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-[hsl(var(--primary))] hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 uppercase">OR</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-base font-medium cursor-pointer transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-7 h-7"
                height="28"
                width="28"
                fill="none"
                viewBox="0 0 28 28"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M25.52 14.272c0-.85-.076-1.669-.218-2.454H14v4.641h6.458a5.52 5.52 0 01-2.394 3.622v3.011h3.878c2.269-2.089 3.578-5.165 3.578-8.82z"
                  fill="#4285F4"
                  fillRule="evenodd"
                />
                <path
                  d="M14 26.001c3.24 0 5.956-1.074 7.942-2.907l-3.879-3.01c-1.074.72-2.449 1.145-4.063 1.145-3.126 0-5.771-2.111-6.715-4.948H3.276v3.11A11.995 11.995 0 0014 26z"
                  fill="#34A853"
                  fillRule="evenodd"
                />
                <path
                  d="M7.285 16.281a7.213 7.213 0 01-.376-2.28c0-.79.136-1.56.376-2.28V8.612H3.276A11.996 11.996 0 002 14.002c0 1.935.464 3.768 1.276 5.388l4.01-3.109z"
                  fill="#FBBC05"
                  fillRule="evenodd"
                />
                <path
                  d="M14 6.773c1.761 0 3.343.605 4.587 1.794l3.442-3.442C19.95 3.19 17.234 2 13.999 2 9.31 2 5.252 4.69 3.277 8.61l4.01 3.11C8.228 8.884 10.873 6.773 14 6.773z"
                  fill="#EA4335"
                  fillRule="evenodd"
                />
              </svg>
              {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
            </button>

            {/*<button
              type="button"
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-base font-medium cursor-pointer transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-7 h-7"
                height="28"
                width="28"
                fill="none"
                viewBox="0 0 28 28"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M26 14.073C26 7.406 20.627 2 14 2S2 7.406 2 14.073C2 20.098 6.388 25.093 12.125 26v-8.436H9.077v-3.491h3.048v-2.66c0-3.026 1.792-4.698 4.533-4.698 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.49 0-1.956.931-1.956 1.887v2.265h3.328l-.532 3.49h-2.796V26C21.612 25.095 26 20.1 26 14.073z"
                  fill="#1977F3"
                />
              </svg>
              {mode === "signup" ? "Sign up with Facebook" : "Continue with Facebook"}
            </button>*/}
          </div>

          <p className="text-sm text-center mt-4 text-gray-600">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-bold text-[hsl(var(--primary))] hover:underline bg-transparent border-0 cursor-pointer"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-bold text-[hsl(var(--primary))] hover:underline bg-transparent border-0 cursor-pointer"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
