
function prepareQuote(quote) {
    let annualPremium = null;

    if (
        quote.premium_frequency === "monthly" &&
        Number.isFinite(quote.premium_amount)
    ) {
        annualPremium = quote.premium_amount * 12;
    } else if (
        quote.premium_frequency === "annual" &&
        Number.isFinite(quote.premium_amount)
    ) {
        annualPremium = quote.premium_amount;
    }

    return {
        id: quote.id ?? null,
        insurer_name: quote.insurer_name,
        age: quote.age,
        cover_amount: quote.cover_amount,
        policy_term: quote.policy_term ?? null,
        smoking_status: quote.smoking_status ?? null,
        health_profile: quote.health_profile ?? null,
        premium_payment_term: quote.premium_payment_term ?? null,
        riders: quote.riders ?? null,
        premium_amount: quote.premium_amount,
        premium_frequency: quote.premium_frequency,
        annual_equivalent: annualPremium,
        premium_label:
            quote.premium_frequency === "monthly"
                ? "Calculated annual equivalent"
                : quote.premium_frequency === "annual"
                    ? "Annual premium"
                    : "Frequency not supported",
        claim_ratio: quote.claim_ratio ?? null,
        claim_ratio_year: quote.claim_ratio_year || "Not provided",
        health_answer: quote.health_answer || "Not provided",
        source_url: quote.source_url || "Not provided",
        evidence: quote.evidence || "Not provided"
    };
}

function compareQuotes(quotes) {
    if (!Array.isArray(quotes) || quotes.length < 2) {
        return {
            status: "Blocked",
            message: "Provide at least two quotes to compare.",
            quotes: []
        };
    }

    const preparedQuotes = quotes.map(prepareQuote);
    const first = preparedQuotes[0];

    const requiredFields = [
        "age",
        "cover_amount",
        "policy_term",
        "smoking_status",
        "health_profile",
        "premium_payment_term",
        "riders"
    ];

    // Required assumptions must be present
    for (const quote of preparedQuotes) {
        const missingFields = requiredFields.filter(field =>
            quote[field] === null ||
            quote[field] === undefined ||
            (typeof quote[field] === "string" &&
                quote[field].trim() === "")
        );

        if (missingFields.length > 0) {
            return {
                status: "Blocked",
                message:
                    "Comparison blocked because required assumptions " +
                    "are missing: " + missingFields.join(", ") + ".",
                quotes: preparedQuotes
            };
        }
    }

    // Required assumptions must match
    const sameAssumptions = preparedQuotes.every(quote =>
        requiredFields.every(field =>
            quote[field] === first[field]
        )
    );

    if (!sameAssumptions) {
        return {
            status: "Blocked",
            message:
                "Quotes must have matching age, cover amount, policy " +
                "term, smoking status, health profile, premium payment " +
                "term, and riders.",
            quotes: preparedQuotes
        };
    }

    // All premium values must be valid
    const validPremiums = preparedQuotes.every(quote =>
        Number.isFinite(quote.premium_amount) &&
        quote.premium_amount > 0 &&
        quote.annual_equivalent !== null
    );

    if (!validPremiums) {
        return {
            status: "Blocked",
            message: "One or more premium values or frequencies are invalid.",
            quotes: preparedQuotes
        };
    }

    preparedQuotes.sort(
        (a, b) => a.annual_equivalent - b.annual_equivalent
    );

    return {
        status: "Pass",
        message: "All required comparison assumptions match.",
        comparison_basis: {
            age: first.age,
            cover_amount: first.cover_amount,
            policy_term: first.policy_term,
            smoking_status: first.smoking_status,
            health_profile: first.health_profile,
            premium_payment_term: first.premium_payment_term,
            riders: first.riders
        },
        quotes: preparedQuotes
    };
}

module.exports = { prepareQuote, compareQuotes };
