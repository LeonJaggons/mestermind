"use client";

import Link from "next/link";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function ProFooter() {
  const { t } = useI18n();
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Logo and copyright */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M0 11.9999C0 18.6273 5.37268 24 11.9999 24C18.6273 24 24 18.6273 24 11.9999C24 5.37254 18.6273 0 11.9999 0C5.37268 0 0 5.37254 0 11.9999Z" fill="#D3D4D5"></path>
                <path fillRule="evenodd" clipRule="evenodd" d="M17.8632 9.03677H6.13623V6.36826H17.8632V9.03677ZM12.599 19.5422C13.1409 18.6024 13.4261 17.5364 13.4261 16.4515V10.1591C12.3385 10.1591 11.2817 10.5078 10.5737 11.4927V16.4515C10.5737 17.5364 10.859 18.6024 11.4009 19.5422L11.9999 20.5812L12.599 19.5422Z" fill="white"></path>
              </svg>
              <span className="text-sm">{t("footer.copyright")}</span>
            </Link>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* First row of links */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="https://help.thumbtack.com" className="text-gray-600 hover:text-gray-900">
                {t("footer.help")}
              </Link>
              <Link href="/privacy/" className="text-gray-600 hover:text-gray-900">
                {t("footer.privacy")}
              </Link>
              <Link href="/terms/" className="text-gray-600 hover:text-gray-900">
                {t("footer.termsOfUse")}
              </Link>
            </div>

            {/* Second row of links */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/syndication-opt-out" className="text-gray-600 hover:text-gray-900">
                {t("footer.doNotSell")}
              </Link>
              <Link href="/privacy/#supplemental-privacy-notice-for-california-residents" className="text-gray-600 hover:text-gray-900">
                {t("footer.caNotice")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
