import chalk from "chalk";

const W = 68;

export const CHAIN_NAMES: Record<string, string> = {
    "42101": "Push Chain",
    "11155111": "Ethereum Sepolia",
    "84532": "Base Sepolia",
    "97": "BSC Testnet",
    "80002": "Polygon Amoy",
    "43113": "Avalanche Fuji",
    "10143": "Monad Testnet",
    "1": "Ethereum",
    "8453": "Base",
    "137": "Polygon",
    "43114": "Avalanche",
    "143": "Monad",
};

export function chainName(id: string): string {
    return CHAIN_NAMES[id] ?? `Chain ${id}`;
}

export function shortAddr(address: string): string {
    return address.slice(0, 6) + "..." + address.slice(-4);
}

export function shortUri(uri: string): string {
    if (uri.length <= 40) return uri;
    return uri.slice(0, 20) + "..." + uri.slice(-8);
}

export function progressBar(
    pct: number,
    width = 20,
): string {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    return (
        chalk.green("█".repeat(filled)) +
        chalk.dim("░".repeat(empty))
    );
}

const CHAIN_COLORS = [
    chalk.hex("#22d3ee"),
    chalk.hex("#a78bfa"),
    chalk.hex("#f59e0b"),
    chalk.hex("#34d399"),
];

export function miniBar(
    val: number,
    max: number,
    width = 16,
    colorIdx = 0,
): string {
    const filled = Math.round((val / max) * width);
    const empty = width - filled;
    const color = CHAIN_COLORS[colorIdx % CHAIN_COLORS.length]!;
    return (
        color("█".repeat(filled)) +
        chalk.dim("░".repeat(empty))
    );
}

function kv(k: string, v: string): string {
    const key = chalk.dim(k.padEnd(18));
    return `${key}${v}`;
}

export const boxTop = (title: string): string =>
    "┌─── " +
    title +
    " " +
    "─".repeat(W - 7 - title.length) +
    "┐";

export const boxBottom = (): string =>
    "└" + "─".repeat(W - 2) + "┘";

export const boxLine = (s: string): string =>
    "│  " + s.padEnd(W - 4) + "│";

export const boxSep = (): string =>
    "│  " + "─".repeat(W - 6) + "  │";

const HEADER_TOP = "╔" + "═".repeat(W - 2) + "╗";
const HEADER_MID = "╠" + "═".repeat(W - 2) + "╣";
const HEADER_BOT = "╚" + "═".repeat(W - 2) + "╝";
const headerLine = (s: string): string =>
    "║  " + s.padEnd(W - 4) + "║";

export function renderHeader(
    agentName: string,
    ueaAddress: string,
): void {
    console.log();
    console.log(chalk.bold.yellow(HEADER_TOP));
    console.log(
        chalk.bold.yellow(
            headerLine(chalk.bold.white("TAP AGENT FULL PROFILE")),
        ),
    );
    console.log(chalk.bold.yellow(HEADER_MID));
    console.log(
        chalk.bold.yellow(
            headerLine(`\u{1F916} ${chalk.bold.white(agentName)}`),
        ),
    );
    console.log(
        chalk.bold.yellow(
            headerLine(`UEA: ${chalk.cyan(ueaAddress)}`),
        ),
    );
    console.log(chalk.bold.yellow(HEADER_BOT));
}

export interface AgentRecord {
    registered: boolean;
    agentURI: string;
    agentCardHash: string;
    registeredAt: bigint;
    originChainNamespace: string;
    originChainId: string;
    ownerKey: string;
    nativeToPush: boolean;
}

export function renderIdentitySection(
    record: AgentRecord,
    ueaAddr: string,
    agentId: bigint,
): void {
    console.log();
    console.log(chalk.yellow(boxTop("IDENTITY")));
    console.log(
        boxLine(kv("Agent ID", chalk.white(agentId.toString()))),
    );
    console.log(
        boxLine(
            kv(
                "Registered",
                record.registered
                    ? chalk.green("✓ true")
                    : chalk.red("✗ false"),
            ),
        ),
    );
    console.log(
        boxLine(
            kv(
                "Native to Push",
                record.nativeToPush
                    ? chalk.green("✓ true")
                    : chalk.dim("false"),
            ),
        ),
    );
    const origin = `${record.originChainNamespace}:${record.originChainId}`;
    const originLabel = chainName(record.originChainId);
    console.log(
        boxLine(
            kv("Origin", chalk.white(`${origin} (${originLabel})`)),
        ),
    );
    console.log(
        boxLine(kv("Agent URI", chalk.cyan(shortUri(record.agentURI)))),
    );
    console.log(
        boxLine(
            kv(
                "Card Hash",
                chalk.dim(record.agentCardHash.slice(0, 18) + "..."),
            ),
        ),
    );
    const regDate = new Date(Number(record.registeredAt) * 1000);
    console.log(
        boxLine(kv("Registered At", chalk.dim(regDate.toISOString()))),
    );
    console.log(boxBottom());
}

export interface BindEntry {
    chainNamespace: string;
    chainId: string;
    registryAddress: string;
    boundAgentId: bigint;
    proofType: number;
    verified: boolean;
    linkedAt: bigint;
}

export function renderBindingsSection(
    bindings: readonly BindEntry[],
): void {
    console.log();
    console.log(
        chalk.yellow(
            boxTop(`CROSS-CHAIN BINDINGS (${bindings.length})`),
        ),
    );

    if (bindings.length === 0) {
        console.log(boxLine(chalk.dim("No cross-chain bindings")));
        console.log(boxBottom());
        return;
    }

    console.log(
        boxLine(
            `${chalk.dim("Chain".padEnd(22))}` +
                `${chalk.dim("Agent ID".padEnd(12))}` +
                `${chalk.dim("Status")}`,
        ),
    );
    console.log(boxSep());

    for (const b of bindings) {
        const name = chainName(b.chainId);
        const idStr = b.boundAgentId.toString();
        const verified = b.verified
            ? chalk.green("✓ verified")
            : chalk.red("✗ unverified");
        console.log(
            boxLine(
                `${chalk.white(name.padEnd(22))}` +
                    `${chalk.cyan(idStr.padEnd(12))}` +
                    `${verified}`,
            ),
        );
    }
    console.log(boxBottom());
}

export function renderReverseLookupsSection(
    bindings: readonly BindEntry[],
    reverseLookups: readonly [string, boolean][],
): void {
    if (bindings.length === 0) return;

    console.log();
    console.log(chalk.yellow(boxTop("REVERSE LOOKUPS")));
    for (let i = 0; i < bindings.length; i++) {
        const b = bindings[i]!;
        const [canonical, verified] = reverseLookups[i]!;
        const name = chainName(b.chainId);
        const check = verified
            ? chalk.green("✓")
            : chalk.red("✗");
        const canonicalStr = chalk.cyan(shortAddr(canonical));
        console.log(
            boxLine(
                `${check} ${chalk.white(name.padEnd(20))}⟶  ${canonicalStr}`,
            ),
        );
    }
    console.log(
        boxLine(
            chalk.dim(
                "All chains resolve to the same canonical UEA",
            ),
        ),
    );
    console.log(boxBottom());
}

export interface AggregatedReputation {
    totalFeedbackCount: bigint;
    weightedAvgValue: bigint;
    valueDecimals: number;
    totalPositive: bigint;
    totalNegative: bigint;
    chainCount: number;
    lastAggregated: bigint;
    reputationScore: bigint;
}

export interface ChainReputation {
    chainNamespace: string;
    chainId: string;
    registryAddress: string;
    boundAgentId: bigint;
    feedbackCount: bigint;
    summaryValue: bigint;
    valueDecimals: number;
    positiveCount: bigint;
    negativeCount: bigint;
    sourceBlockNumber: bigint;
    lastUpdated: bigint;
    reporter: string;
}

export function renderReputationSection(
    score: bigint,
    agg: AggregatedReputation,
    chains: readonly ChainReputation[],
    fresh1h: boolean,
): void {
    const scoreBps = Number(score);
    const scorePct = (scoreBps / 100).toFixed(2);
    const scorePctNum = scoreBps / 100;
    const totalFeedback = Number(agg.totalFeedbackCount);
    const totalPos = Number(agg.totalPositive);
    const totalNeg = Number(agg.totalNegative);

    let scoreColor = chalk.green;
    if (scorePctNum < 40) scoreColor = chalk.red;
    else if (scorePctNum < 60) scoreColor = chalk.yellow;

    console.log();
    console.log(chalk.yellow(boxTop("REPUTATION")));
    console.log(boxLine(""));

    if (totalFeedback === 0) {
        console.log(
            boxLine(chalk.dim("No reputation data submitted")),
        );
        console.log(boxLine(""));
        console.log(boxBottom());
        return;
    }

    console.log(
        boxLine(
            `Score: ${progressBar(scorePctNum, 24)}  ${scoreColor.bold(`${scorePct}%`)}`,
        ),
    );
    console.log(
        boxLine(`       ${chalk.dim(`${scoreBps} / 10000 bps`)}`),
    );
    console.log(boxLine(""));
    console.log(boxLine(chalk.dim("Per-Chain Breakdown:")));

    for (let ci = 0; ci < chains.length; ci++) {
        const c = chains[ci]!;
        const name = chainName(c.chainId).padEnd(18);
        const val = Number(c.summaryValue / BigInt(10 ** 18));
        const fb = Number(c.feedbackCount);
        const bar = miniBar(val, 100, 14, ci);
        console.log(
            boxLine(
                `${chalk.white(name)}${bar} ` +
                    `${chalk.bold.white(String(val).padStart(3))}/100  ` +
                    `${chalk.dim(`${fb}fb`)}`,
            ),
        );
    }

    console.log(boxLine(""));
    console.log(
        boxLine(
            `${chalk.dim("Totals:")} ${chalk.white(String(totalFeedback))} feedback ` +
                `${chalk.dim("·")} ${chalk.green(totalPos + "+")} ` +
                `${chalk.dim("·")} ${chalk.red(totalNeg + "−")}`,
        ),
    );
    console.log(
        boxLine(
            `${chalk.dim("Chains:")} ${chalk.white(String(agg.chainCount))} ` +
                `${chalk.dim("·")} ${chalk.dim("Fresh (<1h):")} ` +
                `${fresh1h ? chalk.green("✓") : chalk.red("✗")}`,
        ),
    );
    console.log(boxBottom());
}

export interface SlashRecord {
    chainNamespace: string;
    chainId: string;
    reason: string;
    evidenceHash: string;
    slashedAt: bigint;
    reporter: string;
    severityBps: bigint;
}

export function renderSlashSection(
    slashes: readonly SlashRecord[],
): void {
    console.log();
    if (slashes.length === 0) {
        console.log(chalk.yellow(boxTop("SLASH HISTORY")));
        console.log(
            boxLine(chalk.green("No slashes recorded ✓")),
        );
        console.log(boxBottom());
        return;
    }

    let totalPenalty = 0n;
    console.log(
        chalk.yellow(
            boxTop(`SLASH HISTORY (${slashes.length})`),
        ),
    );

    for (const s of slashes) {
        const name = chainName(s.chainId);
        const sev = Number(s.severityBps);
        totalPenalty += s.severityBps;
        const date = new Date(Number(s.slashedAt) * 1000);
        console.log(
            boxLine(
                `${chalk.red("⚠")} ${chalk.white(name.padEnd(20))}` +
                    `${chalk.red.bold(`-${sev} bps`)}`,
            ),
        );
        const reasonTrunc =
            s.reason.length > 44
                ? s.reason.slice(0, 44) + "…"
                : s.reason;
        console.log(
            boxLine(`  ${chalk.dim(`"${reasonTrunc}"`)}`),
        );
        console.log(
            boxLine(`  ${chalk.dim(date.toISOString())}`),
        );
    }
    console.log(boxSep());
    console.log(
        boxLine(
            `${chalk.dim("Total penalty:")} ` +
                `${chalk.red.bold(`-${totalPenalty} bps`)}`,
        ),
    );
    console.log(boxBottom());
}
