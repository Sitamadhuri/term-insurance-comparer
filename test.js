
const { prepareQuote, compareQuotes } = require("./comparison");
const db = require("./database");

let passed = 0;
let failed = 0;

function saveTestResult(name, status) {
    const result = db.prepare(`
        INSERT INTO test_results (
            test_case,
            expected_result,
            actual_result,
            status
        ) VALUES (?, ?, ?, ?)
    `).run(
        name,
        "Test condition should be satisfied",
        status === "PASS" ? "Test passed" : "Test failed",
        status
    );

    console.log("Saved test result ID:", result.lastInsertRowid);
}

function test(name, check) {
    let status = "FAIL";

    try {
        if (check()) {
            console.log("PASS:", name);
            passed++;
            status = "PASS";
        } else {
            console.log("FAIL:", name);
            failed++;
        }
    } catch (error) {
        console.log("FAIL:", name, "-", error.message);
        failed++;
    }

    try {
        saveTestResult(name, status);
    } catch (error) {
        console.log("Could not save test result:", error.message);
    }
}

// Synthetic sample quote for testing only
const monthlyQuote = {
    insurer_name: "Demo Insurer A",
    age: 25,
    cover_amount: 10000000,
    policy_term: 30,
    premium_amount: 1000,
    premium_frequency: "monthly",
    claim_ratio: 98.5,
    claim_ratio_year: "2024-25",
    health_answer: null,
    evidence: "Synthetic test data"
};

// Synthetic sample quote for testing only
const annualQuote = {
    insurer_name: "Demo Insurer B",
    age: 25,
    cover_amount: 10000000,
    policy_term: 30,
    premium_amount: 15000,
    premium_frequency: "annual",
    claim_ratio: 97.8,
    claim_ratio_year: "2023-24",
    health_answer: "Not provided",
    evidence: "Synthetic test data"
};

// TC1: Matching age, cover and policy term
test("TC1 - Matching age and cover", () => {
    return compareQuotes([monthlyQuote, annualQuote]).status === "Pass";
});

// TC1: Different ages must block comparison
test("TC1 - Different ages block comparison", () => {
    const olderQuote = { ...annualQuote, age: 35 };

    return compareQuotes([monthlyQuote, olderQuote]).status === "Blocked";
});

// Additional test: Different policy terms must block comparison
test("Different policy terms block comparison", () => {
    const shorterPolicy = { ...annualQuote, policy_term: 20 };

    return compareQuotes([monthlyQuote, shorterPolicy]).status === "Blocked";
});

// TC2: Monthly premium must be multiplied by 12
test("TC2 - Monthly premium annual equivalent", () => {
    return prepareQuote(monthlyQuote).annual_equivalent === 12000;
});

// TC2: Correct annual equivalent label
test("TC2 - Correct annual equivalent label", () => {
    return prepareQuote(monthlyQuote).premium_label ===
        "Calculated annual equivalent";
});

// TC3: Claim ratio must retain its reporting year
test("TC3 - Claim ratio reporting year", () => {
    const quote = prepareQuote(monthlyQuote);

    return quote.claim_ratio === 98.5 &&
        quote.claim_ratio_year === "2024-25";
});

// TC4: Missing health answer must not be invented
test("TC4 - Missing health answer", () => {
    return prepareQuote(monthlyQuote).health_answer === "Not provided";
});

// Display test summary
console.log("\n----- Test Summary -----");
console.log("Passed:", passed);
console.log("Failed:", failed);
console.log("Total:", passed + failed);

if (failed > 0) {
    process.exitCode = 1;
}
