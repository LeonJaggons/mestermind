import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth } from "@/firebase";
import { toast } from "sonner";
import { fetchMesterById, type MesterDetailResponse } from "@/lib/api";
import QuestionSetModal from "@/components/QuestionSetModal";
import MesterProfilePage from "@/components/MesterProfilePage";

export default function MesterProfilePageWrapper() {
  const router = useRouter();
  const { id, service_pk } = router.query as {
    id?: string;
    service_pk?: string;
  };

  console.log("[MesterProfile] Mester ID:", id);
  console.log("[MesterProfile] Service PK from query:", service_pk);

  const [data, setData] = useState<MesterDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchMesterById(id);
        if (!aborted) setData(resp);
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Failed to load profile");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id]);

  const handleRequestQuote = () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store the current URL for redirect after sign-in
      if (typeof window !== "undefined") {
        sessionStorage.setItem("returnUrl", router.asPath);
      }
      // Show toast notification
      toast.info("Please sign in to request an estimate", {
        description: "You'll be redirected back to this page after signing in",
        duration: 4000,
      });
      // Redirect to signup page after a brief delay
      setTimeout(() => {
        router.push("/signup");
      }, 500);
      return;
    }
    setOpen(true);
  };

  const handleMessage = () => {
    // TODO: Implement messaging functionality
    console.log("Message functionality not implemented yet");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Profile not found</div>
      </div>
    );
  }

  return (
    <>
      <MesterProfilePage
        data={data}
        onRequestQuote={handleRequestQuote}
        onMessage={handleMessage}
      />

      {open && (
        <QuestionSetModal
          serviceId={service_pk || ""}
          mesterId={data?.mester.id}
          placeId={undefined}
          open={open}
          onClose={() => setOpen(false)}
          context="mester-profile"
        />
      )}
    </>
  );
}
