"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CDVQHHLXRRSAJ3LCYLE25FAFCBFXOCRCWGOPDM2MN6GD3VN5OI3RAGA5";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// Types
// ============================================================

export interface Article {
  id: number;
  title: string;
  content: string;
  author: string;
  timestamp: number;
  upvotes: number;
  downvotes: number;
}

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey();
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValI64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i64" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// News Platform — Contract Methods
// ============================================================

/**
 * Submit a new article to the platform.
 * Permissionless: anyone can submit news.
 */
export async function submitArticle(
  caller: string,
  title: string,
  content: string
): Promise<number> {
  const result = await callContract(
    "submit_article",
    [toScValString(title), toScValString(content), toScValAddress(caller)],
    caller,
    true
  );
  // Return article ID from result
  if (result && (result as any).result) {
    const retval = (result as any).result.retval;
    return scValToNative(retval);
  }
  return 0;
}

/**
 * Upvote an article.
 * Permissionless: anyone can vote.
 */
export async function upvote(
  caller: string,
  articleId: number
) {
  return callContract(
    "upvote",
    [toScValU32(articleId), toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Downvote an article.
 * Permissionless: anyone can vote.
 */
export async function downvote(
  caller: string,
  articleId: number
) {
  return callContract(
    "downvote",
    [toScValU32(articleId), toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Remove upvote from an article.
 * Permissionless: anyone can remove their vote.
 */
export async function removeUpvote(
  caller: string,
  articleId: number
) {
  return callContract(
    "remove_upvote",
    [toScValU32(articleId), toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Remove downvote from an article.
 * Permissionless: anyone can remove their vote.
 */
export async function removeDownvote(
  caller: string,
  articleId: number
) {
  return callContract(
    "remove_downvote",
    [toScValU32(articleId), toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Get a single article by ID.
 */
export async function getArticle(
  articleId: number
): Promise<Article | null> {
  const result = await readContract(
    "get_article",
    [toScValU32(articleId)]
  );
  return result as Article | null;
}

/**
 * Get paginated list of articles.
 */
export async function getArticles(
  offset: number,
  limit: number
): Promise<Article[]> {
  const result = await readContract(
    "get_articles",
    [toScValU32(offset), toScValU32(limit)]
  );
  return (result || []) as Article[];
}

/**
 * Get articles sorted by score (highest first).
 */
export async function getTopArticles(
  offset: number,
  limit: number
): Promise<Article[]> {
  const result = await readContract(
    "get_top_articles",
    [toScValU32(offset), toScValU32(limit)]
  );
  return (result || []) as Article[];
}

/**
 * Get total article count.
 */
export async function getArticleCount(): Promise<number> {
  const result = await readContract("get_article_count", []);
  return (result as number) || 0;
}

/**
 * Get net score for an article.
 */
export async function getScore(
  articleId: number
): Promise<number> {
  const result = await readContract(
    "get_score",
    [toScValU32(articleId)]
  );
  return (result as number) || 0;
}

/**
 * Check if user has voted on an article.
 * Returns [hasUpvoted, hasDownvoted]
 */
export async function hasVoted(
  articleId: number,
  voter: string
): Promise<[boolean, boolean]> {
  const result = await readContract(
    "has_voted",
    [toScValU32(articleId), toScValAddress(voter)]
  );
  if (Array.isArray(result)) {
    return [result[0] as boolean, result[1] as boolean];
  }
  return [false, false];
}

export { nativeToScVal, scValToNative, Address, xdr };
