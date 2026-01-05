"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";

interface BackendProProfile {
  id: number;
  user_id: number;
  business_name: string | null;
  year_founded: number | null;
  number_of_employees: number | null;
  street_address: string | null;
  suite: string | null;
  city: string | null;
  zip_code: string | null;
  profile_image_url: string | null;
  business_intro: string | null;
}

export default function EditProProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [yearFounded, setYearFounded] = useState<string>("");
  const [numberOfEmployees, setNumberOfEmployees] = useState<string>("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");

  // Load profile from backend SQL (pro_profiles)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`
        );
        if (res.ok) {
          const backend: BackendProProfile = await res.json();

          setBusinessName(backend.business_name ?? "");
          // phone / website / state are not stored on pro_profiles table;
          // leave them editable in the UI only for now.
          setStreetAddress(backend.street_address ?? "");
          setCity(backend.city ?? "");
          setZipCode(backend.zip_code ?? "");
          setYearFounded(
            backend.year_founded != null ? String(backend.year_founded) : ""
          );
          setNumberOfEmployees(
            backend.number_of_employees != null
              ? String(backend.number_of_employees)
              : ""
          );
          setBio(backend.business_intro ?? "");
          setProfileImageUrl(backend.profile_image_url ?? "");
        }
      } catch (error) {
        console.error("[EDIT PROFILE] Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Update backend pro profile by Firebase UID (creates if missing)
      const updatePayload: Partial<BackendProProfile> = {
        business_name: businessName || null,
        year_founded: yearFounded ? Number(yearFounded) : null,
        number_of_employees: numberOfEmployees
          ? Number(numberOfEmployees)
          : null,
        street_address: streetAddress || null,
        city: city || null,
        zip_code: zipCode || null,
        profile_image_url: profileImageUrl || null,
        business_intro: bio || null,
      };

      const res = await fetch(
        `${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("[EDIT PROFILE] Backend update failed:", res.status, text);
        alert(t("pro.profile.failedToSave") || "Failed to save profile");
        setSaving(false);
        return;
      }

      // We don't need the body here; backend has already persisted the update
      router.push("/pro/profile");
    } catch (error) {
      console.error("[EDIT PROFILE] Error saving profile:", error);
      alert(t("pro.profile.failedToSave") || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center py-24">
        <p className="text-gray-500">
          {t("pro.profile.mustBeLoggedIn") || "You must be logged in."}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <p className="text-gray-500">
          {t("pro.profile.loading") || "Loading profile..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-16 pb-12">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-lg mt-8">
        <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            {t("pro.profile.editBusinessInfo") || "Edit business profile"}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Business name */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              {t("pro.profile.businessName") || "Business name"}
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
          </div>

          {/* Phone + Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                {t("pro.profile.phone") || "Phone"}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                {t("pro.profile.website") || "Website"}
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              {t("pro.profile.address") || "Street address"}
            </label>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
            <div className="grid grid-cols-3 gap-3 mt-2">
              <input
                type="text"
                placeholder={t("pro.profile.city") || "City"}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <input
                type="text"
                placeholder={t("pro.profile.state") || "State"}
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <input
                type="text"
                placeholder={t("pro.profile.zipCode") || "ZIP"}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>
          </div>

          {/* Business details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                {t("pro.profile.yearFounded") || "Year founded"}
              </label>
              <input
                type="number"
                value={yearFounded}
                onChange={(e) => setYearFounded(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                {t("pro.profile.numberOfEmployees") || "Number of employees"}
              </label>
              <input
                type="number"
                value={numberOfEmployees}
                onChange={(e) => setNumberOfEmployees(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>
          </div>

          {/* Profile image URL */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              {t("pro.profile.profileImageUrl") || "Profile image URL"}
            </label>
            <input
              type="url"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              {t("pro.profile.yourIntroduction") || "Introduction"}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push("/pro/profile")}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              disabled={saving}
            >
              {t("pro.profile.cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? t("pro.profile.saving") || "Saving..."
                : t("pro.profile.save") || "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


