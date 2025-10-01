import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup";

export interface AuthFormProps {
  mode: Mode;
  onSubmit: (values: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function AuthForm({ mode, onSubmit, isSubmitting = false, error }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ email, password, firstName: mode === "signup" ? firstName : undefined, lastName: mode === "signup" ? lastName : undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 p-6 border rounded-md shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {mode === "signup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="firstName">First name</label>
            <Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="lastName">Last name</label>
            <Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign in" : "Create account")}
      </Button>
    </form>
  );
}


