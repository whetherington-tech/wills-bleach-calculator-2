import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;
  
  try {
    const { pdfUrl, utilityName, city, state } = await request.json();

    if (!pdfUrl) {
      return NextResponse.json({ success: false, error: 'PDF URL is required' }, { status: 400 });
    }

    console.log(`🔧 Starting download-and-analyze for ${utilityName}`);
    console.log(`🔧 PDF URL: ${pdfUrl}`);

    // Step 1: Download PDF to server
    const downloadResponse = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/pdf,application/octet-stream,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow'
    });

    if (!downloadResponse.ok) {
      console.error(`🔧 Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to download PDF',
        details: `HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`,
        errorType: 'download_failed'
      }, { status: downloadResponse.status });
    }

    // Step 2: Save PDF to temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    tempFilePath = path.join(tempDir, `temp_pdf_${timestamp}.pdf`);
    
    const arrayBuffer = await downloadResponse.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    
    console.log(`🔧 PDF downloaded successfully: ${tempFilePath} (${arrayBuffer.byteLength} bytes)`);

    // Step 3: Extract text from local PDF using Python
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const { stdout, stderr } = await execAsync(
      `python3 extract_pdf_text.py "${tempFilePath}"`
    );

    if (stderr && !stderr.includes('NotOpenSSLWarning')) {
      console.error('Python extraction error:', stderr);
      return NextResponse.json({
        success: false,
        error: 'Failed to extract text from PDF',
        details: stderr,
        errorType: 'extraction_failed'
      });
    }

    const extractionResult = JSON.parse(stdout);
    const extractedText = extractionResult.text;

    if (!extractedText || extractedText.includes('Error extracting text')) {
      return NextResponse.json({
        success: false,
        error: 'Failed to extract text from PDF',
        details: extractedText,
        errorType: 'extraction_failed'
      });
    }

    console.log(`🔧 Extracted ${extractedText.length} characters from PDF`);

    // Step 4: Use AI to analyze the text and extract chlorine data
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
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
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
        details: errorText,
        errorType: 'ai_analysis_failed'
      }, { status: openaiResponse.status });
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices[0]?.message?.content;

    if (!aiContent) {
      return NextResponse.json({ success: false, error: 'AI analysis returned no content', errorType: 'ai_analysis_failed' }, { status: 500 });
    }

    let chlorineData;
    try {
      // Clean up the AI response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      chlorineData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ success: false, error: 'Failed to parse AI response', details: aiContent, errorType: 'ai_analysis_failed' }, { status: 500 });
    }

    if (!chlorineData || !chlorineData.chlorineData) {
      return NextResponse.json({ success: false, error: 'AI analysis did not return expected chlorineData structure', details: chlorineData, errorType: 'ai_analysis_failed' }, { status: 500 });
    }

    console.log('🔧 AI Analysis Result:', chlorineData);

    // Step 5: Store the result in database
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
        data_source: 'AI-powered PDF Analysis (Download Method)',
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
        details: insertError.message,
        errorType: 'database_error'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...chlorineData,
        utilityName,
        city,
        state,
        extractionMethod: 'AI-powered PDF Analysis (Download Method)',
        pdfUrl,
        databaseId: insertResult.id
      },
      source: 'AI PDF Analysis (Download Method)',
      pdfUrl,
      debug: {
        textLength: extractedText.length,
        textPreview: extractedText.substring(0, 500),
        confidence: chlorineData.chlorineData?.confidence,
        downloadSize: arrayBuffer.byteLength
      }
    });

  } catch (error: any) {
    console.error('Internal server error during download-and-analyze:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during download-and-analyze',
      details: error.message,
      errorType: 'internal_error'
    }, { status: 500 });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🔧 Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('Failed to clean up temporary file:', cleanupError);
      }
    }
  }
}
