'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { subscribeToAuthChanges } from '@/lib/auth';
import { 
  fetchProProfileByEmail, 
  fetchProStatus, 
  fetchMesterById,
  type ProProfile,
  type Mester,
  type MesterDetailResponse 
} from '@/lib/api';
import ProLayout from '@/components/pro/ProLayout';
import { 
  Star, 
  Phone, 
  Globe, 
  MapPin, 
  Calendar as CalendarIcon,
  Users, 
  Edit2,
  Award,
  ExternalLink,
  Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProStatus {
  is_pro: boolean;
  mester_id: string | null;
  logo_url: string | null;
  display_name: string | null;
}

export default function ProProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [mesterData, setMesterData] = useState<Mester | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      try {
        if (!user?.email) {
          router.replace('/login');
          return;
        }

        setUserEmail(user.email);

        // Fetch pro status
        const status = await fetchProStatus(user.email);
        setProStatus({
          is_pro: status.is_pro ?? false,
          mester_id: status.mester_id ?? null,
          logo_url: status.logo_url ?? null,
          display_name: status.display_name ?? null,
        });

        // Fetch full profile
        const prof = await fetchProProfileByEmail(user.email).catch(() => null);
        setProfile(prof || null);

        // Fetch complete mester data if we have a mester_id
        if (status.mester_id) {
          try {
            const mesterDetails: MesterDetailResponse = await fetchMesterById(status.mester_id);
            setMesterData(mesterDetails.mester);
          } catch (error) {
            console.error('Error fetching mester details:', error);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <ProLayout>
        <div className="text-gray-700">Loading your profile...</div>
      </ProLayout>
    );
  }

  // Get actual data from mester
  const rating = mesterData?.rating_avg || 0;
  const reviewCount = mesterData?.review_count || 0;
  const yearsExperience = mesterData?.years_experience || 0;
  
  // Calculate tier based on review count and rating (simplified logic)
  let profileTier = 'Starter';
  if (reviewCount >= 50 && rating >= 4.8) {
    profileTier = 'Top Pro';
  } else if (reviewCount >= 20 && rating >= 4.5) {
    profileTier = 'Gold';
  } else if (reviewCount >= 5 && rating >= 4.0) {
    profileTier = 'Silver';
  }

  return (
    <ProLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {proStatus?.logo_url ? (
                <img
                  src={proStatus.logo_url}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl">
                  {proStatus?.display_name?.[0]?.toUpperCase() || 'P'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {proStatus?.display_name || mesterData?.full_name || 'Your Business'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {rating > 0 ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">
                        {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                      Ask for Reviews
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link href="/pro/onboarding">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Button variant="outline" className="w-full justify-center">
              See how you rank
            </Button>
            {proStatus?.mester_id && (
              <Link href={`/mester/${proStatus.mester_id}`} target="_blank" className="w-full">
                <Button variant="outline" className="w-full gap-2">
                  View your profile as customer
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Path to Top Pro */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your path to Top Pro</h2>
            
            {/* Progress Bar */}
            <div className="relative mb-6">
              <div className="flex items-center justify-between">
                {/* Starter */}
                <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    profileTier === 'Starter' 
                      ? 'bg-blue-500 ring-4 ring-blue-100' 
                      : 'bg-white border-2 border-gray-300'
                  }`}>
                    <Award className={`h-5 w-5 ${
                      profileTier === 'Starter' ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1">Starter</span>
                </div>

                {/* Silver */}
                <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    profileTier === 'Silver' 
                      ? 'bg-gray-400 ring-4 ring-gray-200' 
                      : 'bg-white border-2 border-gray-300'
                  }`}>
                    <Award className={`h-5 w-5 ${
                      profileTier === 'Silver' ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1">Silver</span>
                </div>

                {/* Gold */}
                <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    profileTier === 'Gold' 
                      ? 'bg-yellow-500 ring-4 ring-yellow-100' 
                      : 'bg-white border-2 border-gray-300'
                  }`}>
                    <Award className={`h-5 w-5 ${
                      profileTier === 'Gold' ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1">Gold</span>
                </div>

                {/* Top Pro */}
                <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    profileTier === 'Top Pro' 
                      ? 'bg-blue-600 ring-4 ring-blue-100' 
                      : 'bg-white border-2 border-gray-300'
                  }`}>
                    <Award className={`h-5 w-5 ${
                      profileTier === 'Top Pro' ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1">Top Pro</span>
                </div>
              </div>

              {/* Progress line */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-0">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ 
                    width: profileTier === 'Starter' ? '0%' : 
                           profileTier === 'Silver' ? '33%' : 
                           profileTier === 'Gold' ? '66%' : '100%' 
                  }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-600">
              You&apos;re on your way to {profileTier === 'Top Pro' ? 'maintaining' : ''} {profileTier} status.{' '}
              <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                View details.
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">Phone</div>
                <div className="text-sm text-gray-900 mt-0.5">
                  {mesterData?.phone || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">Email</div>
                <div className="text-sm text-gray-900 mt-0.5">
                  {mesterData?.email || userEmail || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">Address</div>
                <div className="text-sm text-gray-900 mt-0.5">
                  {'Not provided'}
                </div>
              </div>
            </div>

            {/* Years of Experience */}
            {yearsExperience > 0 && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">Years of experience</div>
                  <div className="text-sm text-gray-900 mt-0.5">
                    {yearsExperience} {yearsExperience === 1 ? 'year' : 'years'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Introduction */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your introduction</h2>
              <Link href="/pro/onboarding">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  Edit
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {mesterData?.bio || 'Add an introduction to tell customers about your business and what makes you stand out.'}
            </p>
            
            {/* Skills */}
            {mesterData?.skills && mesterData.skills.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {mesterData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {mesterData?.languages && mesterData.languages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {mesterData.languages.map((lang, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviews</h2>
            {reviewCount === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No reviews yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Complete jobs and ask satisfied customers for reviews
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Reviews will be listed here */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProLayout>
  );
}

