import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl, utilityName, city, state } = await request.json();

    if (!pdfUrl || !utilityName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: pdfUrl and utilityName' 
      });
    }

    console.log(`🔧 Starting AI-powered PDF analysis for ${utilityName}`);

    // Step 1: Extract text from PDF using Python
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const { stdout, stderr } = await execAsync(
      `python3 extract_pdf_text.py "${pdfUrl}"`
    );

    if (stderr && !stderr.includes('NotOpenSSLWarning')) {
      console.error('Python extraction error:', stderr);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to extract text from PDF',
        details: stderr
      });
    }

    const extractionResult = JSON.parse(stdout);
    const extractedText = extractionResult.text;

    if (!extractedText || extractedText.includes('Error extracting text')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to extract text from PDF',
        details: extractedText
      });
    }

    console.log(`🔧 Extracted ${extractedText.length} characters from PDF`);

    // Step 2: Use AI to analyze the text and extract chlorine data
    const aiAnalysisPrompt = `
You are an expert water quality analyst. Analyze this Consumer Confidence Report (CCR) text and extract chlorine/disinfectant residual data.

CRITICAL: You must search through the ENTIRE text for ANY mention of chlorine, disinfectant residual, sodium hypochlorite, or similar disinfectant compounds. The data might be presented in various formats:
- Tables with chlorine levels
- Text mentioning average, range, or specific values
- Different units (ppm, mg/L, etc.)
- Different compound names (chlorine, sodium hypochlorite, hypochlorite, disinfectant residual, etc.)
- Data might be in different sections of the report
- Look for patterns like "Chlorine (ppm)", "Disinfectant Residual", "Sodium Hypochlorite", etc.

SEARCH STRATEGY:
1. Look for tables with chlorine/disinfectant data
2. Search for text mentioning chlorine levels with numbers
3. Look for ranges (e.g., "0.8-2.7", "0.20-0.35")
4. Find averages, minimums, maximums
5. Check for different compound names
6. Look in different sections of the report

Extract the following information if available:
1. Average chlorine/disinfectant level
2. Minimum chlorine/disinfectant level  
3. Maximum chlorine/disinfectant level
4. Number of samples tested
5. The specific compound name found
6. Any additional context about the disinfectant

Return your analysis as a JSON object with this exact structure:
{
  "chlorineData": {
    "averageChlorine": <number or null>,
    "minChlorine": <number or null>, 
    "maxChlorine": <number or null>,
    "sampleCount": <number or null>,
    "compound": "<string or null>",
    "context": "<string describing what was found>",
    "confidence": <number 0-100 indicating confidence in the extraction>
  },
  "analysis": "<detailed explanation of what was found and how it was interpreted>"
}

If no chlorine data is found, set all numeric values to null and explain why in the analysis field.

CCR Text to analyze (FULL TEXT):
${extractedText}
`;

    // Use OpenAI to analyze the text
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert water quality analyst. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: aiAnalysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to analyze PDF with AI',
        details: errorText
      });
    }

    const aiResult = await openaiResponse.json();
    const aiAnalysis = aiResult.choices[0].message.content;

    let chlorineData;
    try {
      chlorineData = JSON.parse(aiAnalysis);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiAnalysis);
      return NextResponse.json({ 
        success: false, 
        error: 'AI analysis returned invalid JSON',
        details: aiAnalysis
      });
    }

    console.log('🔧 AI Analysis Result:', chlorineData);

    // Step 3: Store the result in database
    const { data: insertResult, error: insertError } = await supabase
      .from('chlorine_data')
      .insert({
        pwsid: 'TEMP_' + Date.now(), // Temporary PWSID, will be updated by calling function
        utility_name: utilityName,
        average_chlorine_ppm: chlorineData.chlorineData?.averageChlorine,
        min_chlorine_ppm: chlorineData.chlorineData?.minChlorine,
        max_chlorine_ppm: chlorineData.chlorineData?.maxChlorine,
        sample_count: chlorineData.chlorineData?.sampleCount,
        source_url: pdfUrl,
        data_source: 'AI-powered PDF Analysis',
        notes: `AI Analysis: ${chlorineData.analysis}. Context: ${chlorineData.chlorineData?.context}. Confidence: ${chlorineData.chlorineData?.confidence}%`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to store data in database',
        details: insertError.message
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        chlorineData: chlorineData.chlorineData,
        analysis: chlorineData.analysis,
        utilityName,
        city,
        state,
        extractionMethod: 'AI-powered PDF Analysis',
        pdfUrl,
        databaseId: insertResult.id
      },
      source: 'AI PDF Analysis',
      pdfUrl,
      debug: {
        textLength: extractedText.length,
        textPreview: extractedText.substring(0, 500),
        confidence: chlorineData.chlorineData?.confidence
      }
    });

  } catch (error) {
    console.error('AI PDF extraction error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error during AI PDF extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
