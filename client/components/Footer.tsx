"use client";

import Link from "next/link";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function Footer() {
  const { t } = useI18n();
  
  return (
    <div className="bg-white">
      <div className="mx-auto ">
        <div className={"border-t  border-gray-300 flex justify-center"}>

        <div className="md:flex md:gap-8 lg:gap-12 max-w-6xl  pt-5 md:pt-6">
          {/* Mestermind Section */}
          <div className="border-t border-gray-300 md:border-none mb-4 md:mb-6 flex-1">
            <div className="pt-3 md:pt-0 flex justify-between">
              <div className="font-bold text-black">
                <div>Mestermind</div>
                <div>{t("footer.tagline")}</div>
              </div>
              <div className="flex items-center md:hidden">
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.646 6.764L9 13 3.311 6.725a1 1 0 011.342-1.482L9 10l4.285-4.699c.2-.187.435-.301.715-.301a1 1 0 011 1c0 .306-.151.537-.354.764z"></path>
                </svg>
              </div>
            </div>
            <ul className="mb-3 mt-2 md:mt-3" style={{ fontSize: '13px' }}>
              <li className="mb-1">
                <Link href="/about" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.about")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/partner" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.partner")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/careers" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.careers")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/press" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.press")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/blog" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.blog")}
                </Link>
              </li>
              <li className="flex mt-3">
                <div className="mr-2">
                  <a href="https://www.instagram.com/mestermind" target="_blank" rel="noopener noreferrer" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                    <svg aria-label="Instagram" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.908 1A3.096 3.096 0 0117 4.092v9.816a3.095 3.095 0 01-3.092 3.09H4.092A3.094 3.094 0 011 13.909V4.092A3.095 3.095 0 014.092 1h9.816zM5.215 7.549H2.94v5.963c0 .77.654 1.395 1.459 1.395h9.346c.804 0 1.459-.626 1.459-1.395V7.55H12.93c.197.462.308.966.308 1.495 0 2.195-1.868 3.982-4.165 3.982-2.297 0-4.164-1.787-4.164-3.982 0-.53.11-1.033.306-1.495zm3.857-1.226c-.818 0-1.542.405-1.988 1.022a2.435 2.435 0 00-.464 1.43c0 1.353 1.1 2.453 2.452 2.453 1.353 0 2.454-1.1 2.454-2.452 0-.534-.174-1.028-.465-1.43a2.45 2.45 0 00-1.989-1.023zm6.133-3.68l-.32.002-2.133.007.008 2.444 2.445-.008V2.644z"></path>
                    </svg>
                  </a>
                </div>
                <div className="mr-2">
                  <a href="https://www.twitter.com/mestermind" target="_blank" rel="noopener noreferrer" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                    <svg aria-label="Twitter" height="18" width="18" fill="none" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.412 7.84l5.526-6.419h-1.31L9.83 6.994 5.998 1.421h-4.42l5.795 8.427-5.794 6.73h1.31l5.066-5.884 4.047 5.885h4.42l-6.01-8.74zM8.62 9.922l-.588-.84L3.36 2.406H5.37l3.77 5.389.587.84 4.9 7.004h-2.01l-4-5.716z" fill="currentColor"></path>
                    </svg>
                  </a>
                </div>
                <div className="mr-2">
                  <a href="https://www.facebook.com/mestermind" target="_blank" rel="noopener noreferrer" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                    <svg aria-label="Facebook" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 7h3v3h-3v7H8v-7H5V7h3V5.745c0-1.189.374-2.691 1.118-3.512C9.862 1.41 10.791 1 11.904 1H14v3h-2.1c-.498 0-.9.402-.9.899V7z"></path>
                    </svg>
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Customers Section */}
          <div className="border-t border-gray-300 md:border-none mb-4 md:mb-6 flex-1">
            <div className="pt-3 md:pt-0 flex justify-between">
              <div className="font-bold text-black">
                <div>{t("footer.customers")}</div>
              </div>
              <div className="flex items-center md:hidden">
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.646 6.764L9 13 3.311 6.725a1 1 0 011.342-1.482L9 10l4.285-4.699c.2-.187.435-.301.715-.301a1 1 0 011 1c0 .306-.151.537-.354.764z"></path>
                </svg>
              </div>
            </div>
            <ul className="mb-3 mt-2 md:mt-3" style={{ fontSize: '13px' }}>
              <li className="mb-1">
                <Link href="/how-it-works" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.howItWorks")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/register" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.signUp")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/app" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.getApp")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/near-me" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.servicesNearMe")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/prices" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.costEstimates")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/resources" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.homeResourceCenter")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Pros Section */}
          <div className="border-t border-gray-300 md:border-none mb-4 md:mb-6 flex-1">
            <div className="pt-3 md:pt-0 flex justify-between">
              <div className="font-bold text-black">
                <div>{t("footer.pros")}</div>
              </div>
              <div className="flex items-center md:hidden">
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.646 6.764L9 13 3.311 6.725a1 1 0 011.342-1.482L9 10l4.285-4.699c.2-.187.435-.301.715-.301a1 1 0 011 1c0 .306-.151.537-.354.764z"></path>
                </svg>
              </div>
            </div>
            <ul className="mb-3 mt-2 md:mt-3" style={{ fontSize: '13px' }}>
              <li className="mb-1">
                <Link href="/become-a-pro/how-it-works" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.mestermindForPros")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/become-a-pro" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.signUpAsPro")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/community" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.community")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/become-a-pro/resources" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.proResources")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/reviews" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.proReviews")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/pro-app" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.iphoneAppForPros")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/pro-app" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.androidAppForPros")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div className="border-t border-gray-300 md:border-none mb-4 md:mb-6 flex-1">
            <div className="pt-3 md:pt-0 flex justify-between">
              <div className="font-bold text-black">
                <div>{t("footer.support")}</div>
              </div>
              <div className="flex items-center md:hidden">
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.646 6.764L9 13 3.311 6.725a1 1 0 011.342-1.482L9 10l4.285-4.699c.2-.187.435-.301.715-.301a1 1 0 011 1c0 .306-.151.537-.354.764z"></path>
                </svg>
              </div>
            </div>
            <ul className="mb-3 mt-2 md:mt-3" style={{ fontSize: '13px' }}>
              <li className="mb-1">
                <Link href="/help" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.help")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/safety" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.safety")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/terms" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.termsOfUse")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/privacy" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/privacy#california" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.caNotice")}
                </Link>
              </li>
              <li className="mb-1">
                <Link href="/opt-out" className="text-[rgb(103,109,115)] hover:text-[hsl(var(--primary))] transition-colors">
                  {t("footer.doNotSell")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-300 flex justify-center">

        <div className="md:flex justify-between py-3 my-4 w-5xl">
          <Link href="/" className="flex items-center mb-2 md:mb-0 text-gray-500 hover:text-black transition-colors">
            <div className="text-gray-500 mr-2 flex">
              <svg role="img" aria-label="logo" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <g fillRule="evenodd">
                  <circle cx="12" cy="12" r="11.971" />
                  <path fill="#FFF" d="M12 6c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10.5c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5zm0-7.5c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"></path>
                </g>
              </svg>
            </div>
            <div>{t("footer.copyright")}</div>
          </Link>
          <Link href="/guarantee" className="flex items-center text-gray-500 hover:text-black transition-colors">
            <div className="mr-2">
              <svg width="19" height="24" viewBox="0 0 19 24" fill="none" aria-hidden="true">
                <path d="M18.436 3.115L9.8.046a.987.987 0 0 0-.595 0L.567 3.115A.863.863 0 0 0 0 3.909v9.769c0 2.288 1.332 4.174 3.068 5.783 1.737 1.607 3.922 3.003 5.928 4.388a.912.912 0 0 0 1.007 0c2.01-1.385 4.194-2.78 5.93-4.388C17.67 17.854 19 15.966 19 13.678V3.909a.854.854 0 0 0-.564-.794zM10.65 14.577c0 .846-.23 1.677-.665 2.41l-.483.81-.482-.81a4.714 4.714 0 0 1-.665-2.41v-3.868c.569-.767 1.419-1.04 2.295-1.04v4.908zm3.568-5.783H4.784V6.712h9.434v2.082z" fill="#009fd9"></path>
              </svg>
            </div>
            <div>
              <span className="font-bold">{t("footer.guarantee")}</span>
            </div>
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
