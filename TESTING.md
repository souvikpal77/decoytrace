# TESTING

> **MANUAL VERIFICATION TESTS — not automated tests.** Use this checklist for hands-on review of the existing DECOYTRACE application. The unchecked items are verification steps, not claims that tests have already passed.

## Functional Tests

- [ ] Landing page loads.
- [ ] Run **Auto Demo** and confirm the simulated sequence completes.
- [ ] Navigate between the landing page, Security Command Center, Network Map, Decoy Assets, Attack Simulation Lab, Incident Reconstruction, and Evidence Ledger.
- [ ] Run a scenario or Auto Demo, then open the Network Map and confirm fictional nodes and the simulated path are displayed.
- [ ] Select a network node and inspect its details.
- [ ] Open the Decoy Assets page and confirm the asset list displays.
- [ ] Generate and arm a fictional decoy.
- [ ] Select and launch each available Attack Simulation Lab scenario.
- [ ] Confirm simulated alerts appear during a scenario.
- [ ] Open Incident Reconstruction and confirm the event timeline displays.
- [ ] Confirm the simulated risk score displays.
- [ ] Confirm illustrative MITRE ATT&CK references display in the reconstructed events.
- [ ] Open the Evidence Ledger and confirm hash-chain blocks display.
- [ ] Run **Verify chain** and confirm the current chain is reported as verified.
- [ ] Use **Modify old block #004** to simulate tampering; run verification and confirm the broken chain is detected.
- [ ] Use **Reset / rebuild chain**, then run verification again and confirm the rebuilt chain verifies.

## UI Tests

- [ ] Check each major page for large, unexplained empty spaces.
- [ ] Review the layout at desktop, laptop, and narrow viewport sizes.
- [ ] Confirm there is no unintended horizontal overflow.
- [ ] Confirm buttons and navigation controls respond as expected.
- [ ] Confirm the dark cybersecurity theme remains consistent across pages.
- [ ] Confirm Auto Demo remains functional after navigating between pages.

## Deployment Test

- [ ] Open the [public demo](https://replit-design-project--souvikpaldev.replit.app) and confirm it loads.
- [ ] Open the public URL in an incognito/private window and confirm it loads.
- [ ] Confirm no login is required to use the demo.
- [ ] From a fresh page load, run Auto Demo and confirm it completes.

Last verified: October 25, 2026
