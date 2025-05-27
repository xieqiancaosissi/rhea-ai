import { NextResponse } from "next/server";
import { fetchTopTokens } from "@/utils/indexer";

export async function GET() {
  try {
    const tokenTokenDetails = await fetchTopTokens();
    return NextResponse.json({
      tokenTokenDetails,
      prompt: `The data will be rendered separately, so please do not explain or display the data again. Remember, you don't need to show the data— it will be rendered in the UI according to the specified style to avoid redundancy.`,
    });
  } catch (error) {
    console.error("Error top token list", error);
    return NextResponse.json(
      { error: "Failed to query top token list" },
      { status: 200 }
    );
  }
}
