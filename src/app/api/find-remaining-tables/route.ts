import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Try different approaches to find all tables
    const approaches = []

    // Approach 1: Try common EPA table naming patterns
    const epaPatterns = [
      'sdwis_',
      'epa_',
      'echo_',
      'wqp_',
      'violations',
      'samples',
      'results',
      'data',
      'monitoring',
      'compliance',
      'enforcement',
      'facilities',
      'systems',
      'reports',
      'records',
      'tests',
      'measurements',
      'contaminants',
      'disinfection',
      'treatment',
      'chlorine',
      'residual',
      'free',
      'total',
      'byproducts',
      'dbp',
      'lt2',
      'rtcr',
      'lcr',
      'lead',
      'copper',
      'turbidity',
      'coliform',
      'bacteria',
      'chemical',
      'physical',
      'radiological',
      'organic',
      'inorganic',
      'volatile',
      'synthetic',
      'pesticides',
      'herbicides',
      'trihalomethanes',
      'haloacetic',
      'bromate',
      'chlorite',
      'chlorate',
      'chloramines',
      'ammonia',
      'nitrate',
      'nitrite',
      'arsenic',
      'mercury',
      'cadmium',
      'chromium',
      'selenium',
      'thallium',
      'antimony',
      'barium',
      'beryllium',
      'cyanide',
      'fluoride',
      'manganese',
      'sodium',
      'sulfate',
      'total_dissolved_solids',
      'alkalinity',
      'hardness',
      'ph',
      'temperature',
      'conductivity',
      'turbidity',
      'color',
      'odor',
      'taste'
    ]

    const foundTables = []
    const tableDetails = []

    for (const pattern of epaPatterns) {
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from(pattern)
          .select('*')
          .limit(1)

        if (!sampleError && sampleData !== null) {
          foundTables.push(pattern)
          
          // Get column names
          const columns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
          
          // Get row count
          const { count, error: countError } = await supabase
            .from(pattern)
            .select('*', { count: 'exact', head: true })

          // Check for chlorine indicators
          const hasChlorineIndicators = columns.some(col => 
            col.toLowerCase().includes('chlorine') ||
            col.toLowerCase().includes('cl') ||
            col.toLowerCase().includes('residual') ||
            col.toLowerCase().includes('disinfection') ||
            col.toLowerCase().includes('contaminant') ||
            col.toLowerCase().includes('free') ||
            col.toLowerCase().includes('total') ||
            col.toLowerCase().includes('measure') ||
            col.toLowerCase().includes('result')
          )

          // Check for PWSID
          const hasPwsid = columns.some(col => 
            col.toLowerCase().includes('pwsid') ||
            col.toLowerCase().includes('pws_id')
          )

          tableDetails.push({
            table: pattern,
            columns: columns,
            totalRows: count || 0,
            hasChlorineIndicators,
            hasPwsid,
            sampleData: sampleData
          })
        }
      } catch (err) {
        // Table doesn't exist, continue
        continue
      }
    }

    // Approach 2: Try numbered tables (table1, table2, etc.)
    const numberedTables = []
    for (let i = 1; i <= 50; i++) {
      const tableName = `table${i}`
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!sampleError && sampleData !== null) {
          numberedTables.push(tableName)
        }
      } catch (err) {
        continue
      }
    }

    // Approach 3: Try common database table names
    const commonTables = [
      'users', 'accounts', 'profiles', 'settings', 'config', 'logs', 'sessions',
      'auth', 'permissions', 'roles', 'groups', 'organizations', 'companies',
      'contacts', 'addresses', 'locations', 'geography', 'coordinates',
      'files', 'documents', 'uploads', 'media', 'images', 'attachments',
      'categories', 'tags', 'labels', 'types', 'status', 'states',
      'transactions', 'payments', 'billing', 'invoices', 'orders',
      'products', 'services', 'items', 'inventory', 'stock',
      'customers', 'clients', 'vendors', 'suppliers', 'partners',
      'projects', 'tasks', 'assignments', 'schedules', 'events',
      'notifications', 'messages', 'communications', 'alerts',
      'reports', 'analytics', 'statistics', 'metrics', 'kpis',
      'audit', 'history', 'changes', 'versions', 'backups'
    ]

    const foundCommonTables = []
    for (const tableName of commonTables) {
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!sampleError && sampleData !== null) {
          foundCommonTables.push(tableName)
        }
      } catch (err) {
        continue
      }
    }

    return NextResponse.json({
      success: true,
      approaches: {
        epaPatterns: {
          found: foundTables,
          details: tableDetails,
          total: foundTables.length
        },
        numberedTables: {
          found: numberedTables,
          total: numberedTables.length
        },
        commonTables: {
          found: foundCommonTables,
          total: foundCommonTables.length
        }
      },
      summary: {
        totalTablesFound: foundTables.length + numberedTables.length + foundCommonTables.length,
        epaTables: foundTables.length,
        numberedTables: numberedTables.length,
        commonTables: foundCommonTables.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
