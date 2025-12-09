import { LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  color: string
}

interface FeatureShowcaseProps {
  features: Feature[]
}

export function FeatureShowcase({ features }: FeatureShowcaseProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {features.map((feature, index) => {
        const Icon = feature.icon
        return (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className={`w-12 h-12 ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
          </div>
        )
      })}
    </div>
  )
}
