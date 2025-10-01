import "@/styles/globals.css";
import type { AppProps } from "next/app";
import "@fontsource/zalando-sans/400.css";
import "@fontsource/zalando-sans/500.css";
import "@fontsource/zalando-sans/700.css";
import Header from "@/components/Header";
import { useRouter } from "next/router";

// @ts-ignore
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const isAdmin = pathname === "/admin";
  return (
    <div className="font-sans">
      {!isAdmin && <Header />}
      <Component {...pageProps} />
    </div>
  );
}
