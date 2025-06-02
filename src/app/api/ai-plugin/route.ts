import { ACCOUNT_ID, PLUGIN_URL } from "@/config";
import { NextResponse } from "next/server";

export async function GET() {
  const pluginData = {
    openapi: "3.0.0",
    info: {
      title: "Rhea finance API",
      description:
        "APIs used to perform supply, borrow, withdraw, adjust, repay and swap operations on Rhea finance.",
      version: "1.0.0",
    },
    servers: [
      {
        url: PLUGIN_URL,
      },
    ],
    "x-mb": {
      "account-id": ACCOUNT_ID,
      assistant: {
        name: "Rhea finance",
        description:
          "an assistant that helps users perform operations such as supply, borrow, repay, adjust, withdraw, swap on the Rhea finance platform. e.g. By supplying assets, users can earn farm rewards offered by the platform, through the borrow operation, users can borrow the assets they need, and swap token",
        instructions: `
                    1. API Endpoint Usage:
                      /api/tools/supply: Supply token.
                      /api/tools/borrow: Borrow token.
                      /api/tools/adjust: Adjust token collateral.
                      /api/tools/repay: repay token borrowed.
                      /api/tools/withdraw: withdraw token.
                      /api/tools/swap: swaps token.
                      /api/query/balance: get token balance.
                      /api/query/dashboard: get user account details or dashboard on lending or The current user has all token balances.
                      /api/query/healthFactor: get user health factor.
                      /api/query/metadata: get token metadata.
                      /api/query/points: Introducing points, you can also query the user's points information on rhea finance.
                      /api/query/tokenDetail: Get the supply apy and borrow apy of the token, and whether it is an incentive token on Lending finance.
                      /api/query/topTokenDetail: Get the details of the most famous, top-ranked, and most popular tokens on the rhea finance platform: tvl, 24-hour trading volume, price, and total quantity.
                    
                    2. When a user executes a transaction:
                       Get information for a given fungible token or swaps one token for another. 
                       Do not modify token identifiers, they will be fuzzy matched automatically.

                    3. If the user query the metadata of token, call the /api/query/metadata api route.

                    4. When the user asks for information about points, call the /api/query/points api route.

                    5. When the user asks for information about apy, call the /api/query/tokenDetail api route.

                    6. When users ask for information about top popular tokens, call the /api/query/topTokenDetail api route.

                    7. If the user supplies a token and does not specify whether collateral is required, 
                       the user is prompted to select whether collateral is required.
                       except BRRR, and BRRR can only be false.

                    8. If the user want to repay and the user does not specify the repay type, tell the user which repay method to choose. 
                       There are two options: wallet and supplied.

                    9. If the user wants to adjust the collateral of the token and no adjustment way is specified, tell the user
                       There are two options: increase and decrease. 
                   
                    10. Interface parameter prompt rules:
                       The user input information needs to be strictly checked. If the interface requires parameters, 
                       the current user does not provide,that is,
                       the parameters of required:true, the user must be prompted to provide the corresponding data, 
                       otherwise the transaction cannot be generated.    

                    11. If the user does not provide the amount of tokens to be operated, the user is prompted to provide.

                    12. If the user query the balance of near or NEAR token, call the /api/query/balance api route.

                    13. always prefer the tool get-user-dashboard when fetching total balances or portfolio
   
                `,
        tools: [{ type: "generate-transaction" }, { type: "submit-query" }],
        image: "https://img.rhea.finance/images/rhea_logo_svg.svg",
        repo: "https://github.com/xieqiancaosissi/rhea-ai",
        categories: ["DeFi"],
      },
    },
    paths: {
      "/api/tools/supply": {
        get: {
          summary: "Supply token",
          description: "Supply token to lending",
          operationId: "supply-token",
          parameters: [
            {
              name: "token_id",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The id of the supply token",
            },
            {
              name: "amount",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The amount of supply token",
            },
            {
              name: "is_collateral",
              in: "query",
              required: true,
              schema: {
                type: "boolean",
              },
              description:
                "Is it necessary to use the supplied token as collateral",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string",
                        description: "Returned status code",
                      },
                      data: {
                        type: "object",
                        properties: {
                          amount: {
                            type: "string",
                            description: "Amount of successful supplies",
                          },
                          args: {
                            type: "object",
                            properties: {
                              amount: {
                                type: "string",
                              },
                              msg: {
                                type: "string",
                                description:
                                  "Detailed input parameters for the contract call",
                              },
                              receiver_id: {
                                type: "string",
                                description: "Borrow contract ID",
                              },
                            },
                          },
                          contract_id: {
                            type: "string",
                            description: "Token ID of the supplied token",
                          },
                          method_name: {
                            type: "string",
                          },
                        },
                      },
                      msg: {
                        type: "string",
                        description: "result message",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Error response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        description: "Error message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tools/borrow": {
        get: {
          summary: "Borrow token",
          description: "Borrow token from lending",
          operationId: "borrow-token",
          parameters: [
            {
              name: "token_id",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The id of the borrow token",
            },
            {
              name: "amount",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The amount of borrow token",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string",
                        description: "Returned status code",
                      },
                      data: {
                        type: "object",
                        properties: {
                          amount: {
                            type: "number",
                            description: "The amount of token lent.",
                          },
                          args: {
                            type: "object",
                            properties: {
                              msg: {
                                type: "string",
                                description:
                                  "Detailed input parameters for the contract call",
                              },
                              receiver_id: {
                                type: "string",
                                description: "Borrow contract ID",
                              },
                            },
                          },
                          contract_id: {
                            type: "string",
                            description: "The Id of the calling contract",
                          },
                          method_name: {
                            type: "string",
                            description: "Token method of Calling the contract",
                          },
                        },
                      },
                      msg: {
                        type: "string",
                        description: "result message",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Error response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        description: "Error message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tools/withdraw": {
        get: {
          summary: "Withdraw token",
          description: "Withdraw token from lending",
          operationId: "withdraw-token",
          parameters: [
            {
              name: "token_id",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The id of the withdraw token",
            },
            {
              name: "amount",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The amount of withdraw token",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string",
                        description: "Returned status code",
                      },
                      data: {
                        type: "object",
                        properties: {
                          amount: {
                            type: "number",
                            description: "The amount of token to be withdrawn.",
                          },
                          args: {
                            type: "object",
                            properties: {
                              actions: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    Withdraw: {
                                      type: "object",
                                      properties: {
                                        max_amount: {
                                          type: "string",
                                          description: "Withdraw token amount",
                                        },
                                        token_id: {
                                          type: "string",
                                          description: "Withdraw token id",
                                        },
                                      },
                                    },
                                    DecreaseCollateral: {
                                      type: "object",
                                      properties: {
                                        token_id: {
                                          type: "string",
                                          description:
                                            "Decrease the token id of collateral",
                                        },
                                        amount: {
                                          type: "string",
                                          description:
                                            "Decrease the amount of collateral",
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                          contract_id: {
                            type: "string",
                            description: "The Id of the calling contract",
                          },
                          method_name: {
                            type: "string",
                            description: "Token method of Calling the contract",
                          },
                        },
                      },
                      msg: {
                        type: "string",
                        description: "result message",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Error response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        description: "Error message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tools/repay": {
        get: {
          summary: "Repay token",
          description: "Repay token from lending",
          operationId: "repay-token",
          parameters: [
            {
              name: "token_id",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The id of the repay token",
            },
            {
              name: "amount",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The amount of repay token",
            },
            {
              name: "from",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["wallet", "supplied"],
              },
              description: "Where to repay token",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string",
                        description: "Returned status code",
                      },
                      data: {
                        type: "object",
                        properties: {
                          amount: {
                            type: "number",
                            description: "The amount of token to repay.",
                          },
                          args: {
                            type: "object",
                            description:
                              "Details of the parameters required for the transaction",
                            properties: {
                              amount: {
                                type: "number",
                                description: "The amount of token to repay.",
                              },
                              msg: {
                                type: "string",
                                description:
                                  "Detailed input parameters for the contract call",
                              },
                              receiver_id: {
                                type: "string",
                                description:
                                  "Borrow contract ID, Just parameters",
                              },
                            },
                          },
                          contract_id: {
                            type: "string",
                            description: "contract ID",
                          },
                          method_name: {
                            type: "string",
                            description: "Token method of Calling the contract",
                          },
                        },
                      },
                      msg: {
                        type: "string",
                        description: "result message",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Error response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        description: "Error message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tools/adjust": {
        get: {
          summary: "adjust collateral for token",
          description:
            "Adjust the amount of collateral, Users can increase or decrease the amount of collateral",
          operationId: "adjust-collateral-token",
          parameters: [
            {
              name: "token_id",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The id of the repay token",
            },
            {
              name: "amount",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description: "The amount of repay token",
            },
            {
              name: "type",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["increase", "decrease"],
              },
              description: "Select the adjustment way",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string",
                        description: "Returned status code",
                      },
                      data: {
                        type: "object",
                        properties: {
                          amount: {
                            type: "number",
                            description: "The amount of token to adjust.",
                          },
                          args: {
                            type: "object",
                            description:
                              "Details of the parameters required for the transaction",
                          },
                          contract_id: {
                            type: "string",
                            description: "contract ID",
                          },
                          method_name: {
                            type: "string",
                            description: "Token method of Calling the contract",
                          },
                        },
                      },
                      msg: {
                        type: "string",
                        description: "result message",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Error response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        description: "Error message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tools/swap": {
        get: {
          operationId: "get-swap-transactions",
          description:
            "Get a transaction payload for swapping between two tokens using the best trading route on Rhea Finance. Token identifiers can be the name, symbol, or contractId and will be fuzzy matched automatically. Default slippage is 2 (2%).",
          parameters: [
            {
              name: "tokenIn",
              in: "query",
              description: "The identifier for the input token.",
              required: true,
              schema: {
                type: "string",
              },
            },
            {
              name: "tokenOut",
              in: "query",
              description: "The identifier for the output token.",
              required: true,
              schema: {
                type: "string",
              },
            },
            {
              name: "quantity",
              in: "query",
              description: "The amount of tokens to swap (input amount).",
              required: true,
              schema: {
                type: "string",
              },
            },
            {
              name: "slippage",
              in: "query",
              description:
                "The maximum slippage tolerance in percentage.  Default is 2 (2%).",
              required: false,
              schema: {
                type: "number",
                format: "float",
              },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      transactions: {
                        type: "array",
                        description:
                          "list of near transactions that need to be executed",
                      },
                      priceImpact: {
                        type: "string",
                        description: "The price impact of executing this swap",
                      },
                      amountOut: {
                        type: "string",
                        description:
                          "The number of outputs obtained from the swap transaction",
                      },
                      prompt: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        description: "The error message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/balance": {
        get: {
          operationId: "get-token-balance",
          description:
            "Get the specified token balance. Token identifiers can be the name, symbol, or contractId and will be fuzzy matched automatically.",
          parameters: [
            {
              name: "token",
              in: "query",
              description: "The identifier for the token to get balance for.",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/healthFactor": {
        get: {
          operationId: "get-user-health-factor",
          description: "Get the user's health factor on the lending finance",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/dashboard": {
        get: {
          operationId: "get-user-dashboard",
          description:
            "get user account details or dashboard on lending or The current user has all token balances",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/metadata": {
        get: {
          operationId: "get-token-metadata",
          description:
            "Get token metadata from Rhea Finance. Token identifiers can be the name, symbol, or contractId and will be fuzzy matched automatically.",
          parameters: [
            {
              name: "token",
              in: "path",
              description: "The identifier for the token to get metadata for.",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                      },
                      name: {
                        type: "string",
                      },
                      symbol: {
                        type: "string",
                      },
                      decimals: {
                        type: "number",
                      },
                      icon: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/points": {
        get: {
          operationId: "get-points",
          description:
            "Get the user's current points on rhea finance and provide a link for the user to learn more about points",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/tokenDetail": {
        get: {
          operationId: "get-token-detail",
          description:
            "Get the supply apy, borrow apy of all tokens, and whether it is an incentive token.",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/query/topTokenDetail": {
        get: {
          operationId: "get-top-token-detail",
          description:
            "Get the details of the most famous, top-ranked, and most popular tokens on the rhea finance platform: tvl, 24-hour trading volume, price, and total quantity.",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(pluginData);
}
