import { describe, expect, it } from "bun:test";
import {
  buildRuleBasedRisks,
  detectRuleFlags,
  generateRuleSummary,
} from "../backend/utils/ruleChecks";
import { buildEvidenceMap } from "../frontend/helpers/reporting.js";

const ULTRA_BANK = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UltraBank {
    address public owner;
    address public treasury;
    bool public paused;
    uint256 public feePercent = 5;

    mapping(address => uint256) public balances;
    mapping(address => bool) public managers;
    mapping(address => uint256) public rewards;

    modifier onlyOwner() {
        require(tx.origin == owner, "Not owner");
        _;
    }

    modifier onlyManager() {
        require(managers[msg.sender] || msg.sender == owner, "Not manager");
        _;
    }

    constructor(address _treasury) payable {
        owner = msg.sender;
        treasury = _treasury;
        managers[msg.sender] = true;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        uint256 fee = (amount * feePercent) / 100;
        uint256 sendAmount = amount - fee;
        (bool sentFee, ) = treasury.call{value: fee}("");
        require(sentFee, "Fee transfer failed");
        (bool sentUser, ) = msg.sender.call{value: sendAmount}("");
        require(sentUser, "Withdraw failed");
        balances[msg.sender] -= amount;
    }

    function claimReward() external {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards");
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
        rewards[msg.sender] = 0;
    }

    function emergencyWithdraw(address payable to, uint256 amount) external onlyManager {
        require(address(this).balance >= amount, "Low contract balance");
        to.transfer(amount);
    }

    function destroy() external onlyOwner {
        selfdestruct(payable(owner));
    }

    function execute(address target, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.delegatecall(data);
        require(success, "Delegatecall failed");
        return result;
    }

    function mintBonus(address user, uint256 amount) external {
        rewards[user] += amount;
    }

    function adminDrainAll(address payable to) external onlyOwner {
        to.transfer(address(this).balance);
    }
}`;

const MEGA_VAULT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MegaVault {
    address public owner;
    address public implementation;

    mapping(address => uint256) public balances;
    mapping(address => bool) public admins;

    bool public paused;
    bool private locked;

    modifier onlyOwner() {
        require(tx.origin == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Not admin");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor(address _impl) payable {
        owner = msg.sender;
        implementation = _impl;
        admins[msg.sender] = true;
    }

    function deposit() public payable whenNotPaused {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }

    function adminWithdraw(address payable user, uint256 amount) public onlyAdmin {
        require(address(this).balance >= amount, "Low balance");
        user.transfer(amount);
    }

    function execute(bytes memory data) public onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(data);
        require(success, "Delegatecall failed");
        return result;
    }

    function destroy() public onlyOwner {
        selfdestruct(payable(owner));
    }

    function changeOwner(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    function addAdmin(address user) public onlyOwner {
        admins[user] = true;
    }

    function mint(address to, uint256 amount) public {
        tokenBalance[to] += amount;
        totalSupply += amount;
    }

    fallback() external payable {
    }

    mapping(address => uint256) public tokenBalance;
    uint256 public totalSupply;
}`;

describe("AuditMind security heuristics", () => {
  it("detects the missing issuance and drain findings in UltraBank-style contracts", () => {
    const flags = detectRuleFlags(ULTRA_BANK);
    const risks = buildRuleBasedRisks(ULTRA_BANK);

    expect(flags).toContain("unprotected-mint");
    expect(flags).toContain("admin-drain-capability");
    expect(flags).toContain("possible-reentrancy");

    expect(risks.some((risk) => risk.id === "unprotected-mint")).toBe(true);
    expect(risks.some((risk) => risk.id === "admin-drain-capability")).toBe(true);
    expect(risks.some((risk) => risk.id === "possible-reentrancy")).toBe(true);
    expect(risks.some((risk) => risk.id === "public-withdraw-review")).toBe(false);
  });

  it("captures MegaVault-style mint, fallback, and reentrancy issues with specific evidence", () => {
    const risks = buildRuleBasedRisks(MEGA_VAULT);
    const evidence = buildEvidenceMap(MEGA_VAULT, risks);

    expect(risks.some((risk) => risk.id === "unprotected-mint")).toBe(true);
    expect(risks.some((risk) => risk.id === "admin-drain-capability")).toBe(true);
    expect(risks.some((risk) => risk.id === "payable-fallback-funds-trap")).toBe(true);
    expect(risks.some((risk) => risk.id === "possible-reentrancy")).toBe(true);

    const mintEvidence = evidence.find((item) => item.riskId === "unprotected-mint");
    const fallbackEvidence = evidence.find((item) => item.riskId === "payable-fallback-funds-trap");
    const reentrancyEvidence = evidence.find((item) => item.riskId === "possible-reentrancy");

    expect(mintEvidence?.evidence.some((item) => /function mint/i.test(item.snippet))).toBe(true);
    expect(fallbackEvidence?.evidence.some((item) => /fallback/i.test(item.snippet))).toBe(true);
    expect(reentrancyEvidence?.evidence.some((item) => /\.call/.test(item.snippet))).toBe(true);
  });

  it("builds a more informative fallback contract summary", () => {
    const summary = generateRuleSummary(MEGA_VAULT);

    expect(summary).toContain("MegaVault");
    expect(summary).toContain("Privileged controls include");
    expect(summary).toContain("delegatecall trust boundaries");
  });
});
