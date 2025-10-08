import { useState } from "react";
import AuthForm from "@/components/AuthForm";
import { loginWithEmailAndPassword } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/router";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithEmailAndPassword(email, password);

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
      const errorMessage = e instanceof Error ? e.message : "Failed to sign in";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <AuthForm
          mode="login"
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          error={error}
        />
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
