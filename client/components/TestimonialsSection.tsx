'use client';

import { useState } from 'react';
import { Users, Settings, DollarSign, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/contexts/I18nContext';

export default function TestimonialsSection() {
  const { t } = useI18n();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedMobile, setExpandedMobile] = useState<number | null>(null);

  const benefits = [
  {
    icon: Users,
    text: t('pro.testimonials.benefit1'),
  },
  {
    icon: Settings,
    text: t('pro.testimonials.benefit2'),
  },
  {
    icon: DollarSign,
    text: t('pro.testimonials.benefit3'),
  },
  {
    icon: MessageCircle,
    text: t('pro.testimonials.benefit4'),
  },
];

  const testimonials = [
  {
    name: '',
    role: t('pro.testimonials.testimonial1.role'),
    quote: t('pro.testimonials.testimonial1.quote'),
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=600&fit=crop&q=80',
  },
  {
    name: t('pro.testimonials.testimonial2.name'),
    role: t('pro.testimonials.testimonial2.role'),
    quote: t('pro.testimonials.testimonial2.quote'),
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop&q=80',
  },
  {
    name: t('pro.testimonials.testimonial3.name'),
    role: t('pro.testimonials.testimonial3.role'),
    quote: t('pro.testimonials.testimonial3.quote'),
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=600&fit=crop&q=80',
  },
];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="w-full bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 text-left md:text-center px-4 md:px-0">
          {t('pro.testimonials.heading')}
        </h2>

        {/* Benefits Grid */}
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-12 md:mb-16 md:px-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <li key={index} className="flex items-start py-2">
                <Icon
                  className="w-7 h-7 mr-3 flex-shrink-0 mt-1"
                  style={{ color: 'hsl(var(--primary))' }}
                />
                <p className="text-base md:text-lg">{benefit.text}</p>
              </li>
            );
          })}
        </ul>

        {/* Testimonials Carousel */}
        <div className="relative">
          {/* Desktop Carousel */}
          <div className="hidden md:block relative">
            <div className="relative overflow-hidden rounded-lg">
              <div
                className="flex transition-transform duration-400 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="w-full flex-shrink-0 relative"
                    style={{ minHeight: '500px' }}
                  >
                    <img
                      src={testimonial.image}
                      alt={`Photo of ${testimonial.name}`}
                      className="w-full h-[500px] object-cover"
                    />
                    <div className="absolute w-1/2 right-0 top-0 bottom-0 bg-gradient-to-l from-black/60 to-transparent">
                      <div className="flex flex-col h-full justify-center items-center px-8">
                        <blockquote className="text-white text-xl md:text-2xl leading-relaxed mb-6 max-w-lg">
                          &quot;{testimonial.quote}&quot;
                        </blockquote>
                        <p className="text-white text-sm md:text-base">
                          {testimonial.name && <strong>{testimonial.name}</strong>}
                          {testimonial.name && <br />}
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows - Desktop */}
            <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
              <button
                onClick={prevSlide}
                className="pointer-events-auto ml-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-8 h-8 text-gray-900" />
              </button>
              <button
                onClick={nextSlide}
                className="pointer-events-auto mr-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-8 h-8 text-gray-900" />
              </button>
            </div>

            {/* Dots - Desktop */}
            <div className="flex items-center justify-center mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={currentSlide === index}
                  className={`w-3 h-3 rounded-full mx-2 transition-all ${
                    currentSlide === index
                      ? 'w-4 h-4'
                      : 'bg-gray-300'
                  }`}
                  style={
                    currentSlide === index
                      ? { backgroundColor: 'hsl(var(--primary))' }
                      : {}
                  }
                />
              ))}
            </div>
          </div>

          {/* Mobile Carousel */}
          <div className="md:hidden">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="mb-8">
                <div className="relative">
                  <img
                    src={testimonial.image}
                    alt={`Photo of ${testimonial.name}`}
                    className="w-full h-64 object-cover rounded-t-lg"
                  />
                  <div className="bg-white shadow-lg relative -mt-8 mx-6 p-6 rounded-lg">
                    <blockquote className="text-base mb-4">
                      &quot;{expandedMobile === index ? testimonial.quote : `${testimonial.quote.slice(0, 120)}...`}&quot;
                    </blockquote>
                    <button
                      onClick={() => setExpandedMobile(expandedMobile === index ? null : index)}
                      className="font-semibold mb-4"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      {t('common.see')} {expandedMobile === index ? t('pro.testimonials.seeLess') : t('pro.testimonials.seeMore')}
                    </button>
                    <p className="text-sm text-gray-600">
                      {testimonial.name && <strong>{testimonial.name}</strong>}
                      {testimonial.name && <br />}
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Dots - Mobile */}
            <div className="flex items-center justify-center mt-6">
              {testimonials.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full mx-2 bg-gray-400 ${
                    index === 0 ? 'w-4 h-4 bg-gray-700' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
