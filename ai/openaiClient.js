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

    // Sanitize and validate inputs
    const sanitizedTitle = (title || 'No title provided').substring(0, 500);
    const sanitizedBody = (body || 'No description provided').substring(0, 2000);
    const sanitizedDiff = (diff || 'No diff provided').substring(0, 8000); // Limit diff size to avoid token limits

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
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/2 to generate insights`);
        
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000, // Increased for more comprehensive analysis
          response_format: { type: 'json_object' }
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('Empty response from OpenAI');
        }

        // Log the raw response for debugging (truncated to avoid huge logs)
        console.log('🔍 Raw AI response (first 500 chars):', response.substring(0, 500));
        console.log('🔍 Response length:', response.length);

        // Try to parse the JSON response
        let insights;
        try {
          insights = JSON.parse(response);
        } catch (jsonError) {
          console.warn('⚠️ Failed to parse JSON response, attempting to extract JSON from text:', jsonError.message);
          console.warn('🔍 Full response that failed to parse:', response);
          
          // Try to extract JSON from the response if it's wrapped in markdown or other text
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              console.log('🔍 Extracted JSON from response:', jsonMatch[0].substring(0, 500));
              insights = JSON.parse(jsonMatch[0]);
            } catch (secondError) {
              console.error('❌ Failed to parse extracted JSON:', secondError.message);
              throw new Error(`Failed to parse JSON even after extraction: ${secondError.message}`);
            }
          } else {
            console.error('❌ No JSON pattern found in response');
            throw new Error('No valid JSON found in response');
          }
        }
        
        // Validate the expected structure for the new format with more flexibility
        if (!insights.changeReview || !insights.testRecipe || !insights.codeQuality) {
          throw new Error('Invalid response structure from OpenAI - missing required sections');
        }
        
        // Validate changeReview structure with flexibility
        if (!insights.changeReview.smartQuestions || !insights.changeReview.risks) {
          throw new Error('Invalid changeReview structure from OpenAI - missing smartQuestions or risks');
        }
        
        // Handle productionReadinessScore with fallback
        if (!insights.changeReview.productionReadinessScore) {
          // Create a fallback structure if missing
          insights.changeReview.productionReadinessScore = {
            score: 5,
            level: "Needs More Testing",
            reasoning: "Unable to determine production readiness due to incomplete analysis",
            criticalIssues: [],
            recommendations: []
          };
        } else {
          // Ensure required fields exist with defaults
          if (!insights.changeReview.productionReadinessScore.score) {
            insights.changeReview.productionReadinessScore.score = 5;
          }
          if (!insights.changeReview.productionReadinessScore.level) {
            insights.changeReview.productionReadinessScore.level = "Needs More Testing";
          }
          if (!insights.changeReview.productionReadinessScore.reasoning) {
            insights.changeReview.productionReadinessScore.reasoning = "Analysis completed but reasoning not provided";
          }
          if (!insights.changeReview.productionReadinessScore.criticalIssues) {
            insights.changeReview.productionReadinessScore.criticalIssues = [];
          }
          if (!insights.changeReview.productionReadinessScore.recommendations) {
            insights.changeReview.productionReadinessScore.recommendations = [];
          }
        }
        
        // Validate testRecipe structure with flexibility
        if (!insights.testRecipe.criticalPath || !insights.testRecipe.general || !insights.testRecipe.edgeCases) {
          throw new Error('Invalid testRecipe structure from OpenAI - missing test scenario arrays');
        }
        
        // Handle automationPlan with fallback
        if (!insights.testRecipe.automationPlan) {
          insights.testRecipe.automationPlan = {
            unit: ["Unit tests not specified"],
            integration: ["Integration tests not specified"],
            e2e: ["E2E tests not specified"]
          };
        } else {
          // Ensure all automation plan arrays exist
          if (!insights.testRecipe.automationPlan.unit) {
            insights.testRecipe.automationPlan.unit = ["Unit tests not specified"];
          }
          if (!insights.testRecipe.automationPlan.integration) {
            insights.testRecipe.automationPlan.integration = ["Integration tests not specified"];
          }
          if (!insights.testRecipe.automationPlan.e2e) {
            insights.testRecipe.automationPlan.e2e = ["E2E tests not specified"];
          }
        }
        
        // Handle codeQuality with fallback
        if (!insights.codeQuality.affectedModules) {
          insights.codeQuality.affectedModules = ["Modules analysis not available"];
        }
        if (!insights.codeQuality.testCoverage) {
          insights.codeQuality.testCoverage = {
            existing: "Test coverage analysis not available",
            gaps: "Gaps analysis not available",
            recommendations: "No specific recommendations available"
          };
        }
        if (!insights.codeQuality.bestPractices) {
          insights.codeQuality.bestPractices = ["Best practices analysis not available"];
        }

        console.log('✅ Ovi QA Agent insights generated successfully');
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

      } catch (parseError) {
        lastError = parseError;
        console.warn(`⚠️ Attempt ${attempt} failed:`, parseError.message);
        
        // Log the actual response for debugging
        if (parseError.message.includes('JSON')) {
          console.warn('🔍 Raw response that failed to parse:', response);
        }
        
        if (attempt === 2) {
          // Final attempt failed
          break;
        }
        
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // All attempts failed
    console.error('❌ Failed to generate Ovi QA Agent insights after 2 attempts');
    return {
      success: false,
      error: 'Failed to generate insights',
      details: lastError?.message || 'Unknown error',
      metadata: {
        repo,
        pr_number,
        model,
        attempts: 2,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Error in generateQAInsights:', error.message);
    return {
      success: false,
      error: 'System error',
      details: error.message,
      metadata: {
        repo,
        pr_number,
        timestamp: new Date().toISOString()
      }
    };
  }
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