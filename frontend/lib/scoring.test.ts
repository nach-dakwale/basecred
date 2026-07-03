import { describe, expect, it } from "vitest";
import { calculateScore, type GitHubData } from "@/lib/scoring";

function data(overrides: Partial<GitHubData> = {}): GitHubData {
  return {
    accountAgeYears: 0,
    web3MergedPRs: 0,
    otherOssMergedPRs: 0,
    personalRepoEvents: 0,
    ...overrides,
  };
}

describe("calculateScore", () => {
  it("returns tier 0 with no borrowing power for a blank profile", () => {
    const result = calculateScore(data());
    expect(result.score).toBe(0);
    expect(result.tier).toBe(0);
    expect(result.maxLoanEth).toBe(0);
    expect(result.collateralPct).toBe(0);
  });

  it("caps each point category independently", () => {
    const result = calculateScore(
      data({ web3MergedPRs: 1000, otherOssMergedPRs: 1000, personalRepoEvents: 1000 })
    );
    expect(result.web3Points).toBe(400);
    expect(result.ossPoints).toBe(150);
    expect(result.personalPoints).toBe(50);
  });

  it("caps total score at 650 even when category sums exceed it", () => {
    const result = calculateScore(
      data({ web3MergedPRs: 1000, otherOssMergedPRs: 1000, personalRepoEvents: 1000, accountAgeYears: 10 })
    );
    expect(result.score).toBe(650);
  });

  it.each([
    [0.99, 0],
    [1, 30],
    [2.99, 30],
    [3, 100],
    [4.99, 100],
    [5, 200],
  ])("applies the correct age bonus at %d years", (years, expectedBonus) => {
    expect(calculateScore(data({ accountAgeYears: years })).ageBonus).toBe(expectedBonus);
  });

  it.each([
    [data({ web3MergedPRs: 10 }), 200, 0, 0, 0],
    [data({ web3MergedPRs: 10, personalRepoEvents: 2 }), 201, 1, 0.05, 75],
    [data({ web3MergedPRs: 17, personalRepoEvents: 20 }), 350, 1, 0.05, 75],
    [data({ web3MergedPRs: 17, personalRepoEvents: 22 }), 351, 2, 0.15, 50],
    [data({ web3MergedPRs: 20, otherOssMergedPRs: 20 }), 500, 2, 0.15, 50],
    [data({ web3MergedPRs: 20, otherOssMergedPRs: 20, personalRepoEvents: 2 }), 501, 3, 0.4, 20],
    [data({ web3MergedPRs: 20, otherOssMergedPRs: 30, personalRepoEvents: 100 }), 600, 3, 0.4, 20],
    [data({ web3MergedPRs: 20, otherOssMergedPRs: 30, personalRepoEvents: 100, accountAgeYears: 1 }), 630, 4, 0.75, 0],
  ])("assigns the correct tier at each score threshold", (input, expectedScore, expectedTier, expectedMaxLoan, expectedCollateral) => {
    const result = calculateScore(input);
    expect(result.score).toBe(expectedScore);
    expect(result.tier).toBe(expectedTier);
    expect(result.maxLoanEth).toBe(expectedMaxLoan);
    expect(result.collateralPct).toBe(expectedCollateral);
  });
});
