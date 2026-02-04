# Edge60 Architecture

## Overview

Edge60 is a real-time 1v1 BTC price prediction game where players stake USDC and compete to predict 60-second price movements. The system combines off-chain state channels (Yellow Network) for instant gameplay with on-chain settlement (EdgeTreasury) for trustless payouts.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE60 ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         ┌─────────────┐ │
│  │   FRONTEND       │ ◄─────► │    BACKEND       │ ◄─────► │  PRICE FEED │ │
│  │   (Next.js)      │   WS    │    (Fastify)     │   HTTP  │  (CoinGecko)│ │
│  └────────┬─────────┘         └────────┬─────────┘         └─────────────┘ │
│           │                            │                                    │
│           │ wagmi/viem                 │ viem                               │
│           ▼                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        BASE SEPOLIA / ARC                             │  │
│  │  ┌────────────────────┐                  ┌────────────────────────┐  │  │
│  │  │  Yellow Network    │                  │    EdgeTreasury.sol    │  │  │
│  │  │  (State Channels)  │ ──── settle ───► │    - settleMatch()     │  │  │
│  │  │  - Instant plays   │                  │    - 2.5% rake         │  │  │
│  │  │  - Off-chain state │                  │    - USDC payouts      │  │  │
│  │  └────────────────────┘                  └────────────────────────┘  │  │
│  │                                                     │                │  │
│  │                                                     ▼                │  │
│  │                                          ┌──────────────────────┐   │  │
│  │                                          │   USDC Token         │   │  │
│  │                                          │   (Circle Testnet)   │   │  │
│  │                                          └──────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js + wagmi)

**Location:** `src/`

**Responsibilities:**

- Wallet connection (RainbowKit/wagmi)
- Yellow Network session management
- Real-time game UI
- Settlement status display

**Key Files:**

- `src/hooks/useYellowSession.ts` - State channel management
- `src/hooks/useWebSocket.ts` - Backend communication
- `src/context/GameContext.tsx` - Game state machine
- `src/app/duel/page.tsx` - Main game interface
- `src/app/result/page.tsx` - Settlement display

### 2. Backend (Fastify + WebSocket)

**Location:** `backend/`

**Responsibilities:**

- WebSocket matchmaking
- Match lifecycle management
- Price feed integration
- Treasury settlement orchestration

**Key Files:**

- `backend/src/services/MatchService.ts` - Match state machine
- `backend/src/services/TreasuryService.ts` - On-chain settlement
- `backend/src/services/PriceService.ts` - ETH/USD price feed
- `backend/src/handlers/websocket.ts` - WebSocket events

### 3. Smart Contracts (Solidity)

**Location:** `contracts/`

**Responsibilities:**

- USDC custody during matches
- Rake calculation (2.5%)
- Winner payouts
- Protocol revenue tracking

**Key Files:**

- `contracts/contracts/EdgeTreasury.sol` - Main treasury contract
- `contracts/scripts/deploy.js` - Deployment script
- `contracts/scripts/fund-treasury.js` - Fund treasury for settlements

---

## Settlement Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SETTLEMENT FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. MATCH ENDS                                                               │
│     │                                                                        │
│     ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Backend: MatchService.completeMatch()                                 │   │
│  │ - Fetch T₁ price from CoinGecko                                       │   │
│  │ - Compare with T₀ price                                               │   │
│  │ - Determine winner based on predictions                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  2. SETTLEMENT TRIGGERED                                                     │
│     │                                                                        │
│     ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Backend: TreasuryService.settleMatch()                                │   │
│  │ - winner: Address of winning player                                   │   │
│  │ - grossAmount: Total prize pool (2x stake)                            │   │
│  │ - matchId: Off-chain match identifier                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  3. ON-CHAIN TRANSACTION                                                     │
│     │                                                                        │
│     ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Contract: EdgeTreasury.settleMatch()                                  │   │
│  │ - Calculate rake: grossAmount × 2.5%                                  │   │
│  │ - Calculate payout: grossAmount - rake                                │   │
│  │ - Transfer USDC to winner                                             │   │
│  │ - Emit MatchSettled event                                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  4. CONFIRMATION                                                             │
│     │                                                                        │
│     ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Frontend: Shows settlement confirmation                               │   │
│  │ - Transaction hash                                                    │   │
│  │ - Block explorer link                                                 │   │
│  │ - Gross/Rake/Net breakdown                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Match State Machine

```
    ┌─────────┐
    │  IDLE   │ ◄─── Player opens app
    └────┬────┘
         │ joinQueue()
         ▼
    ┌─────────┐
    │ WAITING │ ◄─── Looking for opponent
    └────┬────┘
         │ opponentFound()
         ▼
    ┌─────────┐
    │ ACTIVE  │ ◄─── 60-second countdown
    └────┬────┘      Players submit predictions
         │ timerEnds()
         ▼
  ┌───────────┐
  │ COMPLETED │ ◄─── Winner determined
  └─────┬─────┘
        │ settleMatch()
        ▼
  ┌───────────┐
  │ SETTLING  │ ◄─── On-chain tx in progress
  └─────┬─────┘
        │ txConfirmed()
        ▼
   ┌─────────┐
   │ SETTLED │ ◄─── USDC transferred to winner
   └─────────┘
```

---

## Data Models

### Match

```typescript
interface Match {
  id: string; // UUID
  playerA: string; // Wallet address
  playerB: string | null; // Wallet address
  stake: number; // USDC amount (e.g., 1, 10, 25)
  status: MatchStatus; // WAITING | ACTIVE | COMPLETED | SETTLING | SETTLED
  startTime: number | null; // Unix timestamp
  endTime: number | null; // Unix timestamp
  duration: number; // Seconds (default: 60)
  winner: string | null; // Winner's address
  predictionA: "UP" | "DOWN" | null;
  predictionB: "UP" | "DOWN" | null;
  asset: string; // "ETH/USD"
  startPrice: number | null; // T₀ price
  endPrice: number | null; // T₁ price
  settlement?: SettlementInfo; // On-chain settlement details
}
```

### Settlement Info

```typescript
interface SettlementInfo {
  status: "pending" | "submitting" | "confirming" | "confirmed" | "failed";
  txHash?: string;
  blockNumber?: number;
  grossAmount?: string; // Total prize pool
  rake?: string; // Platform fee (2.5%)
  netPayout?: string; // Winner receives
  explorerUrl?: string;
}
```

---

## Environment Variables

### Frontend (.env)

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Backend (.env)

```bash
PORT=3001
TREASURY_CHAIN=baseSepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
TREASURY_ADDRESS=0x...
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
SETTLEMENT_PRIVATE_KEY=0x...
```

### Contracts (.env)

```bash
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
BASESCAN_API_KEY=xxx
```

---

## Network Configuration

| Network      | Chain ID | USDC Address                                 | Explorer                        |
| ------------ | -------- | -------------------------------------------- | ------------------------------- |
| Base Sepolia | 84532    | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | https://sepolia.basescan.org    |
| Arc Testnet  | 5042002  | `0x3600000000000000000000000000000000000000` | https://testnet.explorer.arc.io |

---

## Security Considerations

1. **Settlement Authority**: Only the backend (owner of Treasury contract) can call `settleMatch()`. This prevents unauthorized settlements.

2. **Reentrancy Protection**: EdgeTreasury uses OpenZeppelin's `ReentrancyGuard` for all external functions.

3. **Safe Token Transfers**: Uses `SafeERC20` for all USDC transfers.

4. **Rake Limits**: Maximum rake capped at 5% (500 bps) in the contract.

5. **Private Key Security**: Settlement private key should be stored securely (e.g., AWS Secrets Manager in production).

---

## Future Improvements

1. **Multi-signature Settlement**: Require signatures from both players to settle (removes backend trust assumption).

2. **Oracle Integration**: Use Chainlink or Pyth for tamper-proof price feeds.

3. **Yellow Network Full Integration**: Complete state channel lifecycle for true off-chain gaming.

4. **zkProof of Game Result**: Generate zero-knowledge proofs of match outcomes.

5. **Multi-token Support**: Allow staking with different tokens (ETH, USDT, etc.).

---

## License

MIT License - ETHGlobal 2026
