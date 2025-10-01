import { useState } from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Trophy, 
  MapPin, 
  MessageCircle, 
  Calendar,
  User,
  Clock,
  Users,
  Shield,
  CheckCircle,
  ChevronRight,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Twitter
} from 'lucide-react';
import { MesterDetailResponse } from '@/lib/api';

interface MesterProfilePageProps {
  data: MesterDetailResponse;
  onRequestQuote: () => void;
  onMessage: () => void;
}

export default function MesterProfilePage({ data, onRequestQuote, onMessage }: MesterProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'photos' | 'services' | 'credentials'>('about');
  
  const { mester, services } = data;
  
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-green-500 text-green-500" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-green-500/50 text-green-500" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }
    
    return stars;
  };

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'photos', label: 'Photos' },
    { id: 'services', label: 'Services' },
    { id: 'credentials', label: 'Credentials' }
  ] as const;

  return (
    <>
      <Head>
        <title>{mester.full_name} – Mestermind</title>
      </Head>
      
      <main className="min-h-screen bg-white">
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Mestermind</span>
              <ChevronRight className="h-4 w-4" />
              <span>Service Providers</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900 font-medium">{mester.full_name}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Header - Single Card */}
              <div className="flex align-middle">
                <div className="flex items-center gap-6">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {mester.logo_url ? (
                        <img 
                          src={mester.logo_url} 
                          alt={`${mester.full_name} logo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <User className={`h-12 w-12 text-gray-400 ${mester.logo_url ? 'hidden' : ''}`} />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{mester.full_name}</h1>
                    
                    {mester.rating_avg && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-lg font-semibold text-green-600">
                          {mester.rating_avg}
                        </span>
                        <div className="flex items-center gap-1">
                          {renderStars(mester.rating_avg)}
                        </div>
                        <span className="text-gray-600">
                          ({mester.review_count})
                        </span>
                      </div>
                    )}

                    {/* Top Pro Badge */}
                    {mester.rating_avg && mester.rating_avg >= 4.5 && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 mb-3">
                        <Star className="h-3 w-3 mr-1" />
                        Top Pro
                      </Badge>
                    )}

                    {/* Hires Count */}
                    <div className="text-gray-600">
                      {mester.review_count} hires on Mestermind
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="space-y-8">
                {activeTab === 'about' && (
                  <>
                    {/* About Section */}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                      {mester.bio ? (
                        <div className="prose prose-gray max-w-none">
                          <p className="text-gray-700 leading-relaxed">
                            {mester.bio}
                            <button className="text-blue-600 hover:underline ml-1">
                              Read More
                            </button>
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-600">No description available.</p>
                      )}
                    </div>

                    {/* Overview Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Overview</h3>
                        <div className="space-y-3">
                          {mester.rating_avg && mester.rating_avg >= 4.5 && (
                            <div className="flex items-center gap-3">
                              <Badge className="bg-blue-100 text-blue-800">
                                <Star className="h-3 w-3 mr-1" />
                                Current Top Pro
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Trophy className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">Hired {mester.review_count} times</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">Serves Budapest, Hungary</span>
                          </div>
                          {mester.is_verified && (
                            <div className="flex items-center gap-3">
                              <Shield className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Background checked</span>
                            </div>
                          )}
                          {mester.years_experience && (
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">{mester.years_experience} years in business</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Business Hours */}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Business hours</h3>
                          <p className="text-gray-600">This pro hasn't listed their business hours.</p>
                        </div>

                        {/* Payment Methods */}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Payment methods</h3>
                          <p className="text-gray-600">This pro accepts payments via Cash, Bank Transfer, and PayPal.</p>
                        </div>

                        {/* Social Media */}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Social media</h3>
                          <div className="space-y-2">
                            <a href="#" className="text-blue-600 hover:underline">
                              Instagram
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'services' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Services</h2>
                    {services.length === 0 ? (
                      <p className="text-gray-600">No services listed.</p>
                    ) : (
                      <div className="space-y-4">
                        {services.map((service) => (
                          <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">Service ID: {service.service_id}</h3>
                              <div className="text-right">
                                {service.price_hour_min != null || service.price_hour_max != null ? (
                                  <span className="text-lg font-semibold text-gray-900">
                                    {service.price_hour_min != null ? `${service.price_hour_min}` : "?"}
                                    {" – "}
                                    {service.price_hour_max != null ? `${service.price_hour_max}` : "?"} Ft/hr
                                  </span>
                                ) : (
                                  <span className="text-lg font-semibold text-gray-900">Contact for pricing</span>
                                )}
                              </div>
                            </div>
                            {service.pricing_notes && (
                              <p className="text-gray-600 mb-3">{service.pricing_notes}</p>
                            )}
                            <Button onClick={onRequestQuote} className="bg-blue-600 hover:bg-blue-700">
                              Request Estimate
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'photos' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Photos</h2>
                    <p className="text-gray-600">No photos available.</p>
                  </div>
                )}

                {activeTab === 'credentials' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Credentials</h2>
                    <div className="space-y-4">
                      {mester.is_verified && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <h3 className="font-semibold text-green-900">Background Checked</h3>
                            <p className="text-green-700 text-sm">This pro has passed a background check.</p>
                          </div>
                        </div>
                      )}
                      {mester.years_experience && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                          <Clock className="h-6 w-6 text-blue-600" />
                          <div>
                            <h3 className="font-semibold text-blue-900">Experience</h3>
                            <p className="text-blue-700 text-sm">{mester.years_experience} years in business</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Contact Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card className="p-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>Contact for price</span>
                    </div>
                    <button className="text-blue-600 hover:underline text-sm">
                      View details
                    </button>
                  </div>

                  <Button 
                    onClick={onRequestQuote}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 mb-4"
                  >
                    Request estimate
                  </Button>

                  <div className="flex items-center gap-2 text-sm text-green-600 mb-6">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Online now</span>
                  </div>

                  {/* Mestermind Guarantee */}
                  <div className="border-t pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-700">
                          If you hire this pro, you're covered by a money-back guarantee. 
                          <button className="text-blue-600 hover:underline ml-1">
                            Learn more
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

        
        </div>
      </main>
    </>
  );
}