# Sample Contracts

These contracts are included for demos, smoke tests, and manual sanity checks in AuditMind AI. Most of them intentionally include patterns that should trigger useful findings.

## Contract Catalog

| File | Purpose | Typical signals |
| --- | --- | --- |
| `basic-ownable.sol` | Simple owner-controlled contract | ownership/admin controls |
| `simple-ledger.sol` | Low-risk balance ledger example | low-risk baseline, public state changes |
| `reentrancy-test.sol` | Withdrawal pattern using low-level calls | external call ordering, possible reentrancy |
| `mintable-token.sol` | Token-like contract with broad mint power | token controls, centralization, supply risk |
| `tx-origin-wallet.sol` | Authorization based on `tx.origin` | execution-context risk, phishing risk |
| `delegatecall-proxy.sol` | Proxy-style pattern with `delegatecall` | delegatecall, storage-layout trust boundary |
| `selfdestruct-vault.sol` | Contract with destructive admin flow | selfdestruct risk, admin control |

## How To Use Them

### Paste mode

Open a file and paste its Solidity into the analyzer.

### Upload mode

Upload one or more files through the analyzer UI. AuditMind will bundle the uploaded Solidity into a single backend request.

### Compare mode

Run two different sample contracts and compare the outputs in the Compare page.

## Recommended Demo Order

If you want a quick walkthrough that shows the product range clearly:

1. `simple-ledger.sol`
2. `basic-ownable.sol`
3. `reentrancy-test.sol`
4. `delegatecall-proxy.sol`
5. `selfdestruct-vault.sol`

## Notes

- These contracts are educational fixtures, not production-ready contracts.
- Findings will depend on current rule-engine logic and AI availability.
- Some contracts are designed to trigger centralization or trust-model warnings rather than obvious exploit paths.
