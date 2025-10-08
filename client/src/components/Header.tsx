"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LuChevronDown, LuLogOut } from "react-icons/lu";
import ServicesDropdown from "./ServicesDropdown";
import Link from "next/link";
import { subscribeToAuthChanges, logout, getAuthToken } from "@/lib/auth";
import { fetchIsProByEmail, fetchProProfileByEmail, getNotifications } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";

export default function Header() {
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  const handleServicesButtonClick = () => {
    setIsServicesDropdownOpen(!isServicesDropdownOpen);
  };

  const handleServicesDropdownClose = () => {
    setIsServicesDropdownOpen(false);
  };

  const handleAvatarClick = () => {
    setIsAvatarDropdownOpen(!isAvatarDropdownOpen);
  };

  const handleAvatarDropdownClose = () => {
    setIsAvatarDropdownOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsAvatarDropdownOpen(false);
      // Clear pro flag cookie so middleware stops treating user as pro
      try {
        document.cookie = "is_pro=; Path=/; Max-Age=0; SameSite=Lax";
      } catch {}
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      setIsSignedIn(Boolean(user));
      if (user?.email) {
        try {
          // Get auth token
          const token = await getAuthToken();
          setAuthToken(token);

          const { is_pro } = await fetchIsProByEmail(user.email);
          const pro = Boolean(is_pro);
          setIsPro(pro);
          // Write lightweight pro flag cookie for middleware-based routing
          try {
            document.cookie = `is_pro=${pro ? 'true' : 'false'}; Path=/; SameSite=Lax`;
          } catch {}
          const profile = await fetchProProfileByEmail(user.email);
          setAvatarUrl(profile?.logo_url || null);
          const name =
            profile?.display_name || user.displayName || user.email || "";
          setUserName(name);
          setUserEmail(user.email || "");
          const parts = String(name).trim().split(/\s+/);
          const initials =
            (parts[0]?.[0] || "").toUpperCase() +
            (parts[1]?.[0] || "").toUpperCase();
          setUserInitials(initials || (user.email?.[0] || "").toUpperCase());
        } catch {
          setIsPro(false);
          setAvatarUrl(null);
          setUserInitials("");
          setAuthToken(null);
          setUserName("");
          setUserEmail("");
        }
      } else {
        setIsPro(false);
        setAvatarUrl(null);
        setUserInitials("");
        setAuthToken(null);
        setUserName("");
        setUserEmail("");
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setUnreadCount(0);
      return;
    }
    (async () => {
      try {
        const res = await getNotifications(authToken, { limit: 1 });
        setUnreadCount(res.unread_count || 0);
      } catch {
        setUnreadCount(0);
      }
    })();
  }, [authToken]);

  return (
    <header className="w-full bg-white border-b border-gray-200 relative overflow-visible">
      <div className="  px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex justify-between items-center h-16 overflow-visible">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span
              style={{ fontFamily: "var(--font-heading)" }}
              className="text-xl font-bold text-gray-800"
            >
              Mestermind
            </span>
            <span className="text-xs text-gray-500 ml-[1px]">®</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-0">
            <div className="relative overflow-visible" ref={buttonRef}>
              <Button
                variant="ghost"
                className="font-normal text-sm text-gray-600 hover:text-gray-900 flex items-center"
                onClick={handleServicesButtonClick}
              >
                Explore Services
                <LuChevronDown className="w-4 h-4 ml-1" />
              </Button>
              <ServicesDropdown
                isOpen={isServicesDropdownOpen}
                onClose={handleServicesDropdownClose}
                buttonRef={buttonRef}
              />
            </div>
            {isSignedIn && isPro && (
              <>
                <Link href="/pro/leads">
                  <Button
                    variant="ghost"
                    className="font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    Jobs
                  </Button>
                </Link>
                <Link href="/pro/messages">
                  <Button
                    variant="ghost"
                    className="relative font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/pro/services">
                  <Button
                    variant="ghost"
                    className="font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    Services
                  </Button>
                </Link>
                <Link href="/pro/calendar">
                  <Button
                    variant="ghost"
                    className="font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    Calendar
                  </Button>
                </Link>
                <Link href="/pro/profile">
                  <Button
                    variant="ghost"
                    className="font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    Profile
                  </Button>
                </Link>
              </>
            )}
            {isSignedIn && !isPro && (
              <>
                <Link href="/tasks">
                  <Button
                    variant="ghost"
                    className="font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    My Requests
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button
                    variant="ghost"
                    className="relative font-normal text-sm text-gray-600 hover:text-gray-900"
                  >
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </>
            )}
            {!isPro && (
              <Link href="/pro/onboarding">
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Join as a pro
                </Button>
              </Link>
            )}
            {isSignedIn && authToken && (
              <div className="ml-2">
                <NotificationBell token={authToken} />
              </div>
            )}
            {isSignedIn && (
              <div className="ml-2 relative" ref={avatarRef}>
                <button
                  onClick={handleAvatarClick}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
                >
                  <Avatar>
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback>{userInitials || "U"}</AvatarFallback>
                    )}
                  </Avatar>
                </button>

                {isAvatarDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                      <div className="font-medium text-gray-900 truncate">
                        {userName ? `Welcome, ${userName}` : "Welcome"}
                      </div>
                      {userEmail && (
                        <div className="text-gray-500 truncate">{userEmail}</div>
                      )}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LuLogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
            {!isSignedIn && (
              <>
                <Link href="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
                    Sign up
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Log in
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
