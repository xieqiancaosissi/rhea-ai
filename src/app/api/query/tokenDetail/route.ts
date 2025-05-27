import { NextResponse } from "next/server";
import { get_list_token_data } from "@/utils/lending";

export async function GET() {
  try {
    const tokenDetails = await get_list_token_data();
    return NextResponse.json({
      tokenDetails,
      prompt: `The data will be rendered separately, so please do not explain or display the data again. Remember, you don't need to show the data— it will be rendered in the UI according to the specified style to avoid redundancy.`,
    });
  } catch (error) {
    console.error("Error token list", error);
    return NextResponse.json(
      { error: "Failed to query token list" },
      { status: 200 }
    );
  }
}
