"use client";

import Link from "next/link";
import { ReactNode } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex justify-between bg-white h-16 border-b border-gray-300">
        <div className="flex flex-grow">
          <div className="flex h-full">
            <Link className="flex items-center px-6" href="/" aria-label="Mestermind Home">
              <p className="tracking-tight text-xl font-bold">Mestermind</p>
            </Link>
          </div>
          <div className="hidden md:flex items-center px-6 border-l border-gray-300 text-gray-500">
            Build a winning business profile
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}
