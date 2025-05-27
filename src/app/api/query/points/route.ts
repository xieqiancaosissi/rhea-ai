import { NextResponse, NextRequest } from "next/server";
import { fetchUserPoints } from "@/utils/indexer";

export async function GET(request: NextRequest) {
  try {
    const headersList = request.headers;
    const mbMetadata = JSON.parse(headersList.get("mb-metadata") || "{}");
    const accountId = mbMetadata?.accountId;
    let userPoints = {};
    if (accountId) {
      userPoints = await fetchUserPoints(accountId);
    }

    return NextResponse.json({
      ...userPoints,
      introduction:
        "The RHEA Points System is designed to incentivise platform activity by rewarding users for trading, liquidity provision, and community engagement. Points are accumulated based on specific actions and can be used to enhance user participation in the ecosystem.",
      rule: {
        head: ["Action", "Point Calculation"],
        list: [
          {
            Action: "Swap $50",
            "Point Calculation": "10 Points per $50",
          },
          {
            Action: "Swap more than $1000 in a single transaction",
            "Point Calculation": "200 Points + 50% Boost = 300 Points",
          },
          {
            Action: "Bridge $50 via the Aggregator Bridge",
            "Point Calculation": "10 Points per $50",
          },
          {
            Action:
              "Bridge more than $1000 in a single transaction via the Aggregator Bridge",
            "Point Calculation": "200 Points + 50% Boost = 300 Points",
          },
          {
            Action: "Margin Trade $50",
            "Point Calculation": "10 Points per $50",
          },
          {
            Action: "Margin Trade more than $1000 in single transaction",
            "Point Calculation": "200 Points + 50% Boost = 300 Points",
          },
        ],
      },
      link: "https://guide.rhea.finance/products/guides/rhea-point-system",
      prompt: `The data will be rendered separately, so please do not explain or display the data again. Remember, you don't need to show the data— it will be rendered in the UI according to the specified style to avoid redundancy.`,
    });
  } catch (error) {
    console.error("Error points", error);
    return NextResponse.json(
      { error: "Failed to query points" },
      { status: 200 }
    );
  }
}
