"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ChevronDown } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import LanguageChooser from "./LanguageChooser";
import { API_BASE_URL } from "@/lib/api/config";

export default function ProHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
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
            <svg
              className="text-black"
              aria-label="logo"
              width="49"
              height="46"
              viewBox="0 0 49 46"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 26c0 11.045 8.955 20 20 20 11.046 0 20-8.955 20-20 0-11.046-8.954-20-20-20C8.955 6 0 14.954 0 26z"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M29.773 21.061H10.227v-4.447h19.546v4.447zm-8.774 17.51a10.313 10.313 0 0 0 1.378-5.152V22.932c-1.812 0-3.574.58-4.754 2.223v8.264c0 1.808.476 3.585 1.379 5.151L20 40.302 21 38.57z"
                fill="#fff"
              />
              <path
                d="M44.66 5.65c2.3 0 4.15 1.83 4.15 4.08 0 2.23-1.86 4.08-4.15 4.08-2.35 0-4.18-1.85-4.18-4.08 0-2.25 1.83-4.08 4.18-4.08zm0 7.26c1.75 0 3.15-1.42 3.15-3.18 0-1.77-1.4-3.17-3.15-3.17-1.79 0-3.19 1.4-3.19 3.17 0 1.76 1.4 3.18 3.19 3.18zm.24-5.09c.97 0 1.52.47 1.52 1.21 0 .62-.44 1.06-1.21 1.15l1.24 1.43h-.97l-1.15-1.42h-.37v1.42h-.81V7.82h1.75zm-.01.71h-.93v1.01h.93c.43 0 .7-.17.7-.51 0-.33-.27-.5-.7-.5z"
                fill="#2F3033"
              />
            </svg>
            <ChevronDown className="ml-1 text-gray-500" size={18} />
          </button>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="absolute left-0 top-16 w-full bg-white border-b border-gray-300 shadow-lg z-40">
              <div className="flex flex-col overflow-y-auto pb-8">
                <div className="space-y-1 px-4 py-2">
                  <Link
                    href="/pro/jobs"
                    className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Jobs
                  </Link>
                  <Link
                    href="/pro/messages"
                    className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))] relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      Messages
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link
                    href="/pro/appointments"
                    className={`block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))] ${
                      pathname === "/pro/appointments" ? "text-[hsl(var(--primary))]" : ""
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Appointments
                  </Link>
                  <Link
                    href="/pro/services"
                    className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Services
                  </Link>
                  <Link
                    href="/pro/profile"
                    className="block py-3 text-lg font-semibold hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                </div>
                <hr className="my-2 border-gray-300" />
                <div className="space-y-1 px-4 py-2">
                  <Link
                    href="/become-a-pro/integrations"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Integrations
                  </Link>
                  <Link
                    href="/become-a-pro/insights"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Insights
                  </Link>
                  <Link
                    href="/pro/reviews"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Reviews
                  </Link>
                  <Link
                    href="/pro/payments"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Payments
                  </Link>
                  <Link
                    href="/pro/calendar"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Calendar
                  </Link>
                  <Link
                    href="/become-a-pro/settings"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <hr className="my-2 border-gray-300" />
                  <Link
                    href="/become-a-pro/referrals"
                    className="block py-2 text-sm hover:text-[hsl(var(--primary))]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Refer pros. Get up to $100.
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block py-2 text-sm hover:text-[hsl(var(--primary))] border-none bg-transparent cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Logo & Nav */}
        <div className="hidden md:flex flex-1 items-center">
          <Link className="flex items-center px-3" href="/pro/jobs" aria-label="Mestermind Home">
            <svg
              className="text-black"
              aria-label="logo"
              width="49"
              height="46"
              viewBox="0 0 49 46"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 26c0 11.045 8.955 20 20 20 11.046 0 20-8.955 20-20 0-11.046-8.954-20-20-20C8.955 6 0 14.954 0 26z"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M29.773 21.061H10.227v-4.447h19.546v4.447zm-8.774 17.51a10.313 10.313 0 0 0 1.378-5.152V22.932c-1.812 0-3.574.58-4.754 2.223v8.264c0 1.808.476 3.585 1.379 5.151L20 40.302 21 38.57z"
                fill="#fff"
              />
              <path
                d="M44.66 5.65c2.3 0 4.15 1.83 4.15 4.08 0 2.23-1.86 4.08-4.15 4.08-2.35 0-4.18-1.85-4.18-4.08 0-2.25 1.83-4.08 4.18-4.08zm0 7.26c1.75 0 3.15-1.42 3.15-3.18 0-1.77-1.4-3.17-3.15-3.17-1.79 0-3.19 1.4-3.19 3.17 0 1.76 1.4 3.18 3.19 3.18zm.24-5.09c.97 0 1.52.47 1.52 1.21 0 .62-.44 1.06-1.21 1.15l1.24 1.43h-.97l-1.15-1.42h-.37v1.42h-.81V7.82h1.75zm-.01.71h-.93v1.01h.93c.43 0 .7-.17.7-.51 0-.33-.27-.5-.7-.5z"
                fill="#2F3033"
              />
            </svg>
          </Link>

          <nav className="flex items-stretch h-full ml-4">
            <Link
              href="/pro/jobs"
              className={`flex items-center text-xs px-3 h-full border-b-3 transition-colors text-[rgb(103,109,115)] ${
                pathname === "/pro/jobs" || pathname === "/pro/opportunities" ? "border-[hsl(var(--primary))]" : "border-transparent hover:border-[hsl(var(--primary))]"
              }`}
            >
              Jobs
            </Link>
            <Link
              href="/pro/messages"
              className={`flex items-center text-xs px-3 h-full border-b-3 transition-colors text-[rgb(103,109,115)] relative ${
                pathname === "/pro/messages" ? "border-[hsl(var(--primary))]" : "border-transparent hover:border-[hsl(var(--primary))]"
              }`}
            >
              <div className="flex items-center">
                Messages
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </Link>
            <Link
              href="/pro/appointments"
              className={`flex items-center text-xs px-3 h-full border-b-3 transition-colors text-[rgb(103,109,115)] ${
                pathname === "/pro/appointments" ? "border-[hsl(var(--primary))]" : "border-transparent hover:border-[hsl(var(--primary))]"
              }`}
            >
              Appointments
            </Link>
            <Link
              href="/pro/services"
              className={`flex items-center text-xs px-3 h-full border-b-3 transition-colors text-[rgb(103,109,115)] ${
                pathname === "/pro/services" ? "border-[hsl(var(--primary))]" : "border-transparent hover:border-[hsl(var(--primary))]"
              }`}
            >
              Services
            </Link>
            <Link
              href="/pro/profile"
              className={`flex items-center text-xs px-3 h-full border-b-3 transition-colors text-[rgb(103,109,115)] ${
                pathname === "/pro/profile" ? "border-[hsl(var(--primary))]" : "border-transparent hover:border-[hsl(var(--primary))]"
              }`}
            >
              Profile
            </Link>
          </nav>
        </div>

        {/* Right Side Icons */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:block mr-2">
            <Link
              href="/become-a-pro/referrals"
              className="inline-block bg-white shadow-sm border border-gray-200 rounded-full px-4 py-2 text-green-600 font-semibold hover:shadow text-xs"
            >
              Refer pros. Get up to $100.
            </Link>
          </div>

          <LanguageChooser />
          <NotificationDropdown />

          <div className="hidden md:flex flex-col justify-center relative">
            <button
              className="flex items-center border-none bg-transparent cursor-pointer"
              aria-label="header dropdown button"
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
                <ChevronDown size={28} className="text-gray-700" />
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
                  className="absolute right-0 top-full mt-2 bg-white border-b border-l border-gray-300 rounded-bl-lg shadow-lg z-50 w-64"
                  data-testid="global-header__dropdown"
                >
                  <div className="py-2">
                    <Link
                      href="/become-a-pro/integrations"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Integrations</div>
                    </Link>
                    <Link
                      href="/become-a-pro/insights"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Insights</div>
                    </Link>
                    <Link
                      href="/pro/reviews"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Reviews</div>
                    </Link>
                    <Link
                      href="/pro/payments"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Payments</div>
                    </Link>
                    <Link
                      href="/become-a-pro/earnings"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Earnings</div>
                    </Link>
                    <span className="block lg:hidden">
                      <Link
                        href="/pro/calendar"
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setAvatarDropdownOpen(false)}
                      >
                        <div className="flex items-center">Calendar</div>
                      </Link>
                    </span>
                    <Link
                      href="/become-a-pro/settings"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Settings</div>
                    </Link>
                    <hr className="my-2 border-0 border-b border-gray-300" />
                    <Link
                      href="/become-a-pro/referrals"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <div className="flex items-center">Refer pros. Get up to $100.</div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                    >
                      <div className="flex items-center">Log out</div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
