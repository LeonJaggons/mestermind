"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/config";

export default function BusinessIntroPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  
  const [introduction, setIntroduction] = useState("");
  const [currentExample, setCurrentExample] = useState(0);
  
  const minCharacters = 40;

  const examples = [
    "My focus is quality. I never cut corners, even when it's more expensive. Some of my competitors are cheaper, but I will take the time to make sure you're 100% happy.",
    "I've been in business for 20 years for a reason: I'm trustworthy. I know having a stranger come into your home can be scary. So I tell you exactly when I'm coming and what I'll do, leave you a written note after, and always give you references and contact info.",
    "I recently became a certified dog walker but have loved dogs my whole life. I quit my accounting job because I realized that working with dogs is much more rewarding. Thank you so much for giving me a chance! I haven't been doing this long but I'm putting my heart and soul into it.",
    "My dad started this business in 1985 and passed it on to me 5 years ago. I grew up learning how to be a plumber, and I understand that every home and every customer is different. I listen to what you have to say and work with you to find a solution that's quick and affordable.",
  ];

  const handleNext = async () => {
    if (introduction.length < minCharacters) {
      alert(`Please enter at least ${minCharacters} characters`);
      return;
    }
    
    // Save business introduction to pro_profile
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_intro: introduction,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save business introduction");
      }

      router.push(`/become-a-pro/onboarding/${userId}/availability`);
    } catch (error) {
      console.error("Error saving business introduction:", error);
      alert("Failed to save business introduction. Please try again.");
    }
  };

  const nextExample = () => {
    setCurrentExample((prev) => (prev + 1) % examples.length);
  };

  const prevExample = () => {
    setCurrentExample((prev) => (prev - 1 + examples.length) % examples.length);
  };

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: "100%",
            backgroundColor: "hsl(var(--primary))",
          }}
        ></div>
      </div>

      {/* Main Content */}
      <main className="flex flex-col md:flex-row items-center md:items-start overflow-hidden flex-1 pb-24">
        {/* Left Side - Form */}
        <div className="flex bg-gray-100 w-full justify-center py-6 md:min-h-screen md:justify-end md:w-1/2 px-4 md:px-0 md:pt-12">
          <div className="md:mr-12 max-w-sm w-full">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Why should customers hire you?
              </h1>
              <p className="text-base text-gray-700 mb-8">
                Explain what makes your business stand out and why you'll do a great job.
              </p>
            </div>

            <div className="mt-8">
              <textarea
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                placeholder="Introduce your business."
                required
                className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-y"
                style={{
                  "--tw-ring-color": "hsl(var(--primary))",
                } as React.CSSProperties}
              />
              <p className="text-xs text-right text-gray-600 mt-2">
                Minimum {minCharacters} characters
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Examples */}
        <div className="flex bg-white w-full justify-center py-6 md:min-h-screen md:justify-start md:w-1/2 md:pt-12">
          <div className="md:ml-12 w-full max-w-md px-4 md:px-0">
            <div className="rounded-lg border-2 border-gray-300" style={{ width: "100%", maxWidth: "400px" }}>
              {/* Header */}
              <div className="bg-gray-100 flex flex-col items-center justify-center text-gray-600 p-4">
                <h3 className="text-lg font-bold mb-1">Example introductions</h3>
              </div>

              {/* Carousel */}
              <div className="p-6">
                <div className="mb-6">
                  <div className="relative">
                    <div className="overflow-hidden">
                      <div
                        className="flex transition-transform duration-300 ease-in-out"
                        style={{ transform: `translateX(-${currentExample * 100}%)` }}
                      >
                        {examples.map((example, index) => (
                          <div
                            key={index}
                            className="w-full flex-shrink-0 px-2"
                          >
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {example}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    {currentExample > 0 && (
                      <button
                        onClick={prevExample}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Previous Example"
                      >
                        <svg
                          height="18"
                          width="18"
                          fill="currentColor"
                          viewBox="0 0 18 18"
                          className="rotate-180"
                        >
                          <path d="M6.764 14.646L13 9 6.725 3.311a1 1 0 00-1.482 1.342L10 9l-4.699 4.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                        </svg>
                      </button>
                    )}
                    
                    {currentExample < examples.length - 1 && (
                      <button
                        onClick={nextExample}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Next Example"
                      >
                        <svg
                          height="18"
                          width="18"
                          fill="currentColor"
                          viewBox="0 0 18 18"
                        >
                          <path d="M6.764 14.646L13 9 6.725 3.311a1 1 0 00-1.482 1.342L10 9l-4.699 4.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="font-bold mb-2">You can mention:</div>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Years in business</li>
                    <li>• What you're passionate about</li>
                    <li>• Special skills or equipment</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
                  onMouseEnter={(e) => introduction.length < minCharacters ? null : (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  type="button"
                  onClick={handleNext}
                  disabled={introduction.length < minCharacters}
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
