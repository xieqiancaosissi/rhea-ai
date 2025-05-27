import { NextResponse, NextRequest } from "next/server";
import Decimal from "decimal.js";
import { RHEA_LENDING_INTERFACE_DOMAIN } from "@/config";
import { expandTokenDecimal } from "@/utils/common";
import { WRAP_NEAR_CONTRACT_ID } from "@/utils/constant";
import { getLendingMatchToken } from "@/utils/search-token";
import { LENDING_SUPPORT_TOKENS_TIP } from "@/utils/constant";
import {
  register,
  registerOnToken,
  validateParams,
  transferToTranstions,
  nearDepositTranstion,
} from "@/utils/common";
import { toReadableNumber } from "@/utils/tools";
import { ftGetBalance } from "rhea-dex-swap-sdk";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let token_id = searchParams.get("token_id");
    const amount = searchParams.get("amount");
    const is_collateral = searchParams.get("is_collateral");
    const headersList = request.headers;
    const mbMetadata = JSON.parse(headersList.get("mb-metadata") || "{}");
    const account_id = mbMetadata?.accountId;
    const errorTip = validateParams([
      {
        value: account_id,
        errorTip: "Need to log in first",
      },
      {
        value: token_id,
        errorTip: "token_id parameter is required",
      },
    ]);
    if (errorTip) {
      return NextResponse.json({ data: errorTip }, { status: 200 });
    }
    const token = getLendingMatchToken(token_id!);
    if (!token) {
      return NextResponse.json(
        {
          prompt: LENDING_SUPPORT_TOKENS_TIP,
        },
        { status: 200 }
      );
    }
    token_id = token.token;
    const decimals = token.decimals;
    const amountExpand = expandTokenDecimal(amount || 0, decimals || 0).toFixed(
      0,
      Decimal.ROUND_DOWN
    );
    const max_supply_res = await fetch(
      `${RHEA_LENDING_INTERFACE_DOMAIN}/max_supply_balance/${account_id}/${token_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const max_supply = await max_supply_res.json();
    if (Decimal(max_supply.data || 0).lt(amount || 0)) {
      return NextResponse.json(
        {
          data: `The balance is insufficient. The maximum amount you can supply is ${max_supply.data}`,
        },
        { status: 200 }
      );
    }

    const transactions = [];
    const register_tx = await register(account_id as string);
    if (register_tx) {
      transactions.push(register_tx);
    }
    if (token_id == WRAP_NEAR_CONTRACT_ID) {
      const register_token_result = await registerOnToken(
        account_id,
        token_id,
        "0.00125"
      );
      if (register_token_result) {
        transactions.push(register_token_result);
      }
      const near_deposit_tx = nearDepositTranstion(account_id, amount!);
      transactions.push(near_deposit_tx);
    }
    const res = await fetch(`${RHEA_LENDING_INTERFACE_DOMAIN}/supply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token_id,
        amount: amountExpand,
        is_collateral: is_collateral == "true" ? true : false,
      }),
    });
    const result = await res.json();
    const tx = transferToTranstions(result, account_id);
    transactions.push(tx);
    // extra
    const _res = await ftGetBalance(
      "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      account_id
    );
    const balance = toReadableNumber(6, _res);
    return NextResponse.json({
      transactions,
      prompt: `
        1.After action successful,check if USDC balance ${balance} is greater than 0. If USDC balance is found,
          the agent ends with a generic message like: “You have xxx USDC would you like to supply it to earn 10% apy”
      `,
    });
  } catch (error) {
    console.error("Error supply", error);
    return NextResponse.json({ error: "Failed to supply" }, { status: 500 });
  }
}
