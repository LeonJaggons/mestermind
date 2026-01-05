"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api/config";

interface FAQ {
  id: number;
  pro_profile_id: number;
  question: string;
  answer: string | null;
  display_order: number;
  created_at: string;
  updated_at: string | null;
}

const DEFAULT_QUESTIONS = [
  "What should the customer know about your pricing (e.g., discounts, fees)?",
  "What is your typical process for working with a new customer?",
  "What education and/or training do you have that relates to your work?",
  "How did you get started doing this type of work?",
  "What types of customers have you worked with?",
  "Describe a recent project you are fond of. How long did it take?",
  "What advice would you give a customer looking to hire a provider in your area of work?",
  "What questions should customers think through before talking to professionals about their project?"
];

export default function EditFAQPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Get user data
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) return;
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`);
        if (!proProfileResponse.ok) return;
        const proProfile = await proProfileResponse.json();
        setProProfileId(proProfile.id);

        // Get existing FAQs
        const faqsResponse = await fetch(`${API_BASE_URL}/api/v1/faqs/pro-profile/${proProfile.id}`);
        if (faqsResponse.ok) {
          const faqsData = await faqsResponse.json();
          setFaqs(faqsData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  const getFAQForQuestion = (question: string): FAQ | null => {
    return faqs.find(f => f.question === question) || null;
  };

  const handleAnswerChange = (question: string, answer: string) => {
    const existing = faqs.find(f => f.question === question);
    
    if (existing) {
      // Update existing FAQ
      setFaqs(faqs.map(f => f.question === question ? { ...f, answer } : f));
    } else {
      // Create new FAQ (temporary, will be saved on submit)
      const newFaq: FAQ = {
        id: 0,
        pro_profile_id: proProfileId || 0,
        question,
        answer,
        display_order: faqs.length,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      setFaqs([...faqs, newFaq]);
    }
  };

  const handleSave = async () => {
    if (!proProfileId) return;

    setSaving(true);
    try {
      // Get current FAQs from server
      const currentResponse = await fetch(`${API_BASE_URL}/api/v1/faqs/pro-profile/${proProfileId}`);
      const currentFaqs: FAQ[] = currentResponse.ok ? await currentResponse.json() : [];

      // Process each default question
      for (let i = 0; i < DEFAULT_QUESTIONS.length; i++) {
        const question = DEFAULT_QUESTIONS[i];
        const faq = faqs.find(f => f.question === question);
        const currentFaq = currentFaqs.find(f => f.question === question);
        
        if (faq && faq.answer && faq.answer.trim()) {
          // Has answer - create or update
          if (currentFaq) {
            // Update existing
            await fetch(`${API_BASE_URL}/api/v1/faqs/${currentFaq.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: faq.question,
                answer: faq.answer,
                display_order: i
              })
            });
          } else {
            // Create new
            await fetch(`${API_BASE_URL}/api/v1/faqs/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pro_profile_id: proProfileId,
                question: faq.question,
                answer: faq.answer,
                display_order: i
              })
            });
          }
        } else if (currentFaq && (!faq || !faq.answer || !faq.answer.trim())) {
          // No answer - delete if exists
          await fetch(`${API_BASE_URL}/api/v1/faqs/${currentFaq.id}`, { method: "DELETE" });
        }
      }

      router.push("/pro/profile");
    } catch (error) {
      console.error("Failed to save FAQs:", error);
      alert("Failed to save FAQs. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!proProfileId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Pro profile not found</p>
          <Link href="/pro/profile" className="text-[hsl(var(--primary))] hover:underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Frequently Asked Questions</h1>
            <Link href="/pro/profile" className="text-gray-600 hover:text-gray-900">
              Cancel
            </Link>
          </div>

          <div className="space-y-8">
            {DEFAULT_QUESTIONS.map((defaultQuestion, index) => {
              const faq = getFAQForQuestion(defaultQuestion);
              return (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <label className="block text-lg font-semibold text-gray-900 mb-2">
                    {defaultQuestion}
                  </label>
                  <textarea
                    value={faq?.answer || ""}
                    onChange={(e) => handleAnswerChange(defaultQuestion, e.target.value)}
                    placeholder="Enter your answer here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent resize-y min-h-[100px]"
                    rows={4}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <Link
              href="/pro/profile"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

