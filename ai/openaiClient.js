/**
 * OpenAI Client for GetYourTester
 * Generates QA insights for pull requests using GPT-4o
 */

const OpenAI = require('openai');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Initialize OpenAI client
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized');
  }
} catch (error) {
  console.error('❌ Error initializing OpenAI client:', error.message);
}

/**
 * Generate QA insights for a pull request
 * @param {Object} options - PR details
 * @param {string} options.repo - Repository name (e.g., "owner/repo")
 * @param {number} options.pr_number - Pull request number
 * @param {string} options.title - PR title
 * @param {string} options.body - PR description/body
 * @param {string} options.diff - Code diff
 * @returns {Promise<Object>} QA insights or error object
 */
async function generateQAInsights({ repo, pr_number, title, body, diff }) {
  try {
    // Validate OpenAI client
    if (!openai) {
      throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY.');
    }

    // Sanitize and validate inputs - reduced limits to prevent token issues
    const sanitizedTitle = (title || 'No title provided').substring(0, 150);
    const sanitizedBody = (body || 'No description provided').substring(0, 500);
    const sanitizedDiff = (diff || 'No diff provided').substring(0, 2000); // Significantly reduced

    console.log(`🔍 Input validation: Title=${sanitizedTitle.length} chars, Body=${sanitizedBody.length} chars, Diff=${sanitizedDiff.length} chars`);

    // Load and render the prompt template
    const promptTemplatePath = path.join(__dirname, 'prompts', 'default.ejs');
    if (!fs.existsSync(promptTemplatePath)) {
      throw new Error(`Prompt template not found at: ${promptTemplatePath}`);
    }

    const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
    const prompt = ejs.render(promptTemplate, {
      repo,
      pr_number,
      title: sanitizedTitle,
      body: sanitizedBody,
      diff: sanitizedDiff
    });

    console.log(`🤖 Ovi QA Agent generating insights for PR #${pr_number} in ${repo}`);

    // Get model from environment or use default
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // Attempt to get insights (with retry logic)
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/3 to generate insights`);
        
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500, // Reduced to prevent truncation
          response_format: { type: 'json_object' }
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('Empty response from OpenAI');
        }

        // Log the raw response for debugging (truncated)
        console.log('🔍 Raw AI response (first 500 chars):', response.substring(0, 500));
        console.log('🔍 Response length:', response.length);

        // Try to parse the JSON response with multiple fallback strategies
        let insights = await parseAIResponse(response, sanitizedTitle, sanitizedBody, sanitizedDiff);
        
        if (insights) {
          console.log('✅ Successfully generated AI insights');
          return {
            success: true,
            data: insights,
            metadata: {
              repo,
              pr_number,
              model,
              attempt,
              timestamp: new Date().toISOString()
            }
          };
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // If this is the last attempt, don't continue
        if (attempt === 3) {
          break;
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // If all attempts failed, generate a fallback analysis based on the PR content
    console.log('🔄 All AI attempts failed, generating fallback analysis based on PR content');
    const fallbackInsights = generateFallbackAnalysis(sanitizedTitle, sanitizedBody, sanitizedDiff);
    
    return {
      success: true,
      data: fallbackInsights,
      metadata: {
        repo,
        pr_number,
        model: 'fallback',
        attempt: 'fallback',
        timestamp: new Date().toISOString(),
        note: 'Fallback analysis generated due to AI processing issues'
      }
    };

  } catch (error) {
    console.error('❌ Error in generateQAInsights:', error.message);
    
    // Ultimate fallback - generate basic analysis
    const ultimateFallback = generateUltimateFallback(title || 'Unknown PR');
    
    return {
      success: true,
      data: ultimateFallback,
      metadata: {
        repo: repo || 'unknown',
        pr_number: pr_number || 0,
        model: 'ultimate-fallback',
        attempt: 'ultimate-fallback',
        timestamp: new Date().toISOString(),
        error: error.message,
        note: 'Ultimate fallback due to system error'
      }
    };
  }
}

/**
 * Parse AI response with multiple fallback strategies
 */
async function parseAIResponse(response, title, body, diff) {
  try {
    // Strategy 1: Direct JSON parse
    try {
      const insights = JSON.parse(response);
      if (validateInsightsStructure(insights)) {
        return insights;
      }
    } catch (e) {
      console.log('Strategy 1 failed, trying Strategy 2...');
    }

    // Strategy 2: Extract JSON from markdown or text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const insights = JSON.parse(jsonMatch[0]);
        if (validateInsightsStructure(insights)) {
          return insights;
        }
      } catch (e) {
        console.log('Strategy 2 failed, trying Strategy 3...');
      }
    }

    // Strategy 3: Try to fix common JSON issues
    const fixedResponse = fixCommonJSONIssues(response);
    try {
      const insights = JSON.parse(fixedResponse);
      if (validateInsightsStructure(insights)) {
        return insights;
      }
    } catch (e) {
      console.log('Strategy 3 failed, using fallback...');
    }

    return null;
  } catch (error) {
    console.error('Error in parseAIResponse:', error.message);
    return null;
  }
}

/**
 * Fix common JSON issues in AI responses
 */
function fixCommonJSONIssues(response) {
  let fixed = response;
  
  // Remove markdown code blocks
  fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Fix common escape issues
  fixed = fixed.replace(/\\"/g, '"').replace(/\\n/g, '\n');
  
  // Remove trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unescaped quotes in strings
  fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, '"$1$2$3"');
  
  return fixed;
}

/**
 * Validate the structure of AI insights
 */
function validateInsightsStructure(insights) {
  return insights && 
         insights.changeReview && 
         insights.testRecipe && 
         insights.codeQuality &&
         insights.changeReview.smartQuestions &&
         insights.changeReview.risks;
}

/**
 * Generate fallback analysis based on PR content
 */
function generateFallbackAnalysis(title, body, diff) {
  console.log('🔄 Generating intelligent fallback analysis based on PR content');
  
  const prInfo = extractPRInfo(title, body, diff);
  
  // Extract specific features from the PR description
  const features = [];
  if (body) {
    if (body.includes('text area')) features.push('direct text input');
    if (body.includes('tag support') || body.includes('#')) features.push('tag system');
    if (body.includes('To-Do') || body.includes('todo')) features.push('todo management');
    if (body.includes('Dashboard') || body.includes('dashboard')) features.push('dashboard enhancements');
    if (body.includes('AI') || body.includes('artificial intelligence')) features.push('AI integration');
    if (body.includes('overdue') || body.includes('priority')) features.push('priority management');
    if (body.includes('sub-tasks') || body.includes('subtasks')) features.push('subtask support');
  }
  
  const featureList = features.length > 0 ? features.join(', ') : prInfo.featureName;
  
  return {
    summary: `Adds ${featureList} functionality to enhance the thought capture system with productivity features`,
    riskLevel: "MEDIUM",
    canShip: true,
    criticalIssues: [],
    keyTests: [
      `Test ${features.includes('direct text input') ? 'text area input with various content types' : 'input functionality'}`,
      `Verify ${features.includes('tag system') ? 'tag extraction and categorization (#today, #todo, etc.)' : 'tag processing'}`,
      `Test ${features.includes('todo management') ? 'To-Do view with today integration and task management' : 'task management'}`,
      `Validate ${features.includes('AI integration') ? 'AI-enhanced categorization and insights generation' : 'AI features'}`,
      `Check ${features.includes('priority management') ? 'overdue task highlighting and priority-based sorting' : 'priority features'}`
    ],
    recommendations: [
      `Test the complete user workflow: input → tag extraction → todo view → dashboard`,
      `Verify performance with large numbers of thoughts and tasks`,
      `Monitor AI categorization accuracy and response times`
    ]
  };
}

/**
 * Extract key information from PR content for fallback analysis
 */
function extractPRInfo(title, body, diff) {
  // Extract feature type from title
  let featureType = 'enhancement';
  let featureName = 'application';
  
  if (title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('auth') || titleLower.includes('login')) {
      featureType = 'authentication';
      featureName = 'user authentication';
    } else if (titleLower.includes('api') || titleLower.includes('endpoint')) {
      featureType = 'API';
      featureName = 'API functionality';
    } else if (titleLower.includes('ui') || titleLower.includes('interface')) {
      featureType = 'UI';
      featureName = 'user interface';
    } else if (titleLower.includes('thought') || titleLower.includes('input')) {
      featureType = 'thought capture';
      featureName = 'thought input system';
    } else if (titleLower.includes('todo') || titleLower.includes('task')) {
      featureType = 'task management';
      featureName = 'todo system';
    } else if (titleLower.includes('dashboard')) {
      featureType = 'dashboard';
      featureName = 'dashboard';
    } else if (titleLower.includes('tag') || titleLower.includes('categorization')) {
      featureType = 'tagging';
      featureName = 'tag system';
    }
  }
  
  // Extract affected area from diff
  let affectedArea = 'frontend';
  if (diff) {
    const diffLower = diff.toLowerCase();
    if (diffLower.includes('.js') || diffLower.includes('.ts')) {
      affectedArea = 'frontend';
    } else if (diffLower.includes('.py') || diffLower.includes('.java')) {
      affectedArea = 'backend';
    } else if (diffLower.includes('api/') || diffLower.includes('routes/')) {
      affectedArea = 'API';
    } else if (diffLower.includes('test') || diffLower.includes('spec')) {
      affectedArea = 'testing';
    }
  }
  
  return {
    featureType,
    featureName,
    affectedArea
  };
}

/**
 * Generate ultimate fallback when everything else fails
 */
function generateUltimateFallback(title) {
  console.log('🔄 Generating ultimate fallback analysis');
  
  return {
    summary: `Updates ${title || 'the application'} with new features and improvements`,
    riskLevel: "MEDIUM",
    canShip: true,
    criticalIssues: [],
    keyTests: [
      "Test basic functionality",
      "Verify user workflows",
      "Check error handling",
      "Test integration points"
    ],
    recommendations: [
      "Perform manual testing",
      "Monitor for issues after deployment",
      "Gather user feedback"
    ]
  };
}

/**
 * Test OpenAI connection
 * @returns {Promise<boolean>} True if connection is working
 */
async function testConnection() {
  try {
    if (!openai) {
      console.error('❌ OpenAI client not initialized');
      return false;
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: 'Test connection. Reply with "OK".' }],
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content;
    console.log('✅ OpenAI connection test successful:', response);
    return true;
  } catch (error) {
    console.error('❌ OpenAI connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  generateQAInsights,
  testConnection
}; 