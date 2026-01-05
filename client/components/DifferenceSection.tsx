'use client';

import { CreditCard, Users, Settings, ThumbsUp } from 'lucide-react';
import { useI18n } from '@/lib/contexts/I18nContext';

export default function DifferenceSection() {
  const { t } = useI18n();

  const features = [
  {
    icon: CreditCard,
    title: t('pro.difference.noFees.title'),
    description: t('pro.difference.noFees.description'),
  },
  {
    icon: Users,
    title: t('pro.difference.greatCustomers.title'),
    description: t('pro.difference.greatCustomers.description'),
  },
  {
    icon: Settings,
    title: t('pro.difference.control.title'),
    description: t('pro.difference.control.description'),
  },
];

  const comparisonFeatures = [
  { name: t('pro.difference.comparison.noFees'), ourService: true, others: false },
  { name: t('pro.difference.comparison.customerPicks'), ourService: true, others: false },
  { name: t('pro.difference.comparison.setPrices'), ourService: true, others: false },
  { name: t('pro.difference.comparison.competitionLimit'), ourService: true, others: false },
  { name: t('pro.difference.comparison.phoneNumbers'), ourService: true, others: true },
];

// Green thumbs up icon
const GreenThumbsUp = () => (
  <svg
    role="graphics-symbol"
    height="28"
    width="28"
    viewBox="0 0 28 28"
    xmlns="http://www.w3.org/2000/svg"
    style={{ color: '#16a34a' }}
    fill="currentColor"
  >
    <path d="M21.602 10.943h-6.325l.91-3.14c.517-2.088-.368-3.044-.945-3.43-.919-.614-2.398-.548-3.33.792L8 10.958v8.928C8.001 22.23 9.75 24 12.121 24h5.108c1.75 0 3.175-.952 3.909-2.607l2.634-5.894c.15-.348.229-.715.229-1.091v-1.169c0-1.459-.875-2.296-2.399-2.296zM5 10a.995.995 0 00-.999.99v11.017c0 .548.447.993 1 .993a.997.997 0 001-.993V10.99A.996.996 0 005 10z" />
  </svg>
);

// Gray thumbs down icon
const GrayThumbsDown = () => (
  <svg
    role="graphics-symbol"
    height="28"
    width="28"
    viewBox="0 0 28 28"
    xmlns="http://www.w3.org/2000/svg"
    style={{ color: '#9ca3af' }}
    fill="currentColor"
  >
    <path d="M6.009 13.593c0-.098.021-.194.058-.278l2.629-5.871c.286-.646.878-1.414 2.077-1.414h5.102c1.248 0 2.154.883 2.154 2.1v8.286l-3.591 5.256c-.289.416-.525.293-.571.264-.32-.214-.208-.891-.123-1.237l1.643-5.651H6.009v-1.455zm.39 3.464h6.325l-.91 3.14c-.517 2.087.369 3.044.944 3.43.92.614 2.4.548 3.331-.792L20 17.042V8.113C20 5.768 18.25 4 15.88 4h-5.108c-1.75 0-3.175.95-3.91 2.606L4.23 12.5c-.152.348-.229.715-.229 1.091v1.169c0 1.46.874 2.297 2.399 2.297zM23 18a.995.995 0 00.999-.99V5.993A.997.997 0 0023.001 5 .997.997 0 0022 5.993V17.01c0 .547.448.99 1.001.99z" />
  </svg>
);

  return (
    <div className="text-left md:text-center w-full py-12 md:py-16 px-4">
      <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 text-left md:text-center">
        {t('pro.difference.heading')}
      </h2>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-8 md:mt-12">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="flex text-left mb-6 md:mb-8">
              <div className="max-w-[64px] mr-4 flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--primary))', color: 'white' }}
                >
                  <Icon className="w-8 h-8" />
                </div>
              </div>
              <div>
                <div className="text-xl font-semibold mb-2">{feature.title}</div>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="mt-12 md:mt-16 max-w-5xl mx-auto">
        <div className="shadow-lg rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 md:px-8 w-1/3">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    {t('pro.difference.comparison.features')}
                  </p>
                </th>
                <th className="text-center py-4 px-4 w-1/3">
                  <div className="flex items-center justify-center">
                    <span
                      className="text-2xl md:text-2xl font-bold"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      Mestermind
                    </span>
                  </div>
                </th>
                <th className="text-center py-4 px-4 md:px-8 w-1/3">
                  <div className="hidden md:block text-xl font-semibold text-gray-700">
                    {t('pro.difference.comparison.otherServices')}
                  </div>
                  <div className="md:hidden text-lg font-semibold text-gray-700">{t('pro.difference.comparison.others')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((feature, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-6 px-4 md:px-8 border-r border-gray-200">
                    <div className="hidden md:block text-lg font-medium">
                      {feature.name}
                    </div>
                    <div className="md:hidden text-base font-medium">{feature.name}</div>
                  </td>
                  <td className="py-6 px-4 text-center">
                    {feature.ourService ? <GreenThumbsUp /> : <GrayThumbsDown />}
                  </td>
                  <td className="py-6 px-4 md:px-8 text-center">
                    {feature.others ? <GreenThumbsUp /> : <GrayThumbsDown />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
