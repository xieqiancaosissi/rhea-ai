import { NextResponse, NextRequest } from "next/server";
import Decimal from "decimal.js";
import { getMatchTokens } from "@/utils/search-token";
import { getSlippageTolerance } from "@/utils/slippage";
import { fetchAllPools, getTokenPriceList, findPath } from "@/utils/indexer";
import { toNonDivisibleNumber, toReadableNumber } from "@/utils/tools";
import {
  nearDepositTranstion,
  nearWithdrawTranstion,
  registerOnToken,
  validateParams,
} from "@/utils/common";
import { WRAP_NEAR_CONTRACT_ID, REF_FI_CONTRACT_ID } from "@/utils/constant";
import { ftGetAvaBalance } from "rhea-dex-swap-sdk";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenIn = searchParams.get("tokenIn");
    const tokenOut = searchParams.get("tokenOut");
    const quantity = searchParams.get("quantity");
    const slippage = searchParams.get("slippage");
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
    // near <---> wnear
    const _res = is_near_wnear_tx({ tokenIn: tokenIn!, tokenOut: tokenOut! });
    if (_res) {
      const result = await do_near_wnear_tx({
        tokenIn: tokenIn!,
        tokenOut: tokenOut!,
        accountId,
        quantity: quantity!,
      });
      return NextResponse.json(
        {
          ...result,
        },
        { status: 200 }
      );
    }
    // swap
    const [tokenInData, tokenOutData] = await getMatchTokens(
      tokenIn!,
      tokenOut!
    );

    if (!tokenInData || !tokenOutData) {
      return NextResponse.json(
        {
          error: `Unable to find token(s) tokenInMatch: ${tokenIn} tokenOutMatch: ${tokenOut}`,
        },
        { status: 200 }
      );
    }
    const amountIn = toNonDivisibleNumber(tokenInData.decimals, quantity!);
    const isNEAR = tokenInData.id == "wrap.near";
    const tokenBalance = await ftGetAvaBalance(
      isNEAR ? "NEAR" : tokenInData.id,
      accountId
    );
    const balance = toReadableNumber(tokenInData.decimals, tokenBalance);
    let availableBalance = balance;
    if (isNEAR) {
      availableBalance = Decimal.max(
        new Decimal(balance || 0).minus(0.2),
        0
      ).toFixed(8);
    }
    if (new Decimal(quantity || 0).gt(availableBalance)) {
      return NextResponse.json(
        {
          error: "Insufficient Balance",
          availableBalance,
        },
        { status: 200 }
      );
    }

    const _slippage = getSlippageTolerance(slippage);
    const resultFromServer = await findPath({
      amountIn,
      tokenInId: tokenInData.id,
      tokenOutId: tokenOutData.id,
      slippage: _slippage,
    });
    const result_data = resultFromServer.result_data;
    const { amount_out, routes } = result_data;
    if (routes?.length == 0) {
      return NextResponse.json(
        {
          error: "No pool available to make a swap",
          prompt:
            "It’s possible that the matched token is not the token the user intends to trade. You can ask the user to provide more precise token information, such as the token ID",
        },
        { status: 200 }
      );
    }
    const actionsList: any[] = [];
    routes.forEach((route: any) => {
      route.pools.forEach((pool: any) => {
        if (+(pool?.amount_in || 0) == 0) {
          delete pool.amount_in;
        }
        pool.pool_id = Number(pool.pool_id);
        actionsList.push(pool);
      });
    });
    const transactions = [];
    // near deposit / near register
    if (tokenInData.id == WRAP_NEAR_CONTRACT_ID) {
      const _nearRegister = await registerOnToken(
        accountId,
        WRAP_NEAR_CONTRACT_ID
      );
      if (_nearRegister) {
        transactions.push(_nearRegister);
      }
      const _nearDeposit = nearDepositTranstion(accountId, quantity!);
      transactions.push(_nearDeposit);
    }
    // tokenOut register
    const _register = await registerOnToken(accountId, tokenOutData.id);
    if (_register) {
      transactions.push(_register);
    }
    // ---------------------transactions
    // swap
    transactions.push({
      signerId: accountId,
      receiverId: tokenInData.id,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "ft_transfer_call",
            args: {
              receiver_id: REF_FI_CONTRACT_ID,
              amount: amountIn,
              msg: JSON.stringify({
                force: 0,
                actions: actionsList,
                ...(tokenOutData.id == WRAP_NEAR_CONTRACT_ID
                  ? { skip_unwrap_near: false }
                  : {}),
              }),
            },
            gas: "300000000000000",
            deposit: "1",
          },
        },
      ],
    });

    // -------------------------------baseData
    const { ratedPools, unRatedPools, simplePools } = await fetchAllPools();
    const tokenPriceList = await getTokenPriceList();
    const allPools = unRatedPools.concat(ratedPools).concat(simplePools);
    // -------------------------------avgFee
    let avgFee: number = 0;
    routes.forEach((route: any) => {
      const { amount_in, pools } = route;
      const poolDetails = pools.map((p: any) => {
        return allPools.find((pool: any) => +pool.id == +p.pool_id);
      });
      const poolsMap = poolDetails.reduce((acc: any, cur: any) => {
        acc[cur.id] = cur;
        return acc;
      }, {});
      const allocation = new Decimal(amount_in).div(amountIn);
      const routeFee = pools.reduce((acc: any, cur: any) => {
        return acc.plus(
          poolsMap[cur.pool_id]?.fee || poolsMap[cur.pool_id]?.total_fee || 0
        );
      }, new Decimal(0));
      avgFee += allocation.mul(routeFee).toNumber();
    });
    // ----------------------priceImpact
    const tokenOutAmount = toReadableNumber(tokenOutData.decimals, amount_out);
    const newPrice = new Decimal(quantity || "0").div(
      new Decimal(tokenOutAmount || "1")
    );
    const priceIn = tokenPriceList[tokenInData.id]?.price;
    const priceOut = tokenPriceList[tokenOutData.id]?.price;
    const oldPrice = new Decimal(priceOut).div(new Decimal(priceIn));
    const priceImpactPending = newPrice.lt(oldPrice)
      ? "0"
      : newPrice.minus(oldPrice).div(newPrice).times(100).abs().toFixed();
    const priceImpact = new Decimal(priceImpactPending).minus(
      new Decimal((avgFee || 0) / 100)
    );
    let priceImpactDisplay = "";
    if (priceImpact.lt(0.01)) {
      priceImpactDisplay = "< -0.01%";
    } else if (priceImpact.gt(1000)) {
      priceImpactDisplay = "< -1000%";
    } else {
      priceImpactDisplay = `-${priceImpact.toFixed(2)}%`;
    }
    const displayExpectAmountOut = new Decimal(tokenOutAmount).toFixed(
      Decimal.min(8, tokenOutData.decimals).toNumber(),
      Decimal.ROUND_HALF_CEIL
    );
    // ------------------------------response
    return NextResponse.json({
      transactions,
      priceImpactValue: priceImpact,
      priceImpact: priceImpactDisplay,
      amountOut: displayExpectAmountOut,
      prompt: `Before triggering generate-transaction ask the user to confirm the effects of the transaction: priceImpact and amountOut`,
    });
  } catch (error) {
    console.error("Error swap", error);
    return NextResponse.json({ error: "Failed to swap" }, { status: 200 });
  }
}

async function do_near_wnear_tx({
  tokenIn,
  tokenOut,
  accountId,
  quantity,
}: {
  tokenIn: string;
  tokenOut: string;
  accountId: string;
  quantity: string;
}) {
  console.log("------------tokenIn", tokenIn);
  console.log("------------tokenOut", tokenOut);
  console.log("------------quantity", quantity);
  const isNEAR = tokenIn.toLocaleLowerCase() == "near";
  const tokenBalance = await ftGetAvaBalance(
    isNEAR ? "NEAR" : "wrap.near",
    accountId
  );
  const balance = toReadableNumber(24, tokenBalance);
  let availableBalance = balance;
  if (isNEAR) {
    availableBalance = Decimal.max(
      new Decimal(balance || 0).minus(0.2),
      0
    ).toFixed(8);
  }
  if (new Decimal(quantity || 0).gt(availableBalance)) {
    console.log("------------error");
    return {
      error: "Insufficient Balance",
      availableBalance,
    };
  }
  // near deposit
  if (
    tokenIn?.toLocaleLowerCase() == "near" &&
    tokenOut?.toLocaleLowerCase() == "wnear"
  ) {
    const transactions = [];
    const _nearRegister = await registerOnToken(
      accountId,
      WRAP_NEAR_CONTRACT_ID
    );
    if (_nearRegister) {
      transactions.push(_nearRegister);
    }
    const _nearDeposit = nearDepositTranstion(accountId, quantity!);
    transactions.push(_nearDeposit);
    return { transactions };
  } else if (
    tokenIn?.toLocaleLowerCase() == "wnear" &&
    tokenOut?.toLocaleLowerCase() == "near"
  ) {
    // near withdraw
    const transactions = [];
    const _nearWithdraw = nearWithdrawTranstion(accountId, quantity!);
    transactions.push(_nearWithdraw);
    return { transactions };
  }
}
function is_near_wnear_tx({
  tokenIn,
  tokenOut,
}: {
  tokenIn: string;
  tokenOut: string;
}) {
  return !!(
    (tokenIn?.toLocaleLowerCase() == "near" &&
      tokenOut?.toLocaleLowerCase() == "wnear") ||
    (tokenIn?.toLocaleLowerCase() == "wnear" &&
      tokenOut?.toLocaleLowerCase() == "near")
  );
}
