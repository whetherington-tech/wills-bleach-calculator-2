'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChlorineChartProps {
  chlorinePPM: number
  bleachEquivalent: number
  dailyIntake: number
  yearlyIntake: number
}

export default function ChlorineChart({
  chlorinePPM,
  bleachEquivalent,
  dailyIntake,
  yearlyIntake
}: ChlorineChartProps) {
  // Comparison data for bar chart
  const comparisonData = [
    {
      name: 'Your Water',
      value: chlorinePPM,
      color: '#3B82F6'
    },
    {
      name: 'EPA Limit',
      value: 4.0,
      color: '#EF4444'
    },
    {
      name: 'Typical Range Low',
      value: 0.2,
      color: '#10B981'
    },
    {
      name: 'Typical Range High',
      value: 2.0,
      color: '#F59E0B'
    }
  ]

  // Note: Annual breakdown data available for future pie chart implementation

  const formatTooltip = (value: number, name: string) => {
    if (name.includes('PPM') || name === 'value') {
      return [`${value.toFixed(2)} PPM`, name]
    }
    return [`${value.toFixed(1)} mg`, name]
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
        📊 Chlorine Level Analysis
      </h3>

      {/* Chlorine Comparison Bar Chart */}
      <div>
        <h4 className="text-lg font-medium text-gray-700 mb-4">
          Chlorine Levels Comparison (PPM)
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'PPM', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={formatTooltip}
                labelStyle={{ color: '#374151' }}
                contentStyle={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem'
                }}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-sm text-gray-600 space-y-1">
          <p>• <span className="font-medium">Your Water:</span> {chlorinePPM.toFixed(2)} PPM</p>
          <p>• <span className="font-medium">EPA Safety Limit:</span> 4.0 PPM maximum</p>
          <p>• <span className="font-medium">Typical Range:</span> 0.2 - 2.0 PPM</p>
        </div>
      </div>

      {/* Fun Facts Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-800 mb-4">
          🔬 Quick Facts About Your Chlorine Intake
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {dailyIntake.toFixed(1)} mg
            </div>
            <div className="text-gray-600">Daily chlorine intake</div>
            <div className="text-xs text-gray-500 mt-1">
              About {(dailyIntake / 325 * 100).toFixed(1)}% of a regular aspirin
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {(bleachEquivalent * 237).toFixed(0)} ml
            </div>
            <div className="text-gray-600">Bleach equivalent (yearly)</div>
            <div className="text-xs text-gray-500 mt-1">
              About {(bleachEquivalent * 237 / 473).toFixed(1)} standard water bottles
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {(yearlyIntake / 1000).toFixed(2)} g
            </div>
            <div className="text-gray-600">Total yearly intake</div>
            <div className="text-xs text-gray-500 mt-1">
              About {(yearlyIntake / 1000 / 0.5).toFixed(1)} sugar packets worth
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {((chlorinePPM / 4.0) * 100).toFixed(0)}%
            </div>
            <div className="text-gray-600">Of EPA safety limit</div>
            <div className="text-xs text-gray-500 mt-1">
              {chlorinePPM < 2 ? 'Well within safe range' :
               chlorinePPM < 3 ? 'Higher than typical' : 'High but still safe'}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={`
        rounded-lg p-4 border-2
        ${chlorinePPM <= 1.0 ? 'bg-green-50 border-green-200' : ''}
        ${chlorinePPM > 1.0 && chlorinePPM <= 2.0 ? 'bg-yellow-50 border-yellow-200' : ''}
        ${chlorinePPM > 2.0 && chlorinePPM <= 3.0 ? 'bg-orange-50 border-orange-200' : ''}
        ${chlorinePPM > 3.0 ? 'bg-red-50 border-red-200' : ''}
      `}>
        <h4 className="font-medium mb-2">
          {chlorinePPM <= 1.0 ? '✅ Low Chlorine Level' : ''}
          {chlorinePPM > 1.0 && chlorinePPM <= 2.0 ? '⚠️ Moderate Chlorine Level' : ''}
          {chlorinePPM > 2.0 && chlorinePPM <= 3.0 ? '🔶 High Chlorine Level' : ''}
          {chlorinePPM > 3.0 ? '🚨 Very High Chlorine Level' : ''}
        </h4>
        <p className="text-sm text-gray-700">
          {chlorinePPM <= 1.0 &&
            'Your water has relatively low chlorine levels, which is good for taste and reduces chemical exposure.'}
          {chlorinePPM > 1.0 && chlorinePPM <= 2.0 &&
            'Your water has typical chlorine levels found in most municipal water systems.'}
          {chlorinePPM > 2.0 && chlorinePPM <= 3.0 &&
            'Your water has higher than average chlorine levels, but still within EPA safety guidelines.'}
          {chlorinePPM > 3.0 &&
            'Your water has very high chlorine levels. Consider contacting your water utility for more information.'}
        </p>
      </div>
    </div>
  )
}