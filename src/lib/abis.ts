export const agentRegistryAbi = [
    {
        name: "register",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "_agentURI", type: "string" },
            { name: "agentCardHash", type: "bytes32" },
        ],
        outputs: [{ name: "agentId", type: "uint256" }],
    },
    {
        name: "bind",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            {
                name: "req",
                type: "tuple",
                components: [
                    { name: "chainNamespace", type: "string" },
                    { name: "chainId", type: "string" },
                    { name: "registryAddress", type: "address" },
                    { name: "boundAgentId", type: "uint256" },
                    { name: "proofType", type: "uint8" },
                    { name: "proofData", type: "bytes" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            },
        ],
        outputs: [],
    },
    {
        name: "getAgentRecord",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "registered", type: "bool" },
                    { name: "agentURI", type: "string" },
                    { name: "agentCardHash", type: "bytes32" },
                    { name: "registeredAt", type: "uint256" },
                    { name: "originChainNamespace", type: "string" },
                    { name: "originChainId", type: "string" },
                    { name: "ownerKey", type: "address" },
                    { name: "nativeToPush", type: "bool" },
                ],
            },
        ],
    },
    {
        name: "canonicalUEA",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "getBindings",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple[]",
                components: [
                    { name: "chainNamespace", type: "string" },
                    { name: "chainId", type: "string" },
                    { name: "registryAddress", type: "address" },
                    { name: "boundAgentId", type: "uint256" },
                    { name: "proofType", type: "uint8" },
                    { name: "verified", type: "bool" },
                    { name: "linkedAt", type: "uint256" },
                ],
            },
        ],
    },
    {
        name: "canonicalUEAFromBinding",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "chainNamespace", type: "string" },
            { name: "chainId", type: "string" },
            { name: "registryAddress", type: "address" },
            { name: "boundAgentId", type: "uint256" },
        ],
        outputs: [
            { name: "canonical", type: "address" },
            { name: "verified", type: "bool" },
        ],
    },
    {
        name: "isRegistered",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "ownerOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "agentIdOfUEA",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "uea", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;

export const reputationRegistryAbi = [
    {
        name: "getReputationScore",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getAggregatedReputation",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "totalFeedbackCount", type: "uint64" },
                    { name: "weightedAvgValue", type: "int128" },
                    { name: "valueDecimals", type: "uint8" },
                    { name: "totalPositive", type: "uint64" },
                    { name: "totalNegative", type: "uint64" },
                    { name: "chainCount", type: "uint16" },
                    { name: "lastAggregated", type: "uint64" },
                    { name: "reputationScore", type: "uint256" },
                ],
            },
        ],
    },
    {
        name: "getAllChainReputations",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple[]",
                components: [
                    { name: "chainNamespace", type: "string" },
                    { name: "chainId", type: "string" },
                    { name: "registryAddress", type: "address" },
                    { name: "boundAgentId", type: "uint256" },
                    { name: "feedbackCount", type: "uint64" },
                    { name: "summaryValue", type: "int128" },
                    { name: "valueDecimals", type: "uint8" },
                    { name: "positiveCount", type: "uint64" },
                    { name: "negativeCount", type: "uint64" },
                    { name: "sourceBlockNumber", type: "uint256" },
                    { name: "lastUpdated", type: "uint64" },
                    { name: "reporter", type: "address" },
                ],
            },
        ],
    },
    {
        name: "getSlashRecords",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple[]",
                components: [
                    { name: "chainNamespace", type: "string" },
                    { name: "chainId", type: "string" },
                    { name: "reason", type: "string" },
                    { name: "evidenceHash", type: "bytes32" },
                    { name: "slashedAt", type: "uint64" },
                    { name: "reporter", type: "address" },
                    { name: "severityBps", type: "uint256" },
                ],
            },
        ],
    },
    {
        name: "isFresh",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "agentId", type: "uint256" },
            { name: "maxAge", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
] as const;

export const erc8004Abi = [
    {
        name: "ownerOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "tokenURI",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "string" }],
    },
] as const;

export const ueaFactoryAbi = [
    {
        name: "getUEAForOrigin",
        type: "function",
        stateMutability: "view",
        inputs: [
            {
                name: "id",
                type: "tuple",
                components: [
                    { name: "chainNamespace", type: "string" },
                    { name: "chainId", type: "string" },
                    { name: "owner", type: "bytes" },
                ],
            },
        ],
        outputs: [
            { name: "uea", type: "address" },
            { name: "isDeployed", type: "bool" },
        ],
    },
] as const;

export const universalGatewayAbi = [
    {
        name: "sendUniversalTx",
        type: "function",
        stateMutability: "payable",
        inputs: [
            {
                name: "req",
                type: "tuple",
                components: [
                    { name: "recipient", type: "address" },
                    { name: "token", type: "address" },
                    { name: "amount", type: "uint256" },
                    { name: "payload", type: "bytes" },
                    { name: "revertRecipient", type: "address" },
                    { name: "signatureData", type: "bytes" },
                ],
            },
        ],
        outputs: [],
    },
    {
        name: "INBOUND_FEE",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;
