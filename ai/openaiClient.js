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

    // Load and render the prompt template
    const promptTemplatePath = path.join(__dirname, 'prompts', 'default.ejs');
    if (!fs.existsSync(promptTemplatePath)) {
      throw new Error(`Prompt template not found at: ${promptTemplatePath}`);
    }

    const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
    const prompt = ejs.render(promptTemplate, {
      repo,
      pr_number,
      title: title || 'No title provided',
      body: body || 'No description provided',
      diff: diff || 'No diff provided'
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

        // Parse the JSON response
        const insights = JSON.parse(response);
        
        // Validate the expected structure for the new format
        if (!insights.changeReview || !insights.testRecipe || !insights.codeQuality) {
          throw new Error('Invalid response structure from OpenAI - missing required sections');
        }
        
        // Validate changeReview structure
        if (!insights.changeReview.smartQuestions || !insights.changeReview.risks || !insights.changeReview.productionReadinessScore) {
          throw new Error('Invalid changeReview structure from OpenAI');
        }
        
        // Validate productionReadinessScore structure
        if (!insights.changeReview.productionReadinessScore.score || !insights.changeReview.productionReadinessScore.level || !insights.changeReview.productionReadinessScore.reasoning) {
          throw new Error('Invalid productionReadinessScore structure from OpenAI');
        }
        
        // Validate testRecipe structure
        if (!insights.testRecipe.criticalPath || !insights.testRecipe.general || !insights.testRecipe.edgeCases || !insights.testRecipe.automationPlan) {
          throw new Error('Invalid testRecipe structure from OpenAI');
        }
        
        // Validate automationPlan structure
        if (!insights.testRecipe.automationPlan.unit || !insights.testRecipe.automationPlan.integration || !insights.testRecipe.automationPlan.e2e) {
          throw new Error('Invalid automationPlan structure from OpenAI');
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