"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { uploadFileWithProgress, generateFilePath } from "@/lib/firebase/storage";
import { API_BASE_URL } from "@/lib/api/config";

interface JobRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: JobRequestData) => void;
  serviceId?: string | null;
  initialCity?: string | null;
}

interface JobRequestData {
  description: string;
  category: string;
  city: string;
  district: string;
  street?: string;
  timing: string;
  photos: File[];
  budget?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const CATEGORIES = [
  "House Cleaning",
  "Plumbing",
  "Electrical",
  "Painting",
  "Carpentry",
  "HVAC",
  "Landscaping",
  "Moving",
  "Handyman",
  "Other"
];

const TIMING_OPTIONS = [
  "As soon as possible",
  "Within 3 days",
  "Within a week",
  "Flexible"
];

export default function JobRequestModal({ isOpen, onClose, onComplete, serviceId: propServiceId, initialCity }: JobRequestModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const serviceId = propServiceId || null;

  const [formData, setFormData] = useState<JobRequestData>({
    description: "",
    category: "",
    city: initialCity || "",
    district: "",
    street: "",
    timing: "",
    photos: [],
    budget: "",
    firstName: "",
    lastName: "",
    phone: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Fetch user ID from Firebase UID and check for existing draft
  useEffect(() => {
    const fetchUserAndDraft = async () => {
      if (user?.uid) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setUserId(userData.id);
            
            // Check for existing draft or open job
            const jobsResponse = await fetch(
              `${API_BASE_URL}/api/v1/jobs?user_id=${userData.id}`
            );
            if (jobsResponse.ok) {
              const jobs = await jobsResponse.json();
              
              // Find draft or open job with same service_id
              const existingDraft = jobs.find(
                (job: any) => job.service_id === serviceId && (job.status === 'draft' || job.status === 'open')
              );
              
              if (existingDraft) {
                setCurrentJobId(existingDraft.id);
                // Load existing photos if any
                if (existingDraft.photos && existingDraft.photos.length > 0) {
                  setPhotoUrls(existingDraft.photos);
                }
                // Pre-fill form with existing draft data
                // Prioritize initialCity from URL params over draft city
                setFormData({
                  description: existingDraft.description || "",
                  category: existingDraft.category || "",
                  city: initialCity || existingDraft.city || "",
                  district: existingDraft.district || "",
                  street: existingDraft.street || "",
                  timing: existingDraft.timing || "",
                  photos: [], // File objects are not stored, only URLs
                  budget: existingDraft.budget || "",
                  firstName: existingDraft.contact_name?.split(' ')[0] || "",
                  lastName: existingDraft.contact_name?.split(' ').slice(1).join(' ') || "",
                  phone: existingDraft.contact_phone || "",
                });
              }
              
              // Fetch customer profile to pre-fill contact info
              try {
                const profileResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userData.id}/profile`);
                if (profileResponse.ok) {
                  const profileData = await profileResponse.json();
                  setFormData(prev => ({
                    ...prev,
                    firstName: prev.firstName || profileData.first_name || "",
                    lastName: prev.lastName || profileData.last_name || "",
                    phone: prev.phone || profileData.phone || "",
                  }));
                }
              } catch (error) {
                console.log("No existing customer profile found or error fetching it:", error);
              }
            } else {
              // No existing draft, use initialCity if provided
              if (initialCity) {
                setFormData(prev => ({ ...prev, city: initialCity }));
              }
            }
          } else if (response.status === 404) {
            console.error("User not found. Please make sure you're signed in.");
          }
        } catch (error) {
          console.error("Failed to fetch user or draft:", error);
        }
      }
    };
    fetchUserAndDraft();
  }, [user, serviceId, initialCity]);

  // Save draft to backend whenever form data changes
  useEffect(() => {
    const saveDraft = async () => {
      if (!userId || !isOpen) return;

      const contactName = formData.firstName && formData.lastName 
        ? `${formData.firstName} ${formData.lastName}`.trim()
        : formData.firstName || formData.lastName || null;

      const jobData = {
        user_id: userId,
        service_id: serviceId,
        description: formData.description || null,
        category: formData.category || null,
        city: formData.city || null,
        district: formData.district || null,
        street: formData.street || null,
        timing: formData.timing || null,
        budget: formData.budget || null,
        contact_name: contactName,
        contact_phone: formData.phone || null,
        photos: photoUrls, // Use uploaded photo URLs
      };

      try {
        if (currentJobId) {
          // Update existing draft
          await fetch(`${API_BASE_URL}/api/v1/jobs/${currentJobId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jobData),
          });
        } else {
          // Create new draft
          const response = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jobData),
          });
          if (response.ok) {
            const newJob = await response.json();
            setCurrentJobId(newJob.id);
          }
        }
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    };

    // Debounce the save
    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData, userId, serviceId, currentJobId, isOpen, photoUrls]);

  const progress = (step / totalSteps) * 100;

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1 && !formData.description.trim()) {
      newErrors.description = "Please describe what you need help with";
    }
    if (step === 2 && !formData.category) {
      newErrors.category = "Please select a category";
    }
    if (step === 3) {
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.district.trim()) newErrors.district = "District is required";
    }
    if (step === 4 && !formData.timing) {
      newErrors.timing = "Please select when you'd like the job done";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep()) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        // Upload photos if any are selected
        let uploadedPhotoUrls: string[] = [];
        if (formData.photos.length > 0 && user) {
          try {
            setUploadingPhotos(true);
            // Upload each photo with a unique path
            const uploadPromises = formData.photos.map((photo) => {
              return new Promise<string>((resolve, reject) => {
                const filePath = generateFilePath(
                  `jobs/${currentJobId || 'draft'}/${user.uid}`,
                  photo.name,
                  user.uid
                );
                uploadFileWithProgress(
                  filePath,
                  photo,
                  undefined,
                  undefined, // progress callback
                  reject, // error callback
                  resolve // complete callback (receives downloadURL)
                );
              });
            });
            
            uploadedPhotoUrls = await Promise.all(uploadPromises);
            setPhotoUrls(uploadedPhotoUrls);
          } catch (error) {
            console.error("Failed to upload photos:", error);
            alert("Failed to upload some photos. Please try again.");
            setUploadingPhotos(false);
            return;
          } finally {
            setUploadingPhotos(false);
          }
        }

        // Update job with photo URLs and set status to open
        if (currentJobId) {
          try {
            await fetch(`${API_BASE_URL}/api/v1/jobs/${currentJobId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : photoUrls,
                status: "open" // Set job status to open when submitted
              }),
            });
          } catch (error) {
            console.error("Failed to update job:", error);
          }
        }

        // Create or update customer profile before completing
        if (userId && (formData.firstName || formData.lastName || formData.phone)) {
          try {
            const profileData = {
              first_name: formData.firstName || "",
              last_name: formData.lastName || "",
              phone: formData.phone || "",
              city: formData.city || "",
              district: formData.district || "",
              street_address: formData.street || null,
            };

            // Try to update existing profile first
            const updateResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/profile`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(profileData),
            });

            if (!updateResponse.ok && updateResponse.status === 404) {
              // Profile doesn't exist, create it
              await fetch(`${API_BASE_URL}/api/v1/users/${userId}/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...profileData, user_id: userId }),
              });
            }
          } catch (error) {
            console.error("Failed to save customer profile:", error);
          }
        }
        
        onComplete(formData);
      }
    }
  };

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = formData.photos.length + photoUrls.length;
    if (totalPhotos + files.length <= 3) {
      setFormData({ ...formData, photos: [...formData.photos, ...files] });
    } else {
      alert(`You can only upload ${3 - totalPhotos} more photo(s). Maximum 3 photos allowed.`);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              What do you need help with?
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project in detail..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-2">{errors.description}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              Which category best describes the job?
            </div>
            <div className="space-y-3">
              {CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
                  style={{ padding: "16px" }}
                >
                  <input
                    type="radio"
                    name="category"
                    value={category}
                    checked={formData.category === category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="hidden"
                  />
                  <svg
                    className="flex-shrink-0"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g fill="#ffffff" fillRule="evenodd">
                      <circle
                        stroke={formData.category === category ? "#009fd9" : "#d3d4d5"}
                        strokeWidth="2"
                        cx="10"
                        cy="10"
                        r="9"
                      ></circle>
                      {formData.category === category && (
                        <circle fill="#009fd9" cx="10" cy="10" r="6"></circle>
                      )}
                    </g>
                  </svg>
                  <span className="ml-3 flex-1">{category}</span>
                </label>
              ))}
            </div>
            {errors.category && (
              <p className="text-red-500 text-sm mt-2">{errors.category}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              Where is the job located?
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">City *</label>
                <CityAutocomplete
                  value={formData.city}
                  onChange={(value) => setFormData({ ...formData, city: value })}
                  placeholder="Enter city"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">District *</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Enter district"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
                {errors.district && (
                  <p className="text-red-500 text-sm mt-1">{errors.district}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Street (optional)</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Enter street address"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              When would you like the job done?
            </div>
            <div className="space-y-3">
              {TIMING_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
                  style={{ padding: "16px" }}
                >
                  <input
                    type="radio"
                    name="timing"
                    value={option}
                    checked={formData.timing === option}
                    onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                    className="hidden"
                  />
                  <svg
                    className="flex-shrink-0"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g fill="#ffffff" fillRule="evenodd">
                      <circle
                        stroke={formData.timing === option ? "#009fd9" : "#d3d4d5"}
                        strokeWidth="2"
                        cx="10"
                        cy="10"
                        r="9"
                      ></circle>
                      {formData.timing === option && (
                        <circle fill="#009fd9" cx="10" cy="10" r="6"></circle>
                      )}
                    </g>
                  </svg>
                  <span className="ml-3 flex-1">{option}</span>
                </label>
              ))}
            </div>
            {errors.timing && (
              <p className="text-red-500 text-sm mt-2">{errors.timing}</p>
            )}
          </div>
        );

      case 5:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              Can you share photos? (optional)
            </div>
            <div className="text-center text-sm text-gray-600 mb-6">
              Photos help pros understand your project better. You can upload up to 3 images.
            </div>
            <div className="space-y-4">
              {/* Show existing uploaded photos */}
              {photoUrls.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Previously uploaded photos:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {photoUrls.map((photoUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photoUrl}
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = photoUrls.filter((_, i) => i !== index);
                            setPhotoUrls(newUrls);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formData.photos.length + photoUrls.length < 3 && (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] transition-colors">
                  <svg
                    className="w-12 h-12 text-gray-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">Click to upload photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              What is your approximate budget? (optional)
            </div>
            <div className="text-center text-sm text-gray-600 mb-6">
              This helps us match you with pros in your price range.
            </div>
            <input
              type="text"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="e.g., $500 or $200-$400"
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
            />
          </div>
        );

      case 7:
        return (
          <div>
            <div className="text-center text-2xl font-semibold mb-8 max-w-2xl mx-auto">
              How can pros contact you?
            </div>
            <div className="text-center text-sm text-gray-600 mb-6">
              This information will be saved to your profile and used for future requests.
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter your first name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter your last name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canSkip = step === 5 || step === 6 || step === 7;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) return; }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col bg-white" showCloseButton={false} onInteractOutside={(e) => e.preventDefault()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`p-1 ${step === 1 ? "invisible" : "hover:bg-gray-100 rounded"}`}
          >
            <svg
              role="presentation"
              height="28"
              width="28"
              fill="currentColor"
              viewBox="0 0 28 28"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M11.236 21.646L3 14l8.275-7.689a1 1 0 011.482 1.342L7.25 13h16.748A1 1 0 1124 15H7.25l5.449 5.285c.187.2.301.435.301.715a1 1 0 01-1 1c-.306 0-.537-.151-.764-.354z"></path>
            </svg>
          </button>

          <div className="flex-1 mx-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[hsl(var(--primary))] h-full transition-all duration-300"
                style={{ transform: `translateX(-${100 - progress}%)` }}
              ></div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg
              role="presentation"
              height="28"
              width="28"
              fill="currentColor"
              viewBox="0 0 28 28"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15.616 14l6.05-6.049a1.142 1.142 0 10-1.617-1.616L14 12.385l-6.049-6.05a1.142 1.142 0 00-1.616 0 1.14 1.14 0 000 1.616l6.05 6.05-6.05 6.048a1.14 1.14 0 000 1.616 1.14 1.14 0 001.616 0l6.05-6.049 6.048 6.05a1.14 1.14 0 001.616 0 1.142 1.142 0 000-1.617L15.616 14z"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex-shrink-0">
          <div className="flex gap-3 max-w-md mx-auto">
            {canSkip && (
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={uploadingPhotos}
              className="flex-1 px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <b>{uploadingPhotos ? "Uploading..." : step === totalSteps ? "Submit" : "Next"}</b>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
