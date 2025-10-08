import "@/styles/globals.css";
import type { AppProps } from "next/app";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/800.css";
import "@fontsource/outfit/900.css";
import "@fontsource/open-sans/300.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/500.css";
import "@fontsource/open-sans/600.css";
import "@fontsource/open-sans/700.css";
import "@fontsource/open-sans/800.css";
import Header from "@/components/Header";
import { useRouter } from "next/router";
import { Toaster } from "sonner";

// @ts-expect-error - AppProps type issue
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const isAdmin = pathname === "/admin";
  return (
    <div className="font-sans">
      {!isAdmin && <Header />}
      <Component {...pageProps} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
