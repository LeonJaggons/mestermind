import { useState } from "react";
import AuthForm from "@/components/AuthForm";
import { signupWithEmail } from "@/lib/auth";
import { createUserRecord } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/router";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async ({
    email,
    password,
    firstName,
    lastName,
  }: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    setError(null);
    setSubmitting(true);
    try {
      const displayName = [firstName, lastName].filter(Boolean).join(" ");
      const user = await signupWithEmail({ email, password, displayName });
      // Best effort: create user record in backend
      void createUserRecord({
        email,
        first_name: firstName || "",
        last_name: lastName || "",
        firebase_uid: user.uid,
      });

      // Check if there's a return URL in sessionStorage
      const returnUrl =
        typeof window !== "undefined"
          ? sessionStorage.getItem("returnUrl")
          : null;
      if (returnUrl) {
        sessionStorage.removeItem("returnUrl");
        router.push(returnUrl);
      } else {
        router.push("/");
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6 sm:py-10">
      <div className="mx-auto max-w-md space-y-4 px-4 sm:px-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Create your account</h1>
        <AuthForm
          mode="signup"
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          error={error}
        />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
