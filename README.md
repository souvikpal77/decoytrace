# DECOYTRACE

_See the signal before it reaches what matters._

DECOYTRACE is a browser-based cyber deception simulation that uses fictional decoy assets to surface suspicious movement and reconstruct a simulated attack. Explore a fictional environment, follow generated alerts through an incident timeline, and see how a hash-linked evidence ledger can reveal changes to recorded events.

## Problem

Security tools can produce many signals, and separating malicious activity from normal behavior is not always straightforward. A carefully placed decoy can provide a high-confidence signal: legitimate users should have no reason to interact with it.

## Solution

DECOYTRACE places fictional files, credentials, servers, and databases in a simulated environment. When a simulated attacker interacts with a decoy, the app generates an alert and uses the synthetic events to reconstruct the simulated attack path.

## How It Works

1. A simulated network environment establishes the fictional setting.
2. Fictional decoy assets are placed among simulated systems.
3. Simulated attacker activity moves through the environment.
4. An interaction with a decoy triggers an alert.
5. The app reconstructs the simulated incident as a timeline and route.
6. Events are recorded in a hash-linked ledger that can be checked for changes.

## Key Features

- Security Command Center
- Interactive Network Map
- Decoy Asset Manager
- Attack Simulation Lab
- Incident Reconstruction Timeline
- Illustrative MITRE ATT&CK technique mapping
- Simulated risk scoring
- SHA-256 hash-chained evidence ledger
- Tamper simulation and integrity verification
- Auto Demo mode

## Blockchain / Integrity Angle

The ledger demonstrates a blockchain-inspired, tamper-evident hash chain using SHA-256 through the browser's Web Crypto API. Each evidence block includes a reference to the previous block's hash. The interface can recompute hashes and detect when event data no longer matches its recorded digest.

This is an educational, browser-local demonstration—not a production blockchain or decentralized network. Data stored in browser local storage is not protected against a determined user and is not durable evidence preservation.

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Recharts
- SVG visualization
- Web Crypto API
- Browser local storage where appropriate

## Safety

> This project is a simulation only. It does not scan networks, attack systems, collect real credentials, or interact with real infrastructure. All assets, events, attackers, and telemetry are fictional.

## Demo

[Open the live DECOYTRACE demo](https://replit-design-project--souvikpaldev.replit.app).

On the landing page, click **Run Auto Demo** to see the complete simulated attack story.

To run the app locally from the repository root:

```bash
pnpm install
pnpm --filter @workspace/decoytrace run dev
```

## Use Cases

- Cybersecurity education
- SOC training
- Security awareness demonstrations
- Deception technology prototyping
- Incident response visualization

## Future Scope

Possible future improvements include real backend event ingestion, SIEM integration, real-time alert streaming, role-based access control, production-grade deception infrastructure, and distributed immutable evidence storage. These are future possibilities, not capabilities of the current prototype.

## Hackathon Context

DECOYTRACE was created as a hackathon prototype focused on making cyber deception, attack reconstruction, and evidence integrity understandable through an interactive visual experience.

## Disclaimer

The current implementation is fictional and browser-local. It does not attack or scan real systems, connect to real infrastructure, or provide production-grade evidence storage.

_DECOYTRACE makes simulated signals and incident evidence easier to see, understand, and discuss._
