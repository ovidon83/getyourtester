#!/usr/bin/env node

/**
 * Test Script for Ovi QA Agent Hybrid Analysis Feature
 * Tests the new hybrid approach: Feature Testing + Technical Testing + Bugs
 */

const { generateQAInsights } = require('../ai/openaiClient');

// Test data for a sample PR with detailed description
const testPR = {
  repo: 'test-user/mindnest-app',
  pr_number: 456,
  title: '🧠 Revolutionary thought capture for overwhelmed minds',
  body: `## Changes
🧠 INSTANT CAPTURE:
- Zero-friction thought dumping with Enter key
- Auto-focus input for continuous capture
- Real-time feedback with immediate storage
- Background AI enhancement without blocking

🎯 VISUAL CLUSTERING:
- Auto-categorize by type: tasks, ideas, feelings, memories, future, random
- Energy-based organization: high/medium/low energy required
- Beautiful emoji-coded categories for instant recognition
- Smart filtering and search across all dimensions

🌊 GENTLE PRIORITIZATION:
- Energy-aware task sorting (not overwhelming urgency)
- Completion tracking without pressure
- Timeline view for natural flow
- AI-enhanced insights without interruption

🎨 CLEAN & CALMING UI:
- Soft gradients and spacious design
- Hover animations for gentle interactions
- Compact cards to reduce visual noise
- Clear visual hierarchy with emojis and colors

This transforms overwhelming thought chaos into organized clarity, specifically designed for ADHD brains that need instant capture and gentle organization.`,
  diff: `
+++ b/src/components/ThoughtInput.tsx
@@ -0,0 +1,85 @@
+import React, { useState, useRef, useEffect } from 'react';
+import { AIService } from '../services/aiService';
+
+interface ThoughtInputProps {
+  onThoughtAdded: (thought: string) => void;
+}
+
+export const ThoughtInput: React.FC<ThoughtInputProps> = ({ onThoughtAdded }) => {
+  const [input, setInput] = useState('');
+  const [isProcessing, setIsProcessing] = useState(false);
+  const inputRef = useRef<HTMLInputElement>(null);
+
+  useEffect(() => {
+    // Auto-focus for continuous capture
+    inputRef.current?.focus();
+  }, []);
+
+  const handleSubmit = async (e: React.KeyboardEvent) => {
+    if (e.key === 'Enter' && input.trim()) {
+      setIsProcessing(true);
      
+      try {
+        // Add thought immediately
+        onThoughtAdded(input.trim());
+        setInput('');
        
+        // Process with AI in background
+        AIService.categorizeThought(input.trim());
+      } catch (error) {
+        console.error('Error processing thought:', error);
+      } finally {
+        setIsProcessing(false);
+        inputRef.current?.focus();
+      }
+    }
+  };
+
+  return (
+    <div className="thought-input-container">
+      <input
+        ref={inputRef}
+        value={input}
+        onChange={(e) => setInput(e.target.value)}
+        onKeyDown={handleSubmit}
+        placeholder="What's on your mind? Press Enter to capture..."
+        className={isProcessing ? 'processing' : ''}
+      />
+    </div>
+  );
+};

+++ b/src/services/aiService.ts
@@ -0,0 +1,45 @@
+export class AIService {
+  static async categorizeThought(thought: string) {
+    const response = await fetch('/api/categorize', {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify({ thought })
+    });
    
+    const result = await response.json();
+    return result.category;
+  }
  
+  static async getEnergyLevel(thought: string) {
+    // Simple energy detection logic
+    const highEnergyWords = ['urgent', 'important', 'deadline'];
+    const lowEnergyWords = ['maybe', 'someday', 'idea'];
    
+    if (highEnergyWords.some(word => thought.toLowerCase().includes(word))) {
+      return 'high';
+    }
+    if (lowEnergyWords.some(word => thought.toLowerCase().includes(word))) {
+      return 'low';
+    }
+    return 'medium';
+  }
+}

+++ b/src/components/ThoughtsView.tsx
@@ -15,6 +15,25 @@
+  const [thoughts, setThoughts] = useState([]);
+  const [filter, setFilter] = useState('all');

+  useEffect(() => {
+    loadThoughts();
+  }, []);

+  const loadThoughts = async () => {
+    const response = await fetch('/api/thoughts');
+    const data = await response.json();
+    setThoughts(data);
+  };

+  const processThought = async (thought) => {
+    const category = await AIService.categorizeThought(thought);
+    const energy = await AIService.getEnergyLevel(thought);
    
+    // Update thought with AI insights
+    return { ...thought, category, energy };
+  };`
};

async function testHybridAnalysis() {
  console.log('🧪 Testing Ovi QA Agent Hybrid Analysis Feature\n');
  
  try {
    console.log('🔍 Generating hybrid analysis for test PR...');
    console.log(`📝 PR: ${testPR.title}`);
    console.log(`🔍 Repo: ${testPR.repo} #${testPR.pr_number}\n`);
    
    const startTime = Date.now();
    const result = await generateQAInsights(testPR);
    const endTime = Date.now();
    
    console.log(`⏱️ Analysis completed in ${endTime - startTime}ms\n`);
    
    if (result && result.success) {
      console.log('✅ Hybrid analysis generated successfully!\n');
      
      const data = result.data;
      console.log('📊 RESULTS:');
      console.log('=' .repeat(60));
      
      // Summary
      console.log(`🚨 Risk Level: ${data.summary?.riskLevel || 'UNKNOWN'}`);
      console.log(`📊 Ship Score: ${data.summary?.shipScore || 'N/A'}/10`);
      console.log(`💭 Reasoning: ${data.summary?.reasoning || 'No reasoning provided'}`);
      
      // Critical Questions
      if (data.questions && data.questions.length > 0) {
        console.log('\n❓ CRITICAL QUESTIONS:');
        data.questions.forEach((question, index) => {
          console.log(`${index + 1}. ${question}`);
        });
      }

      // Bugs Found
      if (data.bugs && data.bugs.length > 0) {
        console.log('\n🐛 BUGS FOUND:');
        data.bugs.forEach((bug, index) => {
          console.log(`${index + 1}. ${bug}`);
        });
      } else {
        console.log('\n✅ No bugs detected');
      }

      // Feature Testing
      if (data.featureTestRecipe && data.featureTestRecipe.length > 0) {
        console.log('\n🎯 FEATURE TESTING:');
        console.log('Scenario | Priority | Automation | Description');
        console.log('-'.repeat(80));
        data.featureTestRecipe.forEach(test => {
          console.log(`${test.scenario} | ${test.priority} | ${test.automation} | ${test.description}`);
        });
      }

      // Technical Testing
      if (data.technicalTestRecipe && data.technicalTestRecipe.length > 0) {
        console.log('\n🔧 TECHNICAL TESTING:');
        console.log('Scenario | Priority | Automation | Description');
        console.log('-'.repeat(80));
        data.technicalTestRecipe.forEach(test => {
          console.log(`${test.scenario} | ${test.priority} | ${test.automation} | ${test.description}`);
        });
      }

      // Critical Risks
      if (data.criticalRisks && data.criticalRisks.length > 0) {
        console.log('\n⚠️ CRITICAL RISKS:');
        data.criticalRisks.forEach((risk, index) => {
          console.log(`${index + 1}. ${risk}`);
        });
      }
      
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 Hybrid analysis test completed successfully!');
      
    } else {
      console.error('❌ Hybrid analysis generation failed:');
      console.error('Error:', result?.error);
      console.error('Details:', result?.details);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testHybridAnalysis();
}

module.exports = { testHybridAnalysis }; 