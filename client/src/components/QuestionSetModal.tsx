"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Question,
  QuestionSet,
  fetchQuestionSet,
  fetchQuestionSetsByService,
  createCustomerRequest,
  getCustomerRequest,
  updateCustomerRequest,
  deleteCustomerRequest,
  CustomerRequest,
  fetchMesterById,
  type MesterServiceLink,
  fetchServiceById,
  type Service,
  getCurrentUser,
} from "@/lib/api";
import AvailabilityStep, { type WeeklyAvailability } from "@/components/AvailabilityStep";

interface QuestionSetModalProps {
  serviceId: string;
  mesterId?: string;
  placeId?: string;
  open: boolean;
  onClose: () => void;
  context?: "instant-results" | "mester-profile";
}

export default function QuestionSetModal({
  serviceId: initialServiceId,
  mesterId,
  placeId,
  open,
  onClose,
  context = "instant-results",
}: QuestionSetModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [noPublishedQuestionSet, setNoPublishedQuestionSet] = useState<boolean>(false);
  const [fallbackQuestionSetId, setFallbackQuestionSetId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [messageToPro, setMessageToPro] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Service selection state
  const [selectedServiceId, setSelectedServiceId] =
    useState<string>(initialServiceId);
  const [availableServices, setAvailableServices] = useState<
    Array<MesterServiceLink & { service?: Service }>
  >([]);
  const [showServiceSelection, setShowServiceSelection] = useState<boolean>(
    !initialServiceId && !!mesterId,
  );

  // Check authentication status and auto-fill user data from database
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);

      if (user) {
        try {
          // Fetch user data from database
          const dbUser = await getCurrentUser();

          if (dbUser) {
            // Store user ID for request creation
            setCurrentUserId(dbUser.id);

            // Only auto-fill if fields are currently empty
            if (!firstName && dbUser.first_name) {
              setFirstName(dbUser.first_name);
            }
            if (!lastName && dbUser.last_name) {
              setLastName(dbUser.last_name);
            }
            if (!contactEmail && dbUser.email) {
              setContactEmail(dbUser.email);
            }
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Fallback to Firebase auth data if API fails
          const displayName = user.displayName || "";
          const nameParts = displayName.split(" ");
          const userFirstName = nameParts[0] || "";
          const userLastName = nameParts.slice(1).join(" ") || "";
          const userEmail = user.email || "";

          if (!firstName && userFirstName) {
            setFirstName(userFirstName);
          }
          if (!lastName && userLastName) {
            setLastName(userLastName);
          }
          if (!contactEmail && userEmail) {
            setContactEmail(userEmail);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch available services if no serviceId provided but mesterId is available
  useEffect(() => {
    if (!open || initialServiceId || !mesterId) return;

    let aborted = false;
    const fetchServices = async () => {
      try {
        setLoading(true);
        const mesterData = await fetchMesterById(mesterId);

        // Fetch service details for each mester service
        const servicesWithDetails = await Promise.all(
          mesterData.services.map(async (svc) => {
            try {
              const serviceDetails = await fetchServiceById(svc.service_id);
              return { ...svc, service: serviceDetails };
            } catch {
              return svc;
            }
          }),
        );

        if (!aborted) {
          setAvailableServices(servicesWithDetails);
          setShowServiceSelection(true);
        }
      } catch (e: any) {
        if (!aborted) {
          setError(e?.message || "Failed to load services");
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    };

    fetchServices();
    return () => {
      aborted = true;
    };
  }, [open, initialServiceId, mesterId]);

  const handleClose = async () => {
    // Delete draft request when modal is closed (regardless of context)
    if (request && request.status === "DRAFT") {
      try {
        await deleteCustomerRequest(request.id);
        // Also remove from localStorage
        if (typeof window !== "undefined") {
          const storageKey = `mm:req:${selectedServiceId}:${questionSet?.id || ""}:${placeId || ""}`;
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error("Failed to delete request:", error);
        // Continue with close even if deletion fails
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!open || !selectedServiceId || showServiceSelection) return;
    let aborted = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setQuestionSet(null);
        setCurrentStep(0);
        setFormData({});

        console.log(
          "[QuestionSetModal] Loading question sets for serviceId:",
          selectedServiceId,
        );
        const sets = await fetchQuestionSetsByService(selectedServiceId);
        console.log("Fetched question sets:", sets);
        const published = sets.filter(
          (s) => s.status === "published" && s.is_active !== false,
        );
        console.log("Filtered published sets:", published);
        if (published.length === 0) {
          // No published set: enable non-question flow, pick a fallback set id if any
          setNoPublishedQuestionSet(true);
          setFallbackQuestionSetId(sets.length > 0 ? sets[0].id : null);
          // Do not create a request yet; user can fill availability/contact and submit
          return;
        }
        const latest = published.reduce(
          (acc, s) => (s.version > acc.version ? s : acc),
          published[0],
        );
        const full = await fetchQuestionSet(latest.id);
        if (aborted) return;
        setQuestionSet(full);

        // Resume or create request
        const storageKey = `mm:req:${selectedServiceId}:${latest.id}:${placeId || ""}`;
        const existingId =
          typeof window !== "undefined"
            ? localStorage.getItem(storageKey)
            : null;
        if (existingId) {
          try {
            const existing = await getCustomerRequest(existingId);
            if (existing.question_set_id === latest.id) {
              setRequest(existing);
              setFormData(existing.answers || {});
              setFirstName(existing.first_name || "");
              setLastName(existing.last_name || "");
              setContactEmail(existing.contact_email || "");
              setContactPhone(existing.contact_phone || "");
              setPostalCode(existing.postal_code || "");
              setMessageToPro(existing.message_to_pro || "");
              setCurrentStep(existing.current_step || 0);
              return;
            }
          } catch {
            /* fall through to create */
          }
        }
        const created = await createCustomerRequest({
          service_id: selectedServiceId,
          question_set_id: latest.id,
          place_id: placeId,
          mester_id: mesterId,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          contact_email: contactEmail || undefined,
          contact_phone: contactPhone || undefined,
          postal_code: postalCode || undefined,
          message_to_pro: messageToPro || undefined,
          current_step: 0,
          answers: {},
        });
        setRequest(created);
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, created.id);
        }
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Failed to load question set");
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    load();
    return () => {
      aborted = true;
    };
  }, [open, selectedServiceId, showServiceSelection]);

  // Debounced autosave whenever answers change
  useEffect(() => {
    if (!request) return;
    const handle = setTimeout(() => {
      // Debug: inspect what we're saving
      // eslint-disable-next-line no-console
      console.log("[autosave] request", request.id, "answers", formData);
      void updateCustomerRequest(request.id, { answers: formData });
    }, 500);
    return () => clearTimeout(handle);
  }, [request, formData]);

  const questions: Question[] = useMemo(() => {
    const base = questionSet?.questions || [];
    if (!questionSet) return base;
    const hasTimeline = base.some((q) => q.key === "timeline");
    if (hasTimeline) return base;
    return [
      ...base,
      {
        id: `synthetic-${questionSet.id}-timeline`,
        question_set_id: questionSet.id,
        key: "timeline",
        label: "What's your timeline?",
        description: undefined,
        question_type: "select",
        is_required: false,
        is_active: true,
        sort_order: 10000,
        options: {
          choices: [
            "Urgent — need a pro right away\nWithin 48 hours",
            "Ready to hire, but not in a hurry\nWithin 7 days",
            "Still researching\nNo timeline in mind",
          ],
        },
        min_value: undefined,
        max_value: undefined,
        min_length: undefined,
        max_length: undefined,
        conditional_rules: undefined,
        allowed_file_types: undefined,
        max_file_size: undefined,
        created_at: new Date().toISOString(),
        updated_at: undefined,
      },
    ];
  }, [questionSet]);
  
  const stepSize = 1;
  const baseTotalSteps = Math.max(1, Math.ceil(questions.length / stepSize));
  const availabilityStepIndex = baseTotalSteps; // availability after questions
  const contactStepIndex = baseTotalSteps + 1; // contact details
  const messageStepIndex = baseTotalSteps + 2; // message to pro (separate)
  const totalSteps = baseTotalSteps + 3;
  const currentQuestions =
    currentStep < baseTotalSteps
      ? questions.slice(currentStep * stepSize, (currentStep + 1) * stepSize)
      : [];
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  // If there is no published question set, jump straight to availability step
  useEffect(() => {
    if (noPublishedQuestionSet) {
      setCurrentStep(availabilityStepIndex);
    }
  }, [noPublishedQuestionSet, availabilityStepIndex]);

  // Validation function to check if current step is valid
  const isCurrentStepValid = useMemo(() => {
    if (currentStep < baseTotalSteps) {
      // Check if all required questions in current step are answered
      return currentQuestions.every((q) => {
        if (!q.is_required) return true;
        const value = formData[q.key];

        // Check different question types
        switch (q.question_type) {
          case "text":
          case "number":
          case "date":
            return value && value.toString().trim() !== "";
          case "boolean":
            return value !== undefined && value !== null;
          case "select":
            return value && value.toString().trim() !== "";
          case "multi_select":
            return Array.isArray(value) && value.length > 0;
          case "file":
            return value !== null && value !== undefined;
          default:
            return true;
        }
      });
    } else if (currentStep === availabilityStepIndex) {
      // Availability step: accept either array of slots or weekly object
      const availability = formData["availability"];
      if (!availability) return true; // optional
      if (Array.isArray(availability)) return true; // legacy slot list still accepted
      const weekly = availability as WeeklyAvailability;
      const hasDays = Array.isArray(weekly.days) && weekly.days.length > 0;
      const [sh, sm] = String(weekly.start || "").split(":").map((x) => parseInt(x, 10));
      const [eh, em] = String(weekly.end || "").split(":").map((x) => parseInt(x, 10));
      const startMinutes = (Number.isFinite(sh) ? sh : -1) * 60 + (Number.isFinite(sm) ? sm : 0);
      const endMinutes = (Number.isFinite(eh) ? eh : -1) * 60 + (Number.isFinite(em) ? em : 0);
      return hasDays && endMinutes > startMinutes;
    } else if (currentStep === contactStepIndex) {
      // Contact step - require at least email or phone
      return contactEmail.trim() !== "" || contactPhone.trim() !== "";
    } else if (currentStep === messageStepIndex) {
      // Message step is optional (always valid)
      return true;
    }
    return true;
  }, [
    currentStep,
    currentQuestions,
    formData,
    contactEmail,
    contactPhone,
    baseTotalSteps,
    availabilityStepIndex,
    contactStepIndex,
  ]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl p-0 h-[80vh] max-h-[600px]">
        <Card className="p-0 flex flex-col h-[80vh] max-h-[600px] gap-0">
          {/* Progress bar in header position */}
          {totalSteps > 1 && (
            <div className="px-18 py-6 flex-shrink-0">
              <div className="w-full h-[5px] rounded">
                <div
                  className="h-full bg-primary rounded transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Scrollable content area */}
          <CardContent className="px-8 pb-8 flex-1 overflow-y-auto">
            {loading && <div className="text-gray-600">Loading…</div>}
            {!loading && error && <div className="text-red-600">{error}</div>}

            {/* Service Selection Step */}
            {!loading &&
              !error &&
              showServiceSelection &&
              availableServices.length > 0 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Select a Service
                    </h2>
                    <p className="text-gray-600">
                      Choose the service you&apos;d like to request
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {availableServices.map((service) => (
                      <button
                        key={service.service_id}
                        onClick={() => {
                          setSelectedServiceId(service.service_id);
                          setShowServiceSelection(false);
                        }}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <h3 className="text-lg font-semibold text-gray-900">
                          {service.service?.name || "Service"}
                        </h3>
                        {service.service?.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {service.service.description}
                          </p>
                        )}
                        {(service.price_hour_min || service.price_hour_max) && (
                          <div className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">
                              ${service.price_hour_min}
                              {service.price_hour_max &&
                              service.price_hour_max !== service.price_hour_min
                                ? ` - $${service.price_hour_max}`
                                : ""}
                              /hour
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {!loading && !error && !showServiceSelection && (questionSet || noPublishedQuestionSet) && (
              <div className="space-y-5">
                {currentQuestions.length > 0 &&
                  currentQuestions.map((q) => {
                    const value = formData[q.key];
                    const isRequired = q.is_required;
                    const isEmpty =
                      !value ||
                      (typeof value === "string" && value.trim() === "") ||
                      (Array.isArray(value) && value.length === 0);
                    const showError = isRequired && isEmpty;

                    return (
                      <div key={q.id} className="space-y-2 mb-8">
                        <div className="flex flex-col items-center text-center gap-2 mb-6">
                          <label
                            className={`text-2xl font-medium text-gray-900`}
                          >
                            {q.label}
                          </label>
                          {q.description && (
                            <p className="text-sm text-gray-500">
                              {q.description}
                            </p>
                          )}
                        </div>
                        {renderInput(q, formData[q.key], (val) =>
                          setFormData((prev) => ({ ...prev, [q.key]: val })),
                        )}
                      </div>
                    );
                  })}
                {currentQuestions.length === 0 && currentStep === availabilityStepIndex && (
                  <AvailabilityStep
                    value={formData["availability"]}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, availability: val }))
                    }
                  />
                )}

                {currentQuestions.length === 0 && currentStep === contactStepIndex && (
                  <div className="space-y-5 ">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your contact details</h2>
                      <p className="text-gray-600">We’ll share this with the pro so they can respond.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          First Name
                        </label>
                        <Input
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) =>
                            setFirstName((e.target as HTMLInputElement).value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) =>
                            setLastName((e.target as HTMLInputElement).value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Email
                        </label>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={contactEmail}
                          onChange={(e) =>
                            setContactEmail(
                              (e.target as HTMLInputElement).value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Phone
                        </label>
                        <Input
                          type="tel"
                          placeholder="+36 30 123 4567"
                          value={contactPhone}
                          onChange={(e) =>
                            setContactPhone(
                              (e.target as HTMLInputElement).value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          ZIP Code
                        </label>
                        <Input
                          placeholder="1011"
                          value={postalCode}
                          onChange={(e) =>
                            setPostalCode(
                              (e.target as HTMLInputElement).value,
                            )
                          }
                        />
                      </div>
                    </div>
                    {!isCurrentStepValid && (
                      <div className="text-center">
                        <p className="text-sm text-red-600">
                          Please provide at least an email or phone number to
                          continue
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {currentQuestions.length === 0 && currentStep === messageStepIndex && (
                  <div className="space-y-5 ">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Message to the pro</h2>
                      <p className="text-gray-600">Add any details that help the pro give an accurate quote.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Message
                      </label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                        rows={3}
                        placeholder="Describe the job, location specifics, timing, budget or photos you plan to share."
                        value={messageToPro}
                        onChange={(e) =>
                          setMessageToPro(
                            (e.target as HTMLTextAreaElement).value,
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {/* Fixed footer */}
          {!showServiceSelection && (
            <CardFooter className="px-6 py-4  bg-white flex-shrink-0">
              <div className="w-full flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size={"lg"}
                  className="px-12 h-auto py-3"
                  onClick={() => {
                    const prevStep = Math.max(0, currentStep - 1);
                    setCurrentStep(prevStep);
                    if (request) {
                      void updateCustomerRequest(request.id, {
                        current_step: prevStep,
                        answers: formData,
                      });
                    }
                  }}
                  disabled={
                    currentStep === 0 || loading || !!error
                  }
                >
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  {/* <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button> */}
                  <Button
                    size={"lg"}
                    className="px-12 h-auto py-3"
                    onClick={async () => {
                      if (currentStep < totalSteps - 1) {
                        const nextStep = Math.min(
                          totalSteps - 1,
                          currentStep + 1,
                        );
                        setCurrentStep(nextStep);
                        if (request) {
                          void updateCustomerRequest(request.id, {
                            current_step: nextStep,
                            mester_id: mesterId,
                            answers: formData,
                            first_name: firstName || undefined,
                            last_name: lastName || undefined,
                            contact_email: contactEmail || undefined,
                            contact_phone: contactPhone || undefined,
                            postal_code: postalCode || undefined,
                            message_to_pro: messageToPro || undefined,
                          });
                        }
                      } else {
                        // Check if user is authenticated before submitting
                        if (!isAuthenticated) {
                          // Store the current URL for redirect after sign-in
                          if (typeof window !== "undefined") {
                            sessionStorage.setItem("returnUrl", router.asPath);
                          }
                          // Show toast notification
                          toast.info("Please sign in to submit your request", {
                            description:
                              "You'll be redirected back to this page after signing in",
                            duration: 4000,
                          });
                          // Redirect to signup page after a brief delay
                          setTimeout(() => {
                            router.push("/signup");
                          }, 500);
                          return;
                        }

                        // Only mark as OPEN if we're on the final step with valid contact info
                        const isLastStep = currentStep === totalSteps - 1;
                        const hasContactInfo =
                          (contactEmail && contactEmail.trim() !== "") ||
                          (contactPhone && contactPhone.trim() !== "");

                        // Ensure the latest answers are saved before submit
                        if (!request) {
                          // Create a request on submit if none exists yet (no published question set path)
                          if (!fallbackQuestionSetId) {
                            toast.error("This service is not ready to accept requests yet.");
                            return;
                          }
                          try {
                            const created = await createCustomerRequest({
                              service_id: selectedServiceId,
                              question_set_id: fallbackQuestionSetId,
                              place_id: placeId,
                              mester_id: mesterId,
                              first_name: firstName || undefined,
                              last_name: lastName || undefined,
                              contact_email: contactEmail || undefined,
                              contact_phone: contactPhone || undefined,
                              postal_code: postalCode || undefined,
                              message_to_pro: messageToPro || undefined,
                              current_step: currentStep,
                              answers: formData,
                            });
                            setRequest(created);
                          } catch (e) {
                            console.error("Failed to create request without published question set", e);
                            toast.error("Could not create your request. Please try again later.");
                            return;
                          }
                        }
                        if (request || true) {
                          try {
                            // Debug: inspect final submit payload
                            // eslint-disable-next-line no-console
                            console.log(
                              "[submit] request",
                              request?.id,
                              "isLastStep:",
                              isLastStep,
                              "hasContactInfo:",
                              hasContactInfo,
                              "answers",
                              formData,
                            );

                            // Only set status to OPEN if form is fully completed
                            const updatePayload: any = {
                              answers: formData,
                              mester_id: mesterId,
                              first_name: firstName || undefined,
                              last_name: lastName || undefined,
                              contact_email: contactEmail || undefined,
                              contact_phone: contactPhone || undefined,
                              postal_code: postalCode || undefined,
                              message_to_pro: messageToPro || undefined,
                            };

                            // ONLY set to OPEN if on final step with contact info
                            if (isLastStep && hasContactInfo) {
                              updatePayload.status = "OPEN";
                              console.log(
                                "[submit] Setting status to OPEN - form completed",
                              );
                            } else {
                              console.log(
                                "[submit] Keeping status as DRAFT - form incomplete",
                              );
                            }

                            if (request) {
                              await updateCustomerRequest(
                                request.id,
                                updatePayload,
                              );
                            }
                          } catch (e) {
                            console.error(
                              "[submit] Error updating request:",
                              e,
                            );
                            // no-op fallback; UI can still proceed
                          }
                        }
                        // Signal submission to instant-results page
                        if (typeof window !== "undefined") {
                          const key = `mm:submitted:${selectedServiceId}:${placeId || ""}`;
                          try {
                            window.localStorage.setItem(key, "1");
                          } catch {}
                        }
                        onClose();
                      }
                    }}
                    disabled={
                      loading || !!error || !isCurrentStepValid
                    }
                  >
                    {currentStep < totalSteps - 1 ? "Next" : "Submit"}
                  </Button>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
}

function renderInput(q: Question, value: any, onChange: (v: any) => void) {
  switch (q.question_type) {
    case "text":
      return (
        <Input
          placeholder="Enter your answer…"
          value={value || ""}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          minLength={q.min_length}
          maxLength={q.max_length}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          placeholder="Enter a number…"
          value={value ?? ""}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          min={q.min_value}
          max={q.max_value}
        />
      );
    case "boolean":
      return (
        <div className="question-option-container">
          <div className="question-option-item">
            <input
              type="radio"
              name={q.key}
              checked={value === true}
              onChange={() => onChange(true)}
              className="question-option-input"
              id={`${q.key}-yes`}
            />
            <label htmlFor={`${q.key}-yes`} className="question-option-label">
              Yes
            </label>
          </div>
          <div className="question-option-item">
            <input
              type="radio"
              name={q.key}
              checked={value === false}
              onChange={() => onChange(false)}
              className="question-option-input"
              id={`${q.key}-no`}
            />
            <label htmlFor={`${q.key}-no`} className="question-option-label">
              No
            </label>
          </div>
        </div>
      );
    case "select":
      return (
        <div className="question-option-container">
          {q.options?.choices?.map((choice: any, idx: number) => {
            const choiceValue =
              typeof choice === "string" ? choice : choice.value;
            const choiceLabel =
              typeof choice === "string" ? choice : choice.label;
            const isLast = idx === (q.options?.choices?.length || 0) - 1;
            return (
              <div
                key={idx}
                className={`question-option-item ${isLast ? "border-b-0" : ""}`}
              >
                <input
                  type="radio"
                  name={q.key}
                  value={choiceValue}
                  checked={value === choiceValue}
                  onChange={() => onChange(choiceValue)}
                  className="question-option-input"
                  id={`${q.key}-${idx}`}
                />
                <label
                  htmlFor={`${q.key}-${idx}`}
                  className="question-option-label"
                >
                  {choiceLabel}
                </label>
              </div>
            );
          })}
        </div>
      );
    case "multi_select":
      return (
        <div className="question-option-container">
          {q.options?.choices?.map((choice: any, idx: number) => {
            const choiceValue =
              typeof choice === "string" ? choice : choice.value;
            const choiceLabel =
              typeof choice === "string" ? choice : choice.label;
            const arr: string[] = Array.isArray(value) ? value : [];
            const checked = arr.includes(choiceValue);
            const isLast = idx === (q.options?.choices?.length || 0) - 1;
            return (
              <div
                key={idx}
                className={`question-option-item ${isLast ? "border-b-0" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.currentTarget.checked
                      ? [...arr, choiceValue]
                      : arr.filter((v) => v !== choiceValue);
                    onChange(next);
                  }}
                  className="question-option-checkbox"
                  id={`${q.key}-${idx}`}
                />
                <label
                  htmlFor={`${q.key}-${idx}`}
                  className="question-option-label"
                >
                  {choiceLabel}
                </label>
              </div>
            );
          })}
        </div>
      );
    case "date":
      return (
        <Input
          type="date"
          value={value || ""}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        />
      );
    case "file":
      return (
        <input
          type="file"
          onChange={(e) =>
            onChange((e.target as HTMLInputElement).files?.[0] || null)
          }
          accept={q.allowed_file_types?.join(",")}
        />
      );
    default:
      return (
        <div className="text-gray-500 italic">Unsupported question type</div>
      );
  }
}
