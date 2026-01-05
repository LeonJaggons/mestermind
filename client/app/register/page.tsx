"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { signUpWithEmail, signInWithGoogle } from "@/lib/firebase"
import { syncUserToDatabase } from "@/lib/hooks/useUserSync"
import { useI18n } from "@/lib/contexts/I18nContext"

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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

    // Validate password
    if (formData.password.length < 8 || formData.password.length > 72) {
      setError(t("auth.error.passwordLength"))
      setLoading(false)
      return
    }

    if (
      formData.password.toLowerCase().includes(formData.email.toLowerCase()) ||
      formData.password.toLowerCase().includes(formData.firstName.toLowerCase()) ||
      formData.password.toLowerCase().includes(formData.lastName.toLowerCase())
    ) {
      setError(t("auth.error.passwordContainsName"))
      setLoading(false)
      return
    }

    try {
      const displayName = `${formData.firstName} ${formData.lastName}`.trim()
      const userCredential = await signUpWithEmail(formData.email, formData.password, displayName)

      // Sync user to database
      await syncUserToDatabase({
        email: userCredential.user.email!,
        role: 'customer',
        firebaseUid: userCredential.user.uid,
      })

      router.push("/")
    } catch (err: any) {
      setError(err.message || t("auth.error.createAccountFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithGoogle()

      // Sync user to database
      await syncUserToDatabase({
        email: userCredential.user.email!,
        role: 'customer',
        firebaseUid: userCredential.user.uid,
      })

      router.push("/")
    } catch (err: any) {
      setError(err.message || t("auth.error.googleSignUpFailed"))
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
    <div className="bg-gray-50 min-h-screen pt-8">
      <div className="max-w-xl mx-auto pb-24 px-4">
        <h1 className="text-4xl font-semibold leading-tight mb-8 text-center">
          {t("auth.createYourAccount")}
        </h1>
        <div className="bg-white rounded-lg shadow-sm p-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <ol className="list-none p-0 m-0">
              <li className="mb-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="mt-2"
                    />
                  </div>
                </div>
              </li>

              <li className="mb-6">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-2"
                />
              </li>

              <li className="mb-6">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2"
                />
                <div className="text-gray-600 mt-3">
                  <p className="text-sm mt-2 mb-1">
                    {t("auth.passwordRequirements")}
                  </p>
                  <ul className="list-disc pl-6 text-sm">
                    <li className="mb-1">{t("auth.passwordLength")}</li>
                    <li className="mb-1">{t("auth.passwordNoNameEmail")}</li>
                    <li className="mb-1">
                      {t("auth.passwordNotCommon")}
                    </li>
                  </ul>
                </div>
              </li>

              <li className="mb-6">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <p>
                    {t("auth.agreeTerms")}{" "}
                    <Link href="/terms" target="_blank" className="underline">
                      {t("auth.termsOfUse")}
                    </Link>{" "}
                    {t("common.and")}{" "}
                    <Link href="/privacy" target="_blank" className="underline">
                      {t("auth.privacyPolicy")}
                    </Link>
                    .
                  </p>
                </div>
              </li>

              <li className="m-0">
                <Checkbox
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  label={t("auth.rememberMe")}
                />
              </li>

              <li className="mt-0">
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
              </li>
            </ol>

            <div className="flex items-center uppercase text-gray-400 my-6 text-sm">
              <div className="flex-1 border-t border-gray-200 mr-4"></div>
              {t("common.or")}
              <div className="flex-1 border-t border-gray-200 ml-4"></div>
            </div>

            <div className="text-sm text-gray-600 leading-relaxed mb-4">
              <p>
                {t("auth.agreeTermsSocial")}{" "}
                <Link href="/terms" target="_blank" className="underline">
                  {t("auth.termsOfUse")}
                </Link>{" "}
                {t("common.and")}{" "}
                <Link href="/privacy" target="_blank" className="underline">
                  {t("auth.privacyPolicy")}
                </Link>
                . {t("auth.weKeepLoggedIn")}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
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
                Sign up with Facebook
              </button>*/}

              <button
                type="button"
                onClick={handleGoogleSignUp}
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
                {t("auth.signUpWithGoogle")}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center mt-6 text-sm">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-[hsl(var(--primary))] no-underline hover:underline">
            {t("nav.logIn")}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
