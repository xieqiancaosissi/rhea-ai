import Fuse from "fuse.js";
import Decimal from "decimal.js";
import type { IFuseOptions } from "fuse.js";
import { toReadableNumber } from "@/utils/tools";
import { allowlistedTokens } from "@/utils/allowlist-tokens";
import type { AllowlistedToken } from "@/utils/allowlist-tokens";
import { getListToken } from "./indexer";
import { support_tokens } from "./tokens";
interface IAccountAsset {
  apr: string;
  balance: string;
  shares: string;
  token_id: string;
  symbol: string;
}
interface IAsset {
  name: string;
  symbol: string;
  icon: string;
  reference: string;
  decimals: number;
  id: string;
}
// Create an array of tokens
const tokens = Object.values(allowlistedTokens);

// Set up the fuse.js options
const options: IFuseOptions<AllowlistedToken> = {
  includeScore: true,
  keys: [
    { name: "name", weight: 0.5 },
    { name: "symbol", weight: 0.3 },
    { name: "id", weight: 0.2 },
  ],
  isCaseSensitive: false,
  threshold: 0.3, // Adjust the threshold for the desired level of fuzziness
};

// Create a new fuse instance
const fuse = new Fuse(tokens, options);

export const searchToken = (query: string): AllowlistedToken[] => {
  if (query.toLowerCase() === "near") return [allowlistedTokens["wrap.near"]];
  // Search the tokens with the query
  const result = fuse.search(query);

  // Map the result to only return the tokens
  return result.map((res) => res.item);
};

export const searchTokenByName = (
  query: string,
  list: Record<string, AllowlistedToken>
): AllowlistedToken[] => {
  if (query.toLowerCase() === "near" || query.toLowerCase() === "wnear")
    return [list["wrap.near"]];
  if (query.toLowerCase() === "abtc") {
    return [
      list["31761a152f1e96f966c041291644129144233b0b.factory.bridge.near"],
    ];
  }
  if (query.toLowerCase() === "nbtc") {
    return [list["nbtc.bridge.near"]];
  }
  if (query.toLowerCase() === "btc" || query.toLowerCase() === "wbtc") {
    return [
      list["2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near"],
    ];
  }
  // Search the tokens with the query
  const result = fuse.search(query);

  // Map the result to only return the tokens
  return result.map((res) => res.item);
};

export async function getMatchTokens(
  tokenInName: string,
  tokenOutName: string
) {
  const tokens = await getListToken();
  const tokenMap = Object.keys(tokens).reduce((acc: any, token_id) => {
    const token = tokens[token_id];
    token.id = token_id;
    acc[token_id] = token;
    return acc;
  }, {});
  const tokenList: AllowlistedToken[] = Object.values(tokenMap);
  let tokenInMetadata: AllowlistedToken;
  let tokenOutMetadata: AllowlistedToken;
  tokenInMetadata = searchTokenByName(tokenInName, tokenMap)?.[0];
  if (!tokenInMetadata) {
    tokenInMetadata = tokenList.find(
      (token: any) =>
        token.id?.toLowerCase() == tokenInName.toLowerCase() ||
        token.symbol?.toLowerCase() == tokenInName.toLowerCase()
    ) as AllowlistedToken;
  }
  tokenOutMetadata = searchTokenByName(tokenOutName, tokenMap)?.[0];
  if (!tokenOutMetadata) {
    tokenOutMetadata = tokenList.find(
      (token: any) =>
        token.id?.toLowerCase() == tokenOutName.toLowerCase() ||
        token.symbol?.toLowerCase() == tokenOutName.toLowerCase()
    ) as AllowlistedToken;
  }
  return [tokenInMetadata, tokenOutMetadata];
}

export function getLendingMatchToken(tokenName: string) {
  if (
    tokenName.toLowerCase() === "near" ||
    tokenName.toLocaleLowerCase() === "wnear"
  )
    return {
      symbol: "wNEAR",
      token: "wrap.near",
      decimals: 24,
    };
  const matchedToken = support_tokens.find(
    (token) =>
      token.symbol.toLocaleLowerCase() == tokenName.toLocaleLowerCase() ||
      token.token.toLocaleLowerCase() == tokenName.toLocaleLowerCase()
  );
  return matchedToken;
}
export async function getDexMatchToken(tokenName: string) {
  if (
    tokenName.toLowerCase() === "near" ||
    tokenName.toLocaleLowerCase() === "wnear"
  )
    return {
      symbol: "NEAR",
      id: "NEAR",
      decimals: 24,
    };
  const tokens = await getListToken();
  const tokenMap = Object.keys(tokens).reduce((acc: any, token_id) => {
    const token = tokens[token_id];
    token.id = token_id;
    acc[token_id] = token;
    return acc;
  }, {});
  const tokenList: AllowlistedToken[] = Object.values(tokenMap);
  let tokenMetadata: AllowlistedToken;

  tokenMetadata = searchTokenByName(tokenName, tokenMap)?.[0];
  if (!tokenMetadata) {
    tokenMetadata = tokenList.find(
      (token: any) =>
        token.id?.toLowerCase() == tokenName.toLowerCase() ||
        token.symbol?.toLowerCase() == tokenName.toLowerCase()
    ) as AllowlistedToken;
  }
  return tokenMetadata;
}

export async function processAssets({
  borrowed,
  supplied,
  collateral,
}: {
  borrowed: IAccountAsset[];
  supplied: IAccountAsset[];
  collateral: IAccountAsset[];
}) {
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
  const allDeposit = supplied.concat(collateral);
  const depositTokenIds = Array.from(
    new Set(allDeposit.map((item) => item.token_id))
  );
  const suppliedWithColla: IAccountAsset[] = depositTokenIds.map((token_id) => {
    const c: any = collateral.find((c) => c.token_id == token_id);
    const s: any = supplied.find((s) => s.token_id == token_id);
    let item;
    if (c) {
      item = JSON.parse(JSON.stringify(c));
      item.balance = new Decimal(c.balance).plus(s?.balance || 0).toFixed(0);
      item.shares = new Decimal(c.shares).plus(s?.shares || 0).toFixed(0);
    } else if (s) {
      item = JSON.parse(JSON.stringify(s));
      item.balance = new Decimal(s.balance).plus(c?.balance || 0).toFixed(0);
      item.shares = new Decimal(s.shares).plus(c?.shares || 0).toFixed(0);
    }
    return item;
  });
  const _borrowed = processUtil(tokenMap, borrowed);
  const _supplied = processUtil(tokenMap, suppliedWithColla);
  const _collateral = processUtil(tokenMap, collateral);
  return {
    _borrowed,
    _supplied,
    _collateral,
  };
}

function processUtil(
  tokenMap: Record<string, IAsset>,
  assets: IAccountAsset[]
) {
  const _assets = assets.map((asset: IAccountAsset) => {
    const target = tokenMap[asset.token_id];
    if (!target) return asset;
    const decimals = target.decimals >= 18 ? target.decimals : 18;
    const _balance = toReadableNumber(decimals, asset.balance);
    const _shares = toReadableNumber(decimals, asset.shares);
    const _apr = new Decimal(asset.apr || 0).mul(100).toFixed(2);
    asset.balance = _balance;
    asset.shares = _shares;
    asset.apr = _apr + "%";
    asset.symbol = target.symbol;
    return asset;
  });
  return _assets;
}
