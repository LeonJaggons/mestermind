"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { API_BASE_URL } from "@/lib/api/config";

export default function BusinessInfoPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  
  const [formData, setFormData] = useState({
    businessName: "",
    yearFounded: "",
    numberOfEmployees: "",
    streetAddress: "",
    suite: "",
    city: "",
    state: "",
    zipCode: "",
  });
  
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = () => {
    return formData.businessName && formData.yearFounded && formData.numberOfEmployees;
  };

  const handleNext = async () => {
    if (!isFormValid()) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Save business info to pro_profile
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: formData.businessName,
          year_founded: parseInt(formData.yearFounded),
          number_of_employees: parseInt(formData.numberOfEmployees),
          street_address: formData.streetAddress || null,
          suite: formData.suite || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zipCode || null,
          profile_image_url: profileImage || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save business info");
      }

      // Navigate to business intro page
      router.push(`/become-a-pro/onboarding/${userId}/business-intro`);
    } catch (error) {
      console.error("Error saving business info:", error);
      alert("Failed to save business info. Please try again.");
    }
  };

  const us_states = [
    { value: "", label: "State" },
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "DC", label: "District of Columbia" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ];

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: "50%",
            backgroundColor: "hsl(var(--primary))",
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-24 bg-gray-100">
        <div className="max-w-4xl mx-auto my-6 md:my-12 px-4">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Set up your business profile
            </h1>
            <p className="text-base text-gray-700">
              Customers will see this info when choosing the right business for the job.
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-sm">
            {/* Profile Photo Section */}
            <div className="hidden md:block mb-12">
              <h2 className="text-xl font-bold mb-2">
                Upload a clear image that represents your brand
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Customers prefer pros with a clear profile photo or logo.
              </p>

              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full bg-gray-200 overflow-hidden mb-4">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/gif, image/png, image/jpeg"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profile-upload"
                    />
                    <Button
                      type="button"
                      onClick={() => document.getElementById('profile-upload')?.click()}
                      className="flex items-center gap-2"
                    >
                      <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18">
                        <path d="M14.372 6.425C13.866 3.897 11.621 2 9 2S4.134 3.897 3.628 6.425C2.054 7.15 1 8.741 1 10.5 1 12.982 3.018 15 5.5 15a1 1 0 100-2A2.502 2.502 0 013 10.5c0-1.098.745-2.08 1.812-2.388l.666-.192.054-.691C5.674 5.419 7.196 4 9 4s3.326 1.419 3.468 3.229l.053.691.666.192A2.505 2.505 0 0115 10.5c0 1.379-1.121 2.5-2.5 2.5a1 1 0 100 2c2.481 0 4.5-2.018 4.5-4.5 0-1.759-1.053-3.35-2.628-4.075zm-1.796 4.805a.748.748 0 00-.096-1.056L9 7.274l-3.481 2.9a.749.749 0 10.961 1.152l1.77-1.475v6.399a.75.75 0 001.5 0V9.851l1.769 1.475a.75.75 0 001.057-.096z"></path>
                      </svg>
                      Upload image
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-4 flex-1">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 mb-3">
                    <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.93 4.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533l.811-3.74zm-.192-1.756a.93.93 0 1 0 0 1.859.93.93 0 0 0 0-1.859z"/>
                    </svg>
                    New pro tip
                  </div>
                  <p className="text-sm font-medium mb-3">Here's a few images Top Pros used:</p>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-18 h-18 rounded-lg bg-gray-300 border border-gray-300"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Details Form */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  type="text"
                  id="businessName"
                  name="businessName"
                  placeholder="e.g. Squeaky Cleaners"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="mt-2 h-12"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="yearFounded">Year founded</Label>
                  <Input
                    type="number"
                    id="yearFounded"
                    name="yearFounded"
                    placeholder="e.g. 2002"
                    value={formData.yearFounded}
                    onChange={handleChange}
                    className="mt-2 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="numberOfEmployees">Number of employees</Label>
                  <Input
                    type="number"
                    id="numberOfEmployees"
                    name="numberOfEmployees"
                    placeholder="e.g. 1"
                    value={formData.numberOfEmployees}
                    onChange={handleChange}
                    className="mt-2 h-12"
                  />
                </div>
              </div>

              <div className="pt-6">
                <Label htmlFor="streetAddress">Main business location (optional)</Label>
                <Input
                  type="text"
                  id="streetAddress"
                  name="streetAddress"
                  placeholder="Street name"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  className="mt-2 h-12"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  type="text"
                  id="suite"
                  name="suite"
                  placeholder="Suite or unit"
                  value={formData.suite}
                  onChange={handleChange}
                  className="h-12"
                />
                <div>
                  <CityAutocomplete
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    placeholder="City"
                    className="w-full h-12 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-md appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {us_states.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    stroke="#2f3033"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <Input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  placeholder="Zip code"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="h-12"
                />
              </div>

              <div className="hidden md:block pt-6">
                <p className="text-xs text-gray-600">
                  By tapping "Next", you confirm the above info is correct, you're this business's authorized representative and you understand you're solely responsible for your profile's contents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="w-full bg-white z-10 fixed left-0 bottom-0 border-t border-gray-300">
        <div className="max-w-[1200px] mx-auto">
          <div className="block md:hidden px-4 py-3 border-b border-gray-300">
            <p className="text-xs text-gray-600">
              By tapping "Next", you confirm the above info is correct, you're this business's authorized representative and you understand you're solely responsible for your profile's contents.
            </p>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <div className="hidden md:block flex-1"></div>
            <div className="hidden md:block flex-1 px-6">
              <p className="text-xs text-gray-600">
                By tapping "Next", you confirm the above info is correct, you're this business's authorized representative and you understand you're solely responsible for your profile's contents.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <button
                className="w-full md:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "hsl(var(--primary))",
                }}
                onMouseEnter={(e) => !isFormValid() ? null : (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                type="button"
                onClick={handleNext}
                disabled={!isFormValid()}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
