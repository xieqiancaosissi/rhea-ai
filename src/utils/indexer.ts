import Decimal from "decimal.js";
import {
  INDEXER_DOMAIN_URL,
  SMART_ROUTER_DOMAIN_URL,
  API_DATA_SERVICE_DOMAIN_URL,
  API_FASTERNEAR_DOMAIN_URL,
} from "./constant";
import axios from "axios";
import { toReadableNumber } from "rhea-dex-swap-sdk";
import { whitelisted_tokens } from "@/utils/tokens";
interface IAsset {
  name: string;
  symbol: string;
  icon: string;
  reference: string;
  decimals: number;
  id: string;
}
export async function getListToken() {
  const list_token = await fetch(`${INDEXER_DOMAIN_URL}/list-token`).then(
    (res) => res.json()
  );
  const tokens = JSON.parse(JSON.stringify(list_token || {}));
  Object.keys(list_token).forEach((tokenId: string) => {
    if (!whitelisted_tokens.includes(tokenId)) {
      delete tokens[tokenId];
    }
  });
  return tokens;
}
export async function fetchAllPools() {
  const res = await fetch(`${INDEXER_DOMAIN_URL}/fetchAllPools`).then((res) =>
    res.json()
  );
  return res;
}
export async function getTokenPriceList() {
  const res = await fetch(`${INDEXER_DOMAIN_URL}/list-token-price`).then(
    (res) => res.json()
  );
  return res;
}
export async function findPath({
  amountIn,
  tokenInId,
  tokenOutId,
  slippage,
}: {
  amountIn: string;
  tokenInId: string;
  tokenOutId: string;
  slippage: string | number;
}) {
  const res = await fetch(
    `${SMART_ROUTER_DOMAIN_URL}/findPath?amountIn=${amountIn}&tokenIn=${tokenInId}&tokenOut=${tokenOutId}&slippage=${slippage}&pathDeep=3`
  ).then((res) => {
    return res.json();
  });
  return res;
}

export async function fetchUserPoints(accountId: string) {
  const res = await fetch(
    `${INDEXER_DOMAIN_URL}/v3/points/user?addr=${accountId}`
  ).then((res) => res.json());
  return {
    last_liquidity_points: res.data.last_liquidity_points,
    liquidity_points: res.data.liquidity_points,
    trade_points: res.data.trade_points,
    total_points: res.data.total_points,
    invite_points: res.data.invite_points,
  };
}
export async function fetchTopTokens() {
  const { data } = await axios(
    `${API_DATA_SERVICE_DOMAIN_URL}/overview/list_top_tokens`
  );
  const list = data.map((t: any) => {
    const newT: any = {};
    newT.token = t.token_id;
    newT.symbol = t.symbol == "wNEAR" ? "NEAR" : t.symbol;
    newT.price = t.price;
    newT.volume24h = t.volume24h;
    newT.tvl = t.tvl;
    newT.amount = t.amount;
    newT.rank = t.rank;
    return newT;
  });
  return list;
}
export async function fetchUserTokens(accountId: string) {
  const res = await fetch(
    `${API_FASTERNEAR_DOMAIN_URL}/v1/account/${accountId}/ft`
  ).then((res) => res.json());
  const tokenList = res.tokens;
  const tokenListWithBalance = tokenList.filter((t: any) =>
    new Decimal(t.balance || 0).gt(0)
  );
  const tokens = await getListToken();
  const tokenMap: Record<string, IAsset> = Object.keys(tokens).reduce(
    (acc: any, token_id) => {
      const token = tokens[token_id];
      token.id = token_id;
      acc[token_id] = token;
      return acc;
    },
    {}
  );
  const userTokens = tokenListWithBalance.map((t: any) => {
    const token = tokenMap[t.contract_id];
    if (!token) return t;
    const balance = toReadableNumber(token.decimals, t.balance);
    return {
      balance,
      symbol: token.symbol,
      token: token.id,
    };
  });
  const filteredList = userTokens.filter((u: any) => {
    return whitelisted_tokens.includes(u.token);
  });
  return filteredList;
}
