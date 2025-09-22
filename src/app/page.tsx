import WaterQualityCalculatorNew from '@/components/WaterQualityCalculatorNew'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <WaterQualityCalculatorNew />
      </div>
    </div>
  )
}
