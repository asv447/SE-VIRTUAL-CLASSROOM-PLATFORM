import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
// 1. Import the necessary JSON parsing tool from LangChain
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod"; // You will need to install zod: npm install zod

// Define the Zod schema for the Mind Map output
// This ensures the model outputs valid, predictable JSON.
const MindMapSchema = z.object({
  concept: z.string().describe("The central concept or main topic."),
  subconcepts: z.array(
    z.union([
      z.string(),
      z.lazy(() => MindMapSchema) // Allows for recursive subconcepts
    ])
  ).optional().describe("A list of subtopics, which can be simple strings or nested concepts."),
});

// The top-level output for the 'mindmap' request should contain the schema
const MindMapOutputSchema = z.object({
    mindmap: MindMapSchema,
});


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

  // 2. Update the few-shot example for the Mind Map to match the schema structure
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
  "mindmap": { // Wrap the structure in the top-level key defined in Zod
    "concept": "Machine Learning",
    "subconcepts": [
      { "concept": "Supervised Learning", "subconcepts": ["Regression", "Classification"] },
      { "concept": "Unsupervised Learning", "subconcepts": ["Clustering", "Dimensionality Reduction"] }
    ]
  }
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
  let parser = null; // 3. Initialize parser
  
  switch (summaryType) {
    case "brief":
      task = `Write a concise academic summary for ${gradeOrBranch} level. it should be of 200-300 words minimum.`;
      // Use StringOutputParser for text-based outputs
      parser = new StringOutputParser(); 
      break;
    case "long":
      task = `Write a detailed summary for ${gradeOrBranch} level, covering key points, subtopics, and explanations. and also give insigth of direction question can be formed. give summary of 1000 words appprox.`;
      parser = new StringOutputParser();
      break;
    case "examples":
      task = `Generate 10-15 concept-based questions and their short answers to test understanding of the content. Output should be plain text, formatted with numbered lists.`;
      parser = new StringOutputParser();
      break;
    case "mindmap":
      // 4. Use StructuredOutputParser for JSON output
      task = `Create a JSON-structured mind map of main topics and subtopics. The output MUST strictly follow the required JSON schema and contain ONLY the JSON object. Do not include any extra text, markdown, or commentary.`;
      parser = StructuredOutputParser.fromZodSchema(MindMapOutputSchema);
      break;
    default:
      task = `Summarize appropriately for ${gradeOrBranch} level.`;
      parser = new StringOutputParser();
  }

  const prompt = new PromptTemplate({
    // 5. Include the format instructions for JSON output
    inputVariables: ["role", "context", "task", "examples", "text", "format_instructions"],
    template: `
{role}

{context}

Instruction: {task}

Follow these examples:
{examples}

{format_instructions}

Text to process:
{text}
    `,
  });

  // 6. Get the format instructions from the parser (only relevant for mindmap)
  const formatInstructions = parser.getFormatInstructions ? parser.getFormatInstructions() : "";

  const input = await prompt.format({
    role,
    context: levelContext,
    task,
    examples: fewShots,
    format_instructions: formatInstructions, // Pass instructions to the model
    text: text.slice(0, 8000),
  });

  // 7. Pipe the model output through the selected parser
  const result = await model.pipe(parser).invoke(input);
  
  // 8. Handle the final return value
  if (summaryType === "mindmap") {
      // The parser automatically returns a JS object { mindmap: {...} }
      // We return the inner object that the frontend expects.
      return result.mindmap;
  }
  
  // For all other types, return the trimmed string
  return result.trim();
}