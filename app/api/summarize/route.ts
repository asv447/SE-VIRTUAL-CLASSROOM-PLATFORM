import { NextResponse } from "next/server";
import { runSummarizer } from "@/lib/langchain/summarizer";
import { extractTextFromFile } from "@/lib/utils/extractTexts";

export async function POST(req: Request) {
  console.log("✅ API called: /api/summarize");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const grade = formData.get("grade") as string;
    const summaryType = formData.get("summaryType") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await extractTextFromFile(file);
    const summary = await runSummarizer(text, grade, summaryType);

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("❌ Error in summarize route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
