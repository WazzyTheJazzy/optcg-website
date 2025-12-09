import { Search, Package, Repeat } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: <Search className="w-12 h-12" />,
      title: 'Browse & Search',
      description: 'Explore our complete database of One Piece TCG cards with advanced filters',
      step: '1'
    },
    {
      icon: <Package className="w-12 h-12" />,
      title: 'Build Collection',
      description: 'Track your cards, monitor prices, and manage your wishlist effortlessly',
      step: '2'
    },
    {
      icon: <Repeat className="w-12 h-12" />,
      title: 'Trade Safely',
      description: 'Connect with collectors worldwide and complete secure trades',
      step: '3'
    }
  ]

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {steps.map((step, index) => (
        <div key={index} className="relative">
          {/* Step Number */}
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
            {step.step}
          </div>
          
          {/* Card */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:shadow-xl transition pt-12">
            <div className="text-red-600 mb-4 flex justify-center">
              {step.icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-center">{step.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              {step.description}
            </p>
          </div>

          {/* Arrow (except last item) */}
          {index < steps.length - 1 && (
            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
