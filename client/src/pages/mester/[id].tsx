import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { fetchMesterById, type MesterDetailResponse } from "@/lib/api";
import QuestionSetModal from "@/components/QuestionSetModal";
import MesterProfilePage from "@/components/MesterProfilePage";

export default function MesterProfilePageWrapper() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [data, setData] = useState<MesterDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
    return () => { aborted = true; };
  }, [id]);

  const handleRequestQuote = () => {
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
          serviceId={data?.services[0]?.service_id || ''}
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


