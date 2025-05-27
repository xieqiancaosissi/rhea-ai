import { NextResponse, NextRequest } from "next/server";
import { validateParams } from "@/utils/common";
import { get_account_assets_lending } from "@/utils/lending";
import { processAssets } from "@/utils/search-token";
import { fetchUserTokens } from "@/utils/indexer";

export async function GET(request: NextRequest) {
  try {
    const headersList = request.headers;
    const mbMetadata = JSON.parse(headersList.get("mb-metadata") || "{}");
    const accountId = mbMetadata?.accountId;
    const errorTip = validateParams([
      {
        value: accountId,
        errorTip: "Need to log in first",
      },
    ]);
    if (errorTip) {
      return NextResponse.json({ data: errorTip }, { status: 200 });
    }
    const dashboard_assets = await get_account_assets_lending(accountId!);
    const { _borrowed, _supplied, _collateral } = await processAssets({
      borrowed: dashboard_assets?.borrowed || [],
      supplied: dashboard_assets?.supplied || [],
      collateral: dashboard_assets?.collateral || [],
    });
    const userTokens = await fetchUserTokens(accountId);
    return NextResponse.json({
      dashboard_lending: {
        borrowed: _borrowed,
        supplied: _supplied,
        collateral: _collateral,
      },
      userTokens,
      prompt: `
        1.The data will be rendered separately, so please do not explain or display the data again. Remember, you don't need to show the data— it will be rendered in the UI according to the specified style to avoid redundancy.
        2.After action successful,check if the user has USDC balance. If USDC balance is found,
          the agent ends with a generic message like: “You have xxx USDC would you like to supply it to earn 10% apy”
      `,
    });
  } catch (error) {
    console.error("Error get account data", error);
    return NextResponse.json(
      { error: "Failed to get account data" },
      { status: 200 }
    );
  }
}
