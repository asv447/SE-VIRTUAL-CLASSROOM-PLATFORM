import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export async function runSummarizer(text, summaryType, gradeOrBranch) {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 1500,
  });

  const role = `
You are "EduAI", an expert educational assistant that adapts explanations for students.
If the user specifies a grade (1–12), simplify explanations appropriately.
If the user specifies a college branch (e.g., CSE, Mechanical, Commerce), make the summary domain-specific. and give summary in a way you are interacting and giving proper format of topic
`;

  const fewShots = `
### Example (Brief Summary)
Input: "Photosynthesis converts light energy into chemical energy."
Output: "Photosynthesis turns sunlight, carbon dioxide, and water into food (glucose) for plants, releasing oxygen."

### Example (Examples)
Input: "Newton's Laws of Motion"
Output:
1. What happens when a car suddenly stops? (Inertia)
2. How does force affect acceleration?
3. Give a real-life example of Newton's third law.

### Example (Mind Map)
Input: "Machine Learning is a part of Artificial Intelligence."
Output:
{
  "concept": "Machine Learning",
  "subconcepts": [
    { "concept": "Supervised Learning", "subconcepts": ["Regression", "Classification"] },
    { "concept": "Unsupervised Learning", "subconcepts": ["Clustering", "Dimensionality Reduction"] }
  ]
}
`;

  // 🧠 Context awareness: detect if it's a grade or branch
  let levelContext = "";
  const gradeNum = parseInt(gradeOrBranch);
  if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
    levelContext = `The user is a Grade ${gradeNum} school student. Use simpler language and examples relevant to their age. `;
  } else {
    levelContext = `The user is a college student studying ${gradeOrBranch}. Use terminology and examples from that branch.`;
  }

  let task = "";
  switch (summaryType) {
    case "brief":
      task = `Write a concise academic summary for ${gradeOrBranch} level.it should be of 200-300 words minimum`;
      break;
    case "long":
      task = `Write a detailed summary for ${gradeOrBranch} level, covering key points, subtopics, and explanations.and also give insigth of direction question can be formed give summary of 1000 words appprox`;
      break;
    case "examples":
      task = `Generate 10-15 concept-based questions and their short answers to test understanding of the content.`;
      break;
    case "mindmap":
      task = `Create a JSON-structured mind map of main topics and subtopics.`;
      break;
    default:
      task = `Summarize appropriately for ${gradeOrBranch} level.`;
  }

  const prompt = new PromptTemplate({
    inputVariables: ["role", "context", "task", "examples", "text"],
    template: `
{role}

{context}

Instruction: {task}

Follow these examples:
{examples}

Text to process:
{text}
    `,
  });

  const input = await prompt.format({
    role,
    context: levelContext,
    task,
    examples: fewShots,
    text: text.slice(0, 8000),
  });

  const parser = new StringOutputParser();
  const result = await model.pipe(parser).invoke(input);

  return result.trim();
}
