
const express = require("express");
const path = require("path");
const db = require("./database");
const { prepareQuote, compareQuotes } = require("./comparison");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
    res.json({ status: "running", database: "connected" });
});

app.get("/api/quotes", (req, res) => {
    const quotes = db.prepare(
        "SELECT * FROM quote_records ORDER BY id DESC"
    ).all();

    res.json(quotes);
});

function validateQuote(body) {
    const {
        insurer_name, age, cover_amount, policy_term,
        smoking_status, health_profile, premium_payment_term,
        riders, premium_amount, premium_frequency,
        claim_ratio, claim_ratio_year, source_url
    } = body;

    if (typeof insurer_name !== "string" || !insurer_name.trim()) {
        return "A valid insurer name is required.";
    }

    if (!Number.isInteger(age) || age < 18 || age > 100) {
        return "Age must be a whole number between 18 and 100.";
    }

    if (
        typeof cover_amount !== "number" ||
        !Number.isFinite(cover_amount) ||
        cover_amount <= 0
    ) {
        return "Cover amount must be greater than zero.";
    }

    if (
        !Number.isInteger(policy_term) ||
        policy_term <= 0 ||
        policy_term > 100
    ) {
        return "Policy term must be between 1 and 100 years.";
    }

    if (!["smoker", "non-smoker"].includes(smoking_status)) {
        return "Select smoker or non-smoker.";
    }

    if (!["standard", "other"].includes(health_profile)) {
        return "Select a valid health profile.";
    }

    if (
        !Number.isInteger(premium_payment_term) ||
        premium_payment_term <= 0 ||
        premium_payment_term > policy_term
    ) {
        return "Premium payment term must be no greater than the policy term.";
    }

    if (!["none", "with-riders"].includes(riders)) {
        return "Select a valid rider option.";
    }

    if (
        typeof premium_amount !== "number" ||
        !Number.isFinite(premium_amount) ||
        premium_amount <= 0
    ) {
        return "Premium amount must be greater than zero.";
    }

    if (!["monthly", "annual"].includes(premium_frequency)) {
        return "Premium frequency must be monthly or annual.";
    }

    if (
        claim_ratio != null &&
        (
            typeof claim_ratio !== "number" ||
            !Number.isFinite(claim_ratio) ||
            claim_ratio < 0 ||
            claim_ratio > 100
        )
    ) {
        return "Claim ratio must be between 0 and 100.";
    }

    if (
        claim_ratio != null &&
        (
            typeof claim_ratio_year !== "string" ||
            !claim_ratio_year.trim()
        )
    ) {
        return "Provide a reporting year when entering a claim ratio.";
    }

    if (
        source_url != null &&
        source_url !== "" &&
        (
            typeof source_url !== "string" ||
            !/^https?:\/\/\S+$/i.test(source_url)
        )
    ) {
        return "Source URL must start with http:// or https://.";
    }

    return null;
}

function quoteValues(body) {
    return [
        body.insurer_name.trim(),
        body.age,
        body.cover_amount,
        body.policy_term,
        body.smoking_status,
        body.health_profile,
        body.premium_payment_term,
        body.riders,
        body.premium_amount,
        body.premium_frequency,
        body.claim_ratio ?? null,
        body.claim_ratio == null ? null : body.claim_ratio_year.trim(),
        body.health_answer || null,
        body.source_url ? body.source_url.trim() : null,
        body.evidence ? body.evidence.trim() : null
    ];
}

// Save a new quote.
app.post("/api/quotes", (req, res) => {
    const error = validateQuote(req.body);

    if (error) {
        return res.status(400).json({ error });
    }

    const result = db.prepare(`
        INSERT INTO quote_records (
            insurer_name, age, cover_amount, policy_term,
            smoking_status, health_profile, premium_payment_term,
            riders, premium_amount, premium_frequency,
            claim_ratio, claim_ratio_year, health_answer,
            source_url, evidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...quoteValues(req.body));

    res.status(201).json({
        message: "Quote saved successfully",
        id: result.lastInsertRowid
    });
});

// Update an existing quote.
app.put("/api/quotes/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid quote ID." });
    }

    const error = validateQuote(req.body);

    if (error) {
        return res.status(400).json({ error });
    }

    const existing = db.prepare(
        "SELECT id FROM quote_records WHERE id = ?"
    ).get(id);

    if (!existing) {
        return res.status(404).json({ error: "Quote not found." });
    }

    db.prepare(`
        UPDATE quote_records SET
            insurer_name = ?,
            age = ?,
            cover_amount = ?,
            policy_term = ?,
            smoking_status = ?,
            health_profile = ?,
            premium_payment_term = ?,
            riders = ?,
            premium_amount = ?,
            premium_frequency = ?,
            claim_ratio = ?,
            claim_ratio_year = ?,
            health_answer = ?,
            source_url = ?,
            evidence = ?
        WHERE id = ?
    `).run(...quoteValues(req.body), id);

    res.json({ message: "Quote updated successfully", id });
});

// Delete a quote by its ID.
app.delete("/api/quotes/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid quote ID." });
    }

    const result = db.prepare(
        "DELETE FROM quote_records WHERE id = ?"
    ).run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Quote not found." });
    }

    res.json({
        message: "Quote deleted successfully",
        id
    });
});

app.post("/api/quotes/prepare", (req, res) => {
    res.json(prepareQuote(req.body));
});

app.post("/api/compare", (req, res) => {
    if (!req.body || !Array.isArray(req.body.quotes)) {
        return res.status(400).json({
            error: "Provide an array of quotes to compare."
        });
    }

    res.json(compareQuotes(req.body.quotes));
});

app.post("/api/test-results", (req, res) => {
    const {
        test_case, input_record_ids, expected_result,
        actual_result, status, unresolved_item
    } = req.body;

    if (
        typeof test_case !== "string" || !test_case.trim() ||
        typeof expected_result !== "string" || !expected_result.trim() ||
        typeof status !== "string" || !status.trim()
    ) {
        return res.status(400).json({
            error: "Test case, expected result, and status are required."
        });
    }

    const result = db.prepare(`
        INSERT INTO test_results (
            test_case, input_record_ids, expected_result,
            actual_result, status, unresolved_item
        ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        test_case,
        input_record_ids ?? null,
        expected_result,
        actual_result ?? null,
        status,
        unresolved_item ?? null
    );

    res.status(201).json({
        message: "Test result saved successfully",
        id: result.lastInsertRowid
    });
});

app.get("/api/test-results", (req, res) => {
    res.json(db.prepare(
        "SELECT * FROM test_results ORDER BY id DESC"
    ).all());
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
