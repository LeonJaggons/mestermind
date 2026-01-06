"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/AuthContext";
import { logOut } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ServicesDropdown } from "./ServicesDropdown";
import NotificationDropdown from "./NotificationDropdown";
import LanguageChooser from "./LanguageChooser";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";
import { ChevronDown, Menu, X } from "lucide-react";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      try {
        // Get user ID from backend
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const countResponse = await fetch(`${API_BASE_URL}/api/v1/messages/unread-count/${userData.id}`);
          if (countResponse.ok) {
            const data = await countResponse.json();
            setUnreadCount(data.unread_count || 0);
          }
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="bg-white border-b border-[rgb(233,236,237)] sticky top-0 z-50">
      <div className="flex items-stretch h-16 px-4">
        {/* Mobile Menu Button */}
        <div className="flex flex-1 md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center pl-3 border-none bg-transparent"
          >
            <p className="tracking-tight text-xl font-bold">Mestermind</p>
            <ChevronDown className="ml-1 text-gray-500" size={18} />
          </button>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="absolute left-0 top-16 w-full bg-white border-b border-gray-300 shadow-lg z-40">
              <div className="flex flex-col overflow-y-auto pb-8">
                <div className="space-y-1 px-4 py-2">
                  <ServicesDropdown>
                    <button
                      className="w-full text-left py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                      tabIndex={0}
                    >
                      {t("nav.exploreServices")}
                    </button>
                  </ServicesDropdown>
                  {user && (
                    <>
                      <Link
                        href="/customer/messages"
                        className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          {t("nav.messages")}
                          {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </Link>
                      <Link
                        href="/customer/appointments"
                        className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("nav.appointments")}
                      </Link>
                    </>
                  )}
                  {!user && (
                    <Link
                      href="/become-a-pro"
                      className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("nav.joinAsPro")}
                    </Link>
                  )}
                </div>
                <hr className="my-2 border-gray-300" />
                <div className="space-y-1 px-4 py-2">
                  {loading ? (
                    <div className="py-2 text-sm">{t("common.loading")}</div>
                  ) : user ? (
                    <>
                      <div className="py-2 text-sm text-gray-700">
                        {user.displayName || user.email}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left py-2 text-sm hover:text-[hsl(var(--primary))] border-none bg-transparent cursor-pointer"
                      >
                        {t("nav.logOut")}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/register"
                        className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("nav.signUp")}
                      </Link>
                      <Link
                        href="/login"
                        className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("nav.logIn")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Logo & Nav */}
        <div className="hidden md:flex flex-1 items-center">
          <Link
            className="flex items-center px-6 py-3"
            href="/"
            aria-label="Home"
          >
            <p className="tracking-tight text-xl font-bold">Mestermind</p>
          </Link>

          <nav className="flex items-stretch h-full">
            <ServicesDropdown>
              <button
                className="flex items-center px-3 h-full border-b-3 border-transparent hover:border-gray-300 transition-colors text-xs text-[rgb(103,109,115)]"
                tabIndex={0}
              >
                <div className="flex items-center w-full">
                  <div className="flex justify-between w-full items-center">
                    {t("nav.exploreServices")}
                    <svg
                      style={{ height: "20px" }}
                      height="28"
                      width="28"
                      fill="currentColor"
                      viewBox="0 0 28 28"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M6.354 10.764L14 19l7.689-8.275a1 1 0 00-1.342-1.482L14 16 7.715 9.301A1.026 1.026 0 007 9a1 1 0 00-1 1c0 .306.151.537.354.764z"></path>
                    </svg>
                  </div>
                </div>
              </button>
            </ServicesDropdown>
            {user && (
              <>
                <Link
                  href="/customer/messages"
                  className="flex items-center text-xs px-3 h-full border-b-3 border-transparent hover:border-gray-300 transition-colors text-[rgb(103,109,115)] relative"
                  tabIndex={0}
                >
                  <div className="flex items-center">
                    {t("nav.messages")}
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  href="/customer/appointments"
                  className="flex items-center text-xs px-3 h-full border-b-3 border-transparent hover:border-gray-300 transition-colors text-[rgb(103,109,115)]"
                  tabIndex={0}
                >
                  {t("nav.appointments")}
                </Link>
              </>
            )}
            {!user && (
              <Link
                href="/become-a-pro"
                className="flex items-center text-xs px-3 h-full border-b-3 border-transparent hover:border-gray-300 transition-colors text-[rgb(103,109,115)]"
                tabIndex={0}
              >
                <div className="flex items-center">{t("nav.joinAsPro")}</div>
              </Link>
            )}
          </nav>
        </div>

        {/* Right Side Icons */}
        <div className="flex items-center gap-2">
          <LanguageChooser />
          {user && (
            <div className="hidden md:block">
              <NotificationDropdown />
            </div>
          )}
          
          {loading ? (
            <div className="hidden md:flex items-center text-xs px-3">{t("common.loading")}</div>
          ) : user ? (
            <div className="hidden md:flex flex-col justify-center relative">
              <button
                className="flex items-center border-none bg-transparent cursor-pointer"
                aria-label="User menu"
                type="button"
                onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-400 text-white text-sm font-semibold">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <ChevronDown size={20} className="text-gray-700" />
                </div>
              </button>

              {/* Avatar Dropdown */}
              {avatarDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAvatarDropdownOpen(false)}
                  ></div>
                  <div
                    className="absolute right-0 top-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-56"
                  >
                    <div className="py-2">
                      <div className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">
                        {user.displayName || user.email}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                      >
                        {t("nav.logOut")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/register" tabIndex={0}>
                <Button size="sm" className={"px-6 py-4 font-semibold"}>{t("nav.signUp")}</Button>
              </Link>
              <Link
                href="/login"
                className="flex items-center text-xs px-3 h-full border-b-3 border-transparent hover:border-gray-300 transition-colors text-[rgb(103,109,115)]"
                tabIndex={0}
              >
                <div className="flex items-center">{t("nav.logIn")}</div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
