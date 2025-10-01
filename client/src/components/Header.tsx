'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut } from "lucide-react";
import ServicesDropdown from "./ServicesDropdown";
import Link from "next/link";
import { subscribeToAuthChanges, logout } from "@/lib/auth";
import { fetchIsProByEmail, fetchProProfileByEmail } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("");

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
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      setIsSignedIn(Boolean(user));
      if (user?.email) {
        try {
          const { is_pro } = await fetchIsProByEmail(user.email);
          setIsPro(Boolean(is_pro));
          const profile = await fetchProProfileByEmail(user.email);
          setAvatarUrl(profile?.logo_url || null);
          const name = profile?.display_name || user.displayName || user.email || "";
          const parts = String(name).trim().split(/\s+/);
          const initials = (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
          setUserInitials(initials || (user.email?.[0] || "").toUpperCase());
        } catch {
          setIsPro(false);
          setAvatarUrl(null);
          setUserInitials("");
        }
      } else {
        setIsPro(false);
        setAvatarUrl(null);
        setUserInitials("");
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  return (
    <header className="w-full bg-white border-b border-gray-200 relative overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex justify-between items-center h-16 overflow-visible">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-800">Mestermind</span>
            <span className="text-xs text-gray-500 ml-1">®</span>
          </a>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <div className="relative overflow-visible" ref={buttonRef}>
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 flex items-center"
                onClick={handleServicesButtonClick}
              >
                Explore Services
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              <ServicesDropdown 
                isOpen={isServicesDropdownOpen} 
                onClose={handleServicesDropdownClose}
                buttonRef={buttonRef}
              />
            </div>
            {isSignedIn && isPro && (
              <Link href="/pro/dashboard">
                <Button  variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Pro dashboard
                </Button>
              </Link>
            )}
            {!isPro && (
              <Link href="/pro/onboarding">
                <Button  variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Join as a pro
                </Button>
              </Link>
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
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
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
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
