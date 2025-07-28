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
  console.log('🔄 Generating fallback analysis based on PR content');
  
  // Extract key information from the PR
  const prInfo = extractPRInfo(title, body, diff);
  
  return {
    changeReview: {
      smartQuestions: [
        `How does the ${prInfo.featureType} feature integrate with existing functionality?`,
        `What are the expected user workflows for ${prInfo.featureName}?`,
        `Are there any breaking changes or dependencies that need to be considered?`,
        `How will ${prInfo.featureName} handle edge cases and error conditions?`,
        `What is the expected performance impact of ${prInfo.featureName}?`
      ],
      risks: [
        `Potential integration issues with existing ${prInfo.affectedArea} components`,
        `User experience concerns if ${prInfo.featureName} is not intuitive`,
        `Performance impact if ${prInfo.featureName} is not optimized`,
        `Data consistency issues if ${prInfo.featureName} affects shared state`,
        `Security considerations for ${prInfo.featureName} functionality`
      ],
      productionReadinessScore: {
        score: 6,
        level: "Needs More Testing",
        reasoning: `The ${prInfo.featureName} feature shows promise but requires thorough testing to ensure it integrates well with existing systems and provides a good user experience.`,
        criticalIssues: [
          `Need to verify ${prInfo.featureName} integration with existing components`
        ],
        recommendations: [
          `Test ${prInfo.featureName} with real user scenarios`,
          `Verify performance under expected load`,
          `Ensure proper error handling and edge cases`
        ]
      }
    },
    testRecipe: {
      criticalPath: [
        `Test the core ${prInfo.featureName} functionality`,
        `Verify ${prInfo.featureName} integration with existing systems`,
        `Validate user workflows for ${prInfo.featureName}`
      ],
      general: [
        `Test ${prInfo.featureName} with various input scenarios`,
        `Verify error handling for ${prInfo.featureName}`,
        `Test ${prInfo.featureName} performance under load`
      ],
      edgeCases: [
        `Test ${prInfo.featureName} with invalid or unexpected inputs`,
        `Verify ${prInfo.featureName} behavior under stress conditions`,
        `Test ${prInfo.featureName} with concurrent user access`
      ],
      automationPlan: {
        unit: [`Unit tests for ${prInfo.featureName} core logic`],
        integration: [`Integration tests for ${prInfo.featureName} with existing systems`],
        e2e: [`End-to-end tests for ${prInfo.featureName} user workflows`]
      }
    },
    codeQuality: {
      affectedModules: [
        `${prInfo.affectedArea} components related to ${prInfo.featureName}`,
        `Data handling modules for ${prInfo.featureName}`
      ],
      testCoverage: {
        existing: `Need to assess existing test coverage for ${prInfo.affectedArea}`,
        gaps: `Missing tests for ${prInfo.featureName} functionality`,
        recommendations: `Add comprehensive tests for ${prInfo.featureName} including unit, integration, and E2E tests`
      },
      bestPractices: [
        `Ensure ${prInfo.featureName} follows established coding standards`,
        `Implement proper error handling for ${prInfo.featureName}`,
        `Consider performance implications of ${prInfo.featureName} implementation`
      ]
    }
  };
}

/**
 * Extract key information from PR content for fallback analysis
 */
function extractPRInfo(title, body, diff) {
  const titleLower = title.toLowerCase();
  const bodyLower = body.toLowerCase();
  
  // Detect feature type
  let featureType = 'new';
  if (titleLower.includes('fix') || titleLower.includes('bug')) featureType = 'fix';
  if (titleLower.includes('refactor')) featureType = 'refactor';
  if (titleLower.includes('enhance') || titleLower.includes('improve')) featureType = 'enhancement';
  
  // Extract feature name
  let featureName = 'the implemented feature';
  if (titleLower.includes('auth')) featureName = 'authentication';
  if (titleLower.includes('ui') || titleLower.includes('interface')) featureName = 'user interface';
  if (titleLower.includes('api')) featureName = 'API';
  if (titleLower.includes('test')) featureName = 'testing';
  if (titleLower.includes('input') || titleLower.includes('form')) featureName = 'input handling';
  if (titleLower.includes('tag')) featureName = 'tag system';
  if (titleLower.includes('thought')) featureName = 'thought input';
  
  // Detect affected area
  let affectedArea = 'application';
  if (diff.includes('frontend') || diff.includes('react') || diff.includes('vue')) affectedArea = 'frontend';
  if (diff.includes('backend') || diff.includes('api') || diff.includes('server')) affectedArea = 'backend';
  if (diff.includes('database') || diff.includes('db') || diff.includes('sql')) affectedArea = 'database';
  
  return { featureType, featureName, affectedArea };
}

/**
 * Generate ultimate fallback when everything else fails
 */
function generateUltimateFallback(title) {
  return {
    changeReview: {
      smartQuestions: [
        "What is the main purpose of these changes?",
        "Are there any breaking changes that could affect existing functionality?",
        "Have you tested the core functionality manually?",
        "Are there any dependencies or integrations that might be affected?",
        "What is the expected user impact of these changes?"
      ],
      risks: [
        "Unable to perform detailed risk analysis due to AI processing error",
        "Please review the changes manually for potential issues",
        "Consider testing the affected functionality thoroughly"
      ],
      productionReadinessScore: {
        score: 5,
        level: "Needs Manual Review",
        reasoning: "AI analysis failed - manual review required to assess production readiness.",
        criticalIssues: [
          "AI analysis could not be completed - manual review needed"
        ],
        recommendations: [
          "Review the changes manually before proceeding",
          "Test the affected functionality thoroughly",
          "Consider running the full test suite"
        ]
      }
    },
    testRecipe: {
      criticalPath: [
        "Test the main functionality that was changed",
        "Verify that existing features still work as expected",
        "Check for any new error conditions or edge cases"
      ],
      general: [
        "Run the existing test suite",
        "Test the user interface if UI changes were made",
        "Verify API endpoints if backend changes were made"
      ],
      edgeCases: [
        "Test with invalid or unexpected inputs",
        "Check error handling and recovery",
        "Verify performance under load if applicable"
      ],
      automationPlan: {
        unit: ["Add unit tests for new functionality"],
        integration: ["Test integration points and dependencies"],
        e2e: ["Verify end-to-end user workflows"]
      }
    },
    codeQuality: {
      affectedModules: [
        "Manual review needed to identify affected modules"
      ],
      testCoverage: {
        existing: "Unable to analyze existing test coverage",
        gaps: "Manual review needed to identify test gaps",
        recommendations: "Add tests for new functionality and affected areas"
      },
      bestPractices: [
        "Review code for security best practices",
        "Ensure proper error handling is in place"
      ]
    }
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