# Sample Contracts

These contracts are meant for exercising AuditMind with a mix of safer and riskier patterns.

- `basic-ownable.sol`: basic owner-restricted state update example.
- `reentrancy-test.sol`: low-level call pattern that looks reentrancy-prone.
- `simple-ledger.sol`: low-risk balance ledger with no admin or external call logic.
- `mintable-token.sol`: token-like sample with an unrestricted `mint` function.
- `tx-origin-wallet.sol`: wallet sample that uses `tx.origin` for authorization.
- `delegatecall-proxy.sol`: proxy-style contract using `delegatecall`.
- `selfdestruct-vault.sol`: vault with an owner-triggered `selfdestruct`.
