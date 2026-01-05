"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase"
import { syncUserToDatabase } from "@/lib/hooks/useUserSync"
import { useI18n } from "@/lib/contexts/I18nContext"

const LoginPageContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const redirectTo = searchParams.get("redirect")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: true,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithEmail(formData.email, formData.password)
      
      // Sync user to database (creates if doesn't exist)
      await syncUserToDatabase({
        email: userCredential.user.email!,
        role: 'customer',
        firebaseUid: userCredential.user.uid,
      })
      
      // Redirect to intended page or home
      router.push(redirectTo || "/")
    } catch (err: any) {
      setError(err.message || t("auth.error.signInFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithGoogle()

      // Sync user to database (creates if doesn't exist)
      await syncUserToDatabase({
        email: userCredential.user.email!,
        role: 'customer',
        firebaseUid: userCredential.user.uid,
      })

      // Redirect to intended page or home
      router.push(redirectTo || "/")
    } catch (err: any) {
      setError(err.message || t("auth.error.googleSignInFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  return (
    <div className="flex-grow bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-semibold py-8 text-center">{t("auth.welcomeBack")}</h1>
      <div className="bg-gray-50">
        <div className="max-w-xl mx-auto">
          <div className="bg-white p-12 border border-gray-300 rounded-lg">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <Label htmlFor="email">{t("auth.emailAddress")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("auth.email")}
                  value={formData.email}
                  onChange={handleChange}
                  autoFocus
                  className="mt-2"
                />
              </div>

              <div className="pt-3">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Checkbox
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    label={t("auth.rememberMe")}
                  />
                </div>
                <p className="text-sm">
                  <button
                    type="button"
                    className="text-[hsl(var(--primary))] hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </p>
              </div>

              <Button type="submit" className="w-full h-12 text-base mt-4" disabled={loading}>
                {loading ? t("auth.loggingIn") : t("auth.logIn")}
              </Button>

              <div className="flex items-center uppercase text-gray-400 my-6 text-sm">
                <div className="flex-1 border-t border-gray-200 mr-4"></div>
                {t("common.or")}
                <div className="flex-1 border-t border-gray-200 ml-4"></div>
              </div>

              <p className="text-sm my-6 text-center text-gray-600">
                {t("auth.agreeTermsSocialLogin")}{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener"
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  {t("auth.termsOfUse")}
                </Link>{" "}
                {t("common.and")}{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener"
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  {t("auth.privacyPolicy")}
                </Link>
                . {t("auth.weKeepLoggedIn")}
              </p>

              <div className="space-y-3">
                {/*<button
                  type="button"
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-base font-medium cursor-pointer transition-colors hover:bg-gray-50"
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
                  Continue with Facebook
                </button>*/}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
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
                  {t("auth.continueWithGoogle")}
                </button>

                {/*<button
                  type="button"
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-base font-medium cursor-pointer transition-colors hover:bg-gray-50"
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
                      d="M20.484 14.643a5.513 5.513 0 012.625-4.626 5.642 5.642 0 00-4.446-2.403c-1.87-.197-3.684 1.119-4.637 1.119-.972 0-2.44-1.1-4.02-1.067a5.921 5.921 0 00-4.983 3.038c-2.154 3.73-.547 9.212 1.516 12.227 1.033 1.477 2.24 3.126 3.819 3.067 1.545-.064 2.122-.985 3.987-.985 1.848 0 2.39.985 4 .948 1.658-.027 2.703-1.483 3.7-2.973a12.213 12.213 0 001.69-3.445 5.326 5.326 0 01-3.251-4.9z"
                      fill="#000"
                    />
                    <path
                      d="M17.44 5.888A5.428 5.428 0 0018.683 2a5.522 5.522 0 00-3.573 1.849 5.164 5.164 0 00-1.274 3.744 4.566 4.566 0 003.606-1.705z"
                      fill="#000"
                    />
                  </svg>
                  Continue with Apple
                </button>*/}
              </div>
            </form>
          </div>
        </div>
      </div>

      <p className="py-24 text-center">
        {t("auth.dontHaveAccount")}{" "}
        <Link
          href="/register"
          className="text-[hsl(var(--primary))] hover:underline"
        >
          {t("nav.signUp")}.
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
