# DECOYTRACE Architecture

## 1. Overview

DECOYTRACE is a browser-based cybersecurity deception simulation. It uses fictional assets and locally generated events to demonstrate how decoy interactions can reveal suspicious movement and support incident reconstruction.

## 2. High-Level Architecture

```text
User
  ↓
React UI
  ↓
Simulation State
  ↓
Attack Simulation Engine
  ↓
Incident Reconstruction
  ↓
Evidence Ledger
```

- **User:** Chooses a scenario, explores the fictional network, and reviews alerts and evidence.
- **React UI:** Displays the pages, controls, maps, charts, timelines, and ledger.
- **Simulation State:** Holds the fictional nodes, decoys, events, alerts, attack path, risk score, and ledger records.
- **Attack Simulation Engine:** Runs preset scenarios and updates shared state with simulated activity.
- **Incident Reconstruction:** Presents generated events as an attack path and timeline, with severity, risk scoring, and illustrative MITRE ATT&CK references.
- **Evidence Ledger:** Records simulated events in a locally verifiable, hash-linked sequence.

## 3. Frontend

- **React** renders the interactive, page-based interface.
- **TypeScript** defines the UI and simulation data types.
- **Vite** provides the frontend development server and build tooling.
- **Tailwind CSS** is configured in the styling toolchain for utility-based styling; the application also uses project-level CSS.
- **Lucide React** supplies interface icons.
- **Recharts** renders the alert activity chart.
- **SVG** draws the fictional network topology and its simulated paths.

## 4. Simulation Engine

Attack events, decoy interactions, alerts, network movement, and telemetry are simulated locally in the browser. Preset scenarios generate fictional event sequences and update the shared simulation state; they do not run attack tooling or communicate with external systems.

## 5. Network Model

The network model contains fictional nodes with illustrative names, addresses, roles, and operating systems. Normal assets represent protected systems in the scenario. Decoy assets are fictional monitored files, credentials, servers, or databases whose simulated interactions can trigger alerts.

## 6. Incident Reconstruction

Generated events populate the alert feed and incident timeline. Their fictional sources and destinations form a simulated attack path. The interface displays event severity and a demonstration risk score, along with illustrative MITRE ATT&CK technique references. These mappings describe the scenario for learning; they are not observations of real activity.

## 7. Evidence Ledger

The evidence ledger demonstrates a blockchain-inspired SHA-256 hash chain using the browser's Web Crypto API:

- Each block contains simulated evidence and a timestamp.
- Each block stores the previous block's hash.
- Each block receives its own SHA-256 hash.
- Verification recomputes hashes and checks the previous-hash links to detect modified records.
- A tampering simulation deliberately changes an old record so verification can show the resulting integrity failure.

This is **not** a production blockchain and does not use decentralized consensus. The ledger is a local educational demonstration, not a production security or evidence-preservation guarantee.

## 8. Data and Storage

The current prototype runs in the browser and does not require a backend or real infrastructure. Simulation state and related preferences are stored in browser local storage where appropriate. The application uses fictional data and does not connect to live systems.

## 9. Security and Safety Boundary

The application:

- Does not scan real networks.
- Does not attack real systems.
- Does not collect real credentials.
- Does not interact with real servers.
- Uses fictional and simulated cybersecurity data.

## 10. Deployment

DECOYTRACE is deployed as a browser-based web application. The [live demo](https://replit-design-project--souvikpaldev.replit.app) runs the client-side simulation in the browser; it does not require a connection to real cybersecurity infrastructure.
