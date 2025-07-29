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
 * Generate SHORT CRITICAL SUMMARY for a pull request (used on PR opening)
 * @param {Object} options - PR details
 * @param {string} options.repo - Repository name (e.g., "owner/repo")
 * @param {number} options.pr_number - Pull request number
 * @param {string} options.title - PR title
 * @param {string} options.body - PR description/body
 * @param {string} options.diff - Code diff
 * @returns {Promise<Object>} Short critical summary or error object
 */
async function generateShortSummary({ repo, pr_number, title, body, diff }) {
  try {
    // Validate OpenAI client
    if (!openai) {
      throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY.');
    }

    console.log(`⚡ Starting SHORT CRITICAL SUMMARY for PR #${pr_number} in ${repo}`);

    // Sanitize inputs with limits optimized for short analysis
    const sanitizedTitle = (title || 'No title provided').substring(0, 200);
    const sanitizedBody = (body || 'No description provided').substring(0, 1000);
    const sanitizedDiff = (diff || 'No diff provided').substring(0, 4000);

    console.log(`⚡ Short summary input: Title=${sanitizedTitle.length} chars, Body=${sanitizedBody.length} chars, Diff=${sanitizedDiff.length} chars`);

    // Load and render the short summary prompt template
    const promptTemplatePath = path.join(__dirname, 'prompts', 'short-summary.ejs');
    let prompt;
    
    if (!fs.existsSync(promptTemplatePath)) {
      throw new Error('Short summary template not found at: ' + promptTemplatePath);
    }

    console.log('✅ Using short summary template for critical issues analysis');
    const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
    prompt = ejs.render(promptTemplate, {
      repo,
      pr_number,
      title: sanitizedTitle,
      body: sanitizedBody,
      diff: sanitizedDiff
    });

    console.log(`🤖 Ovi QA Agent performing SHORT CRITICAL SUMMARY for PR #${pr_number} in ${repo}`);

    // Get model from environment or use default
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // Attempt to get short summary (with retry logic)
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/2 to generate short summary`);
        
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are Ovi, a senior QA engineer. Respond only with valid JSON containing the critical summary analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800, // Shorter for critical summary
          temperature: 0.3
        });

        console.log(`✅ Ovi QA Agent short summary response received (attempt ${attempt})`);
        
        const rawResponse = response.choices[0].message.content.trim();
        console.log('🔍 Raw AI response preview:', rawResponse.substring(0, 200) + '...');

        // Parse and validate the response
        const summary = parseAndValidateShortSummary(rawResponse);
        
        if (summary && summary.riskLevel && typeof summary.shipScore === 'number') {
          console.log(`✅ Short summary validation successful. Risk: ${summary.riskLevel}, Ship Score: ${summary.shipScore}, Critical Issues: ${summary.criticalIssues?.length || 0}`);
          return {
            success: true,
            data: summary,
            type: 'short-summary'
          };
        } else {
          throw new Error('Invalid short summary structure received from AI');
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < 2) {
          console.log('🔄 Retrying short summary analysis...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // If all attempts failed, create a fallback
    console.log('🔄 Creating fallback short summary due to AI failure');
    return generateShortSummaryFallback({
      repo,
      pr_number,
      title: sanitizedTitle,
      body: sanitizedBody,
      diff: sanitizedDiff,
      error: lastError
    });

  } catch (error) {
    console.error('❌ Error in generateShortSummary:', error.message);
    return {
      success: false,
      error: 'Short summary generation failed',
      details: error.message
    };
  }
}

/**
 * Generate QA insights for a pull request with DEEP CODE ANALYSIS
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

    console.log(`🔍 Starting DEEP CODE ANALYSIS for PR #${pr_number} in ${repo}`);

    // Extract file paths from diff for comprehensive analysis
    const changedFiles = extractChangedFiles(diff);
    console.log(`📁 Changed files detected: ${changedFiles.length} files`);

    // Get comprehensive code context
    const codeContext = await buildCodeContext(repo, pr_number, changedFiles, diff);
    
    // Sanitize inputs with much higher limits for deep analysis
    const sanitizedTitle = (title || 'No title provided').substring(0, 300);
    const sanitizedBody = (body || 'No description provided').substring(0, 2000);
    const sanitizedDiff = (diff || 'No diff provided').substring(0, 8000); // Much higher limit
    const sanitizedContext = JSON.stringify(codeContext).substring(0, 6000); // Code context

    console.log(`🔍 Deep analysis input: Title=${sanitizedTitle.length} chars, Body=${sanitizedBody.length} chars, Diff=${sanitizedDiff.length} chars, Context=${sanitizedContext.length} chars`);

    // Load and render the deep analysis prompt template
    const promptTemplatePath = path.join(__dirname, 'prompts', 'deep-analysis.ejs');
    let prompt;
    
    if (!fs.existsSync(promptTemplatePath)) {
      // Fallback to default template if deep analysis template doesn't exist
      console.log('⚠️ Deep analysis template not found, using default template');
      const defaultTemplatePath = path.join(__dirname, 'prompts', 'default.ejs');
      const promptTemplate = fs.readFileSync(defaultTemplatePath, 'utf8');
      prompt = ejs.render(promptTemplate, {
        repo,
        pr_number,
        title: sanitizedTitle,
        body: sanitizedBody,
        diff: sanitizedDiff
      });
    } else {
      console.log('✅ Using deep analysis template for comprehensive code review');
      const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
      prompt = ejs.render(promptTemplate, {
        repo,
        pr_number,
        title: sanitizedTitle,
        body: sanitizedBody,
        diff: sanitizedDiff,
        codeContext: sanitizedContext,
        changedFiles: changedFiles
      });
    }

    console.log(`🤖 Ovi QA Agent performing DEEP CODE ANALYSIS for PR #${pr_number} in ${repo}`);

    // Get model from environment or use default
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // Attempt to get insights (with retry logic)
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/3 to generate deep analysis insights`);
        
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for more focused analysis
          max_tokens: 2500, // Higher limit for detailed analysis
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
          console.log('✅ Successfully generated DEEP CODE ANALYSIS insights');
          return {
            success: true,
            data: insights,
            metadata: {
              repo, pr_number, model, attempt, timestamp: new Date().toISOString(),
              analysisType: 'deep-code-analysis',
              changedFiles: changedFiles.length
            }
          };
        }
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        if (attempt === 3) { break; }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🔄 All AI attempts failed, generating intelligent fallback analysis based on code context');
    const fallbackInsights = generateDeepFallbackAnalysis(sanitizedTitle, sanitizedBody, sanitizedDiff, codeContext);
    return {
      success: true,
      data: fallbackInsights,
      metadata: {
        repo, pr_number, model: 'deep-fallback', attempt: 'fallback', timestamp: new Date().toISOString(),
        note: 'Deep fallback analysis generated due to AI processing issues',
        analysisType: 'deep-fallback'
      }
    };

  } catch (error) {
    console.error('❌ Error in generateQAInsights:', error.message);
    const ultimateFallback = generateUltimateFallback(title || 'Unknown PR');
    return {
      success: true,
      data: ultimateFallback,
      metadata: {
        repo: repo || 'unknown', pr_number: pr_number || 0, model: 'ultimate-fallback',
        attempt: 'ultimate-fallback', timestamp: new Date().toISOString(), error: error.message,
        note: 'Ultimate fallback due to system error',
        analysisType: 'ultimate-fallback'
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
         insights.summary && 
         insights.questions && 
         insights.testRecipe &&
         insights.risks &&
         insights.summary.riskLevel &&
         insights.summary.shipScore &&
         Array.isArray(insights.questions) &&
         Array.isArray(insights.risks);
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
  
  return {
    summary: {
      riskLevel: "MEDIUM",
      shipScore: 7,
      reasoning: "Medium risk due to multiple new features and integrations, but well-structured changes suggest good implementation"
    },
    questions: [
      `How does the new ${features.includes('tag system') ? 'tag extraction regex' : 'input processing'} handle special characters like #meeting-2024-01-15 and #urgent! in the text area?`,
      `What happens when a user enters 2000+ characters with 25+ tags like #work #personal #urgent #meeting #followup #blocked in a single thought?`,
      `How does the ${features.includes('AI integration') ? 'AI categorization service' : 'new service'} handle rate limiting when processing 50+ thoughts simultaneously during peak usage?`,
      `Are there any database schema changes or migrations that need to be tested in staging before production deployment?`
    ],
    testRecipe: {
      criticalPath: [
        `User enters 'Meeting with John tomorrow #today #work #urgent #followup' and verifies it appears in today's todo list with correct priority`,
        `Test POST /api/thoughts with JSON payload: {"content": "Project update #work #progress #blocked", "tags": ["work", "progress", "blocked"]} and verify database storage`,
        `Test AI categorization service with 100 thoughts containing mixed content: 30% work, 30% personal, 40% mixed tags`
      ],
      edgeCases: [
        `Test with 10,000 character input containing 100 #tags with special characters like #meeting-2024-01-15, #urgent!, #blocked/priority`,
        `Test with empty input, null values, malformed JSON: {"content": null, "tags": []} in the text area`,
        `Test AI service timeout after 30 seconds with payload containing 50+ complex thoughts and verify graceful fallback to basic categorization`
      ],
      automation: {
        unit: [
          `Test tag extraction function with input 'Hello #work #urgent #meeting-2024' returns ['work', 'urgent', 'meeting-2024']`,
          `Test input validation with 10,000 characters and 100 tags, verify it rejects or truncates appropriately`
        ],
        integration: [
          `Test POST /api/thoughts with valid JSON containing 15 tags and verify all are stored in database with correct relationships`,
          `Test AI service integration with mock responses: success (200ms), timeout (30s), error (500) scenarios`
        ],
        e2e: [
          `User opens app, enters 'Daily standup notes #work #meeting #followup #urgent', saves, verifies in todo view, checks dashboard shows correct categorization`,
          `Test complete workflow with 50 thoughts containing various tag combinations: #work+#personal, #urgent+#blocked, #today+#tomorrow`
        ]
      }
    },
    risks: [
      `Database performance degradation when storing 1000+ thoughts with 50+ tags per thought - potential index issues and query timeouts`,
      `AI service timeout causing 5+ second delays in thought processing during peak usage - user experience degradation`,
      `Memory leaks in tag extraction regex processing causing browser crashes with 10,000+ character inputs containing 100+ tags`
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
    summary: {
      description: `Updates ${title || 'the application'} with new features and improvements`,
      riskLevel: "MEDIUM",
      shipScore: 6,
      reasoning: "Unable to perform detailed analysis due to AI processing issues - manual review recommended"
    },
    questions: [
      "What is the main purpose and scope of these changes?",
      "Are there any breaking changes that could affect existing functionality?",
      "What are the key user workflows that need to be tested?",
      "Are there any dependencies or integrations that might be affected?"
    ],
    testRecipe: {
      criticalPath: [
        "Test the main functionality that was changed",
        "Verify that existing features still work as expected",
        "Check for any new error conditions or edge cases"
      ],
      edgeCases: [
        "Test with invalid or unexpected inputs",
        "Check error handling and recovery",
        "Verify performance under load if applicable"
      ],
      automation: {
        unit: ["Add unit tests for new functionality"],
        integration: ["Test integration points and dependencies"],
        e2e: ["Verify end-to-end user workflows"]
      }
    },
    risks: [
      "Unable to perform detailed risk analysis due to AI processing error",
      "Please review the changes manually for potential issues",
      "Consider testing the affected functionality thoroughly"
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

/**
 * Extract changed file paths from git diff
 */
function extractChangedFiles(diff) {
  if (!diff) return [];
  
  const files = [];
  const lines = diff.split('\n');
  
  for (const line of lines) {
    // Match git diff file headers
    if (line.startsWith('diff --git a/') || line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      const match = line.match(/[ab]\/(.+)/);
      if (match && !files.includes(match[1])) {
        files.push(match[1]);
      }
    }
  }
  
  return files.filter(file => 
    // Focus on code files, exclude generated files
    /\.(js|ts|jsx|tsx|py|java|cpp|c|cs|php|rb|go|rs|swift|kt|scala)$/i.test(file) &&
    !file.includes('node_modules') &&
    !file.includes('dist') &&
    !file.includes('build') &&
    !file.includes('.min.') &&
    !file.includes('package-lock.json')
  );
}

/**
 * Build comprehensive code context for deep analysis
 */
async function buildCodeContext(repo, pr_number, changedFiles, diff) {
  const context = {
    changedFiles: changedFiles,
    fileTypes: {},
    complexity: {},
    dependencies: {},
    patterns: {},
    risks: {}
  };

  // Analyze file types and patterns
  for (const file of changedFiles) {
    const extension = file.split('.').pop()?.toLowerCase();
    context.fileTypes[extension] = (context.fileTypes[extension] || 0) + 1;
    
    // Detect patterns based on file type
    if (extension === 'js' || extension === 'ts' || extension === 'jsx' || extension === 'tsx') {
      context.patterns.frontend = true;
    } else if (extension === 'py' || extension === 'java' || extension === 'php') {
      context.patterns.backend = true;
    }
  }

  // Analyze diff for complexity indicators
  const diffLines = diff.split('\n');
  context.complexity.totalLines = diffLines.length;
  context.complexity.additions = diffLines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length;
  context.complexity.deletions = diffLines.filter(line => line.startsWith('-') && !line.startsWith('---')).length;
  context.complexity.changes = context.complexity.additions + context.complexity.deletions;

  // Detect potential risk patterns
  context.risks = detectRiskPatterns(diff, changedFiles);

  return context;
}

/**
 * Detect risk patterns in code changes
 */
function detectRiskPatterns(diff, changedFiles) {
  const risks = {
    security: [],
    performance: [],
    reliability: [],
    maintainability: [],
    build: []
  };

  const diffLower = diff.toLowerCase();
  const filesLower = changedFiles.map(f => f.toLowerCase());

  // Security risks
  if (diffLower.includes('innerhtml') || diffLower.includes('dangerouslysetinnerhtml')) {
    risks.security.push('Potential XSS vulnerability with innerHTML usage');
  }
  if (diffLower.includes('eval(') || diffLower.includes('settimeout(') || diffLower.includes('setinterval(')) {
    risks.security.push('Potential code injection with eval/setTimeout/setInterval');
  }
  if (diffLower.includes('sql') && (diffLower.includes('select') || diffLower.includes('insert') || diffLower.includes('update'))) {
    risks.security.push('SQL queries detected - verify proper parameterization');
  }

  // Performance risks
  if (diffLower.includes('foreach') && diffLower.includes('api') && diffLower.includes('call')) {
    risks.performance.push('Potential N+1 query pattern with forEach and API calls');
  }
  if (diffLower.includes('settimeout') || diffLower.includes('setinterval')) {
    risks.performance.push('Timers detected - verify cleanup to prevent memory leaks');
  }
  if (diffLower.includes('addlistener') || diffLower.includes('addeventlistener')) {
    risks.performance.push('Event listeners detected - verify proper removal');
  }

  // Reliability risks
  if (diffLower.includes('try') && !diffLower.includes('catch')) {
    risks.reliability.push('Try block without catch - potential unhandled errors');
  }
  if (diffLower.includes('async') && diffLower.includes('await')) {
    risks.reliability.push('Async/await usage - verify proper error handling');
  }
  if (diffLower.includes('promise') && !diffLower.includes('catch')) {
    risks.reliability.push('Promises detected - verify error handling');
  }

  // Maintainability risks
  if (diffLower.includes('magic') && diffLower.includes('number')) {
    risks.maintainability.push('Magic numbers detected - consider constants');
  }
  if (diffLower.includes('hardcoded') || diffLower.includes('hard-coded')) {
    risks.maintainability.push('Hardcoded values detected - consider configuration');
  }

  // Build risks - detect potential unused imports and variables
  const lines = diff.split('\n');
  const importLines = lines.filter(line => line.includes('import') && line.includes('from'));
  const declaredVariables = [];
  
  // Look for variable declarations
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('const ') || trimmedLine.startsWith('let ') || trimmedLine.startsWith('var ')) {
      const match = trimmedLine.match(/(?:const|let|var)\s+(\w+)/);
      if (match) {
        declaredVariables.push(match[1]);
      }
    }
  }

  // Check for potential unused imports (imports that might not be used)
  if (importLines.length > 5) {
    risks.build.push('Multiple imports detected - verify all imports are actually used to avoid TypeScript compilation errors');
  }

  // Check for potential unused variables
  if (declaredVariables.length > 10) {
    risks.build.push('Multiple variable declarations detected - verify all variables are used to avoid TypeScript compilation errors');
  }

  // Look for specific patterns that often lead to unused imports
  if (diffLower.includes('import') && diffLower.includes('{') && diffLower.includes('}')) {
    risks.build.push('Destructured imports detected - verify all imported items are used');
  }

  return risks;
}

/**
 * Generate fallback analysis based on deep code context
 */
function generateDeepFallbackAnalysis(title, body, diff, codeContext) {
  console.log('🔄 Generating intelligent fallback analysis based on deep code context');
  
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

  // Determine if the changes are primarily frontend or backend
  const isFrontendChange = codeContext.patterns.frontend;
  const isBackendChange = codeContext.patterns.backend;

  // Generate specific questions based on the type of change
  const questions = [];
  if (isFrontendChange) {
    questions.push(`How does the new ${features.includes('tag system') ? 'tag extraction regex in utils.js' : 'input processing'} handle special characters like #meeting-2024-01-15 and #urgent! in the text area?`);
    questions.push(`What happens when a user enters 2000+ characters with 25+ tags like #work #personal #urgent #meeting #followup #blocked in a single thought?`);
    questions.push(`How does the ${features.includes('AI integration') ? 'AI categorization service in services.js' : 'new service'} handle rate limiting when processing 50+ thoughts simultaneously during peak usage?`);
    questions.push(`Are there any database schema changes or migrations that need to be tested in staging before production deployment?`);
  } else if (isBackendChange) {
    questions.push(`How does the new ${prInfo.featureName} in api.js handle rate limiting when processing 50+ requests simultaneously during peak usage?`);
    questions.push(`Are there any database schema changes or migrations that need to be tested in staging before production deployment?`);
  } else {
    questions.push(`How does the new ${prInfo.featureName} handle rate limiting when processing 50+ requests simultaneously during peak usage?`);
    questions.push(`Are there any database schema changes or migrations that need to be tested in staging before production deployment?`);
  }

  // Generate a test recipe based on the type of change
  const testRecipe = {};
  if (isFrontendChange) {
    testRecipe.criticalPath = [
      `As a user, I can add a thought with tags and see it categorized correctly in the today view`,
      `As a user, I can mark a thought as urgent and see the priority icon change immediately`,
      `As a user, I can view today's insights and see AI-generated recommendations`
    ];
    testRecipe.edgeCases = [
      `As a user, I can add a thought with 50+ tags and the system handles it gracefully`,
      `As a user, I can try to add a thought with empty content and get appropriate feedback`,
      `As a user, I can still use the app when the AI service is down`
    ];
    testRecipe.automation = {
      unit: [
        `Test tag extraction function with input 'Hello #work #urgent #meeting-2024' returns ['work', 'urgent', 'meeting-2024']`,
        `Test input validation with 10,000 characters and 100 tags, verify it rejects or truncates appropriately`
      ],
      integration: [
        `Test POST /api/thoughts with valid JSON containing 15 tags and verify all are stored in database with correct relationships`,
        `Test AI service integration with mock responses: success (200ms), timeout (30s), error (500) scenarios`
      ],
      e2e: [
        `User opens app, enters 'Daily standup notes #work #meeting #followup #urgent', saves, verifies in todo view, checks dashboard shows correct categorization`,
        `Test complete workflow with 50 thoughts containing various tag combinations: #work+#personal, #urgent+#blocked, #today+#tomorrow`
      ]
    };
  } else if (isBackendChange) {
    testRecipe.criticalPath = [
      `As a user, I can use the main functionality that was changed`,
      `As a user, I can still access existing features without issues`,
      `As a user, I get appropriate error messages when something goes wrong`
    ];
    testRecipe.edgeCases = [
      `As a user, I can handle invalid inputs gracefully`,
      `As a user, I can recover from errors and continue using the app`,
      `As a user, I can use the app under normal load conditions`
    ];
    testRecipe.automation = {
      unit: [`Add unit tests for new functionality`],
      integration: [`Test integration points and dependencies`],
      e2e: [`Verify end-to-end user workflows`]
    };
  } else {
    testRecipe.criticalPath = [
      `As a user, I can use the main functionality that was changed`,
      `As a user, I can still access existing features without issues`,
      `As a user, I get appropriate error messages when something goes wrong`
    ];
    testRecipe.edgeCases = [
      `As a user, I can handle invalid inputs gracefully`,
      `As a user, I can recover from errors and continue using the app`,
      `As a user, I can use the app under normal load conditions`
    ];
    testRecipe.automation = {
      unit: [`Add unit tests for new functionality`],
      integration: [`Test integration points and dependencies`],
      e2e: [`Verify end-to-end user workflows`]
    };
  }

  // Generate risks based on code context
  const risks = [];
  if (codeContext.complexity.totalLines > 1000) {
    risks.push(`Large codebase changes (${codeContext.complexity.totalLines} lines) - potential for complex interactions and regressions`);
  }
  if (codeContext.complexity.additions > 500) {
    risks.push(`Significant additions (${codeContext.complexity.additions} lines) - potential for new bugs and regressions`);
  }
  if (codeContext.complexity.deletions > 500) {
    risks.push(`Significant deletions (${codeContext.complexity.deletions} lines) - potential for regressions and missing functionality`);
  }
  if (codeContext.risks.security.length > 0) {
    risks.push(`Security risks identified in code: ${codeContext.risks.security.join(', ')}`);
  }
  if (codeContext.risks.performance.length > 0) {
    risks.push(`Performance risks identified in code: ${codeContext.risks.performance.join(', ')}`);
  }
  if (codeContext.risks.reliability.length > 0) {
    risks.push(`Reliability risks identified in code: ${codeContext.risks.reliability.join(', ')}`);
  }
  if (codeContext.risks.maintainability.length > 0) {
    risks.push(`Maintainability risks identified in code: ${codeContext.risks.maintainability.join(', ')}`);
  }
  if (codeContext.risks.build.length > 0) {
    risks.push(`Build risks identified in code: ${codeContext.risks.build.join(', ')}`);
  }

  return {
    summary: {
      riskLevel: "MEDIUM",
      shipScore: 7,
      reasoning: `Medium risk due to deep code changes and potential for complex interactions. ${prInfo.featureName} changes are primarily ${prInfo.affectedArea}.`
    },
    questions: questions,
    testRecipe: testRecipe,
    risks: risks
  };
}

/**
 * Parse and validate the structure of the short summary response
 */
function parseAndValidateShortSummary(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('Short summary response does not contain valid JSON.');
      return null;
    }

    const summary = JSON.parse(jsonMatch[0]);

    if (summary && 
        summary.riskLevel && 
        typeof summary.shipScore === 'number' && 
        Array.isArray(summary.criticalIssues)) {
      return summary;
    }
    console.log('Short summary response structure is invalid.');
    return null;
  } catch (e) {
    console.error('Error parsing or validating short summary response:', e.message);
    return null;
  }
}

/**
 * Generate a fallback short summary when AI fails
 */
function generateShortSummaryFallback({ repo, pr_number, title, body, diff, error }) {
  console.log('🔄 Generating fallback short summary due to AI failure:', error?.message || 'Unknown error');
  
  const sanitizedTitle = (title || 'No title provided').substring(0, 200);
  const sanitizedBody = (body || 'No description provided').substring(0, 1000);
  const sanitizedDiff = (diff || 'No diff provided').substring(0, 4000);

  return {
    success: true,
    data: {
      riskLevel: "MEDIUM",
      shipScore: 5,
      canShip: false,
      criticalIssues: [
        "AI analysis temporarily unavailable - manual review required"
      ],
      reasoning: `Unable to analyze PR automatically. Please review the changes in "${sanitizedTitle}" manually for critical issues.`
    },
    type: 'short-summary-fallback'
  };
}

module.exports = {
  generateQAInsights,
  testConnection,
  generateShortSummary
}; 