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

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);

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
    <div className="relative">
      <div className="flex relative z-10 h-16 border-b border-[rgb(233,236,237)]">
        <div className="flex grow">
          <Link
            className="flex items-center px-6 py-3"
            href="/"
            aria-label="Home"
          >
            <p className="tracking-tight text-xl font-bold">Mestermind</p>
          </Link>
        </div>
        <div className="flex items-center overflow-hidden px-6">
          <div className="flex items-stretch h-full" data-testid="global-header__link-bar">
            <div className="flex gap-2 items-center">
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
                  <NotificationDropdown />
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
              <LanguageChooser />
            {loading ? (
              <div className="flex items-center text-xs px-3">{t("common.loading")}</div>
            ) : user ? (
              <>
                <div className="flex items-center text-xs px-3 text-[rgb(103,109,115)]">
                  {user.displayName || user.email}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="px-6 py-4 font-semibold"
                  onClick={handleLogout}
                >
                  {t("nav.logOut")}
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
