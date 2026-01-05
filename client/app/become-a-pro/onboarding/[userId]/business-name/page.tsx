"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api/config";

export default function BusinessNamePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  const [businessName, setBusinessName] = useState("");

  const handleNext = async () => {
    if (!businessName.trim()) {
      alert("Please enter a business name");
      return;
    }
    
    // Save business name to pro_profile
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: businessName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save business name");
      }

      // Navigate to business info page
      router.push(`/become-a-pro/onboarding/${userId}/business-info`);
    } catch (error) {
      console.error("Error saving business name:", error);
      alert("Failed to save business name. Please try again.");
    }
  };

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: "25%",
            backgroundColor: "hsl(var(--primary))",
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-100 flex-1 pb-24">
        <main className="flex flex-col md:flex-row items-center md:items-start overflow-hidden">
          {/* Left Side - Form */}
          <div className="flex bg-gray-100 w-full justify-center py-6 md:min-h-screen md:justify-end md:w-1/2 px-4 md:px-0 md:pt-12">
            <div className="md:mr-12 max-w-sm">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Stand out to customers.
                </h1>
                <p className="text-base text-gray-700 mb-8">
                  Add a few details to your profile to help customers get to know you better.
                </p>
              </div>

              <div className="mt-8">
                <Label htmlFor="businessNameInput" className="text-base font-medium mb-2 block">
                  First, enter your business name.
                </Label>
                <Input
                  type="text"
                  id="businessNameInput"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-12 text-base"
                />
                <p className="text-sm text-gray-600 mt-2">
                  If you don't have a business name, just use your full name.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Example Profile */}
          <div className="flex bg-white w-full justify-center py-6 md:min-h-screen md:justify-start md:w-1/2 md:pt-12">
            <div className="md:ml-12">
              <div className="rounded-lg border-2 border-gray-300" style={{ width: "400px" }}>
                {/* Header */}
                <div className="bg-gray-100 flex flex-col items-center justify-center text-gray-600 p-4">
                  <h3 className="text-lg font-bold mb-1">Example profile</h3>
                </div>

                {/* Profile Content */}
                <div className="p-6">
                  <div className="max-w-sm mx-auto overflow-hidden px-4 pt-5">
                    {/* Profile Header */}
                    <div className="flex mb-6">
                      <div className="w-24 h-24 rounded-full bg-gray-300 flex-shrink-0"></div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center mb-1">
                          <h2 className="text-2xl font-bold mr-3">{businessName || "ACE"}</h2>
                          <div className="w-10 h-10 bg-blue-100 rounded-full"></div>
                        </div>
                        <p className="text-xl font-bold">Handyman</p>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="mb-4">
                      <div className="text-lg font-bold mb-1">Good 4.0</div>
                      <div className="flex mb-1">
                        {[1, 2, 3, 4].map((star) => (
                          <svg
                            key={star}
                            className="w-5 h-5 text-yellow-400 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                        <svg
                          className="w-5 h-5 text-gray-300 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">11 reviews</p>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 mb-6">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 14 14">
                          <path d="M11.875 5.313c0 .756-.505 1.39-1.193 1.605a3.7 3.7 0 00.068-.668V2.503h.938c.103 0 .187.084.187.188v2.622zM9.25 6.25C9.25 7.49 8.24 8.5 7 8.5S4.75 7.49 4.75 6.25V2.5h4.5v3.75zm-7.125-.938V2.684c0-.103.084-.187.188-.187h.937V6.25c0 .229.028.45.067.668a1.686 1.686 0 01-1.192-1.606zM11.688 1H2.312C1.59 1 1 1.589 1 2.313v3A2.812 2.812 0 003.769 8.12 3.743 3.743 0 006.25 9.922V11.5h-1.5a.75.75 0 100 1.5h4.5a.75.75 0 100-1.5h-1.5V9.923a3.742 3.742 0 002.481-1.803A2.812 2.812 0 0013 5.313v-3C13 1.589 12.411 1 11.687 1z"></path>
                        </svg>
                        In high demand
                      </div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 14 14">
                          <path d="M4.968 10.08l.897-2.855a.751.751 0 00-.716-.975H4.141L6.604 2.5h3.019L8.101 5.123A.748.748 0 008.75 6.25h.898l-4.68 3.83zm7.488-4.832a.748.748 0 00-.706-.498h-1.698l1.523-2.623A.752.752 0 0010.925 1H6.201a.75.75 0 00-.628.338l-3.45 5.25A.75.75 0 002.75 7.75h1.378l-1.344 4.275a.749.749 0 001.19.806l8.25-6.75a.749.749 0 00.232-.833z"></path>
                        </svg>
                        Fast response
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-gray-600 text-sm space-y-2">
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-2" fill="currentColor" viewBox="0 0 14 14">
                          <path d="M11.875 5.313c0 .756-.505 1.39-1.193 1.605a3.7 3.7 0 00.068-.668V2.503h.938c.103 0 .187.084.187.188v2.622zM9.25 6.25C9.25 7.49 8.24 8.5 7 8.5S4.75 7.49 4.75 6.25V2.5h4.5v3.75zm-7.125-.938V2.684c0-.103.084-.187.188-.187h.937V6.25c0 .229.028.45.067.668a1.686 1.686 0 01-1.192-1.606zM11.688 1H2.312C1.59 1 1 1.589 1 2.313v3A2.812 2.812 0 003.769 8.12 3.743 3.743 0 006.25 9.922V11.5h-1.5a.75.75 0 100 1.5h4.5a.75.75 0 100-1.5h-1.5V9.923a3.742 3.742 0 002.481-1.803A2.812 2.812 0 0013 5.313v-3C13 1.589 12.411 1 11.687 1z"></path>
                        </svg>
                        <p>82 hires on Mestermind</p>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-2" fill="currentColor" viewBox="0 0 14 14">
                          <path d="M7.778 7.778a2.333 2.333 0 012.333 2.333v2.333a.778.778 0 11-1.555 0v-2.333a.778.778 0 00-.778-.778H3.11c-.399 0-.728.3-.772.687l-.006.091v2.333a.778.778 0 11-1.555 0v-2.333l.004-.137a2.333 2.333 0 012.33-2.196h4.666zm5.273-2.94a.583.583 0 010 .824l-2.333 2.334a.583.583 0 01-.825 0L8.726 6.829a.583.583 0 11.825-.825l.755.754 1.92-1.92a.583.583 0 01.825 0zM5.444.778a3.111 3.111 0 110 6.222 3.111 3.111 0 010-6.222zm0 1.555a1.556 1.556 0 100 3.111 1.556 1.556 0 000-3.11z"></path>
                        </svg>
                        <p>Background checked</p>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-2" fill="currentColor" viewBox="0 0 14 14">
                          <path d="M7 4.083a.584.584 0 00-.583.584v1.75h-1.75a.584.584 0 000 1.166h2.916V4.667A.584.584 0 007 4.083zm0 7.584A4.671 4.671 0 012.333 7 4.671 4.671 0 017 2.333 4.67 4.67 0 0111.667 7 4.67 4.67 0 017 11.667zM7 .777A6.23 6.23 0 00.778 7 6.23 6.23 0 007 13.222 6.23 6.23 0 0013.222 7 6.23 6.23 0 007 .778z"></path>
                        </svg>
                        <p>5 years in business</p>
                      </div>
                    </div>

                    {/* Message Button */}
                    <div className="mt-6">
                      <div
                        className="w-full rounded-lg py-3 text-white text-center"
                        style={{ backgroundColor: "hsl(var(--primary))" }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18">
                            <path d="M7.5 3C5.02 3 3 5.02 3 7.5a4.49 4.49 0 001.637 3.473l.363.3v2.296l2.769-1.572.245.004H10.5c2.481 0 4.5-2.02 4.5-4.5C15 5.02 12.981 3 10.5 3h-3zM3 17.002V12.19A6.477 6.477 0 011 7.5C1 3.917 3.916 1 7.5 1h3C14.084 1 17 3.916 17 7.5c0 3.585-2.916 6.502-6.5 6.502H8.239l-5.239 3z"></path>
                          </svg>
                          <span className="font-semibold">Message</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Action Bar */}
      <div className="w-full bg-white z-10 fixed left-0 bottom-0 border-t border-gray-300">
        <div className="flex flex-wrap justify-center max-w-[1200px] mx-auto py-2 px-3">
          <div className="w-full min-h-[60px]">
            <div className="flex justify-between items-center relative w-full">
              <div></div>
              <div className="flex items-center justify-center md:justify-end px-3 py-2 w-full md:w-auto">
                <button
                  className="w-full md:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "hsl(var(--primary))",
                  }}
                  onMouseEnter={(e) => !businessName.trim() ? null : (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  type="button"
                  onClick={handleNext}
                  disabled={!businessName.trim()}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
