import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";
import ProRouteGuard from "@/components/ProRouteGuard";
import ProHeader from "@/components/ProHeader";
import ProFooter from "@/components/ProFooter";

export const metadata: Metadata = genMeta({
  title: "Pro Dashboard - Mestermind",
  description:
    "Manage your professional profile, jobs, messages, and more on Mestermind.",
  keywords: [
    "pro dashboard",
    "professional dashboard",
    "manage jobs",
    "service provider",
  ],
  url: "/pro",
});

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProRouteGuard>
      <div className="flex flex-col bg-gray-50 ">
        <main className="flex-1 w-full  mx-auto">
          {children}
        </main>
      </div>
    </ProRouteGuard>
  );
}
