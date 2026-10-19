
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const quotesList = document.getElementById("quotesList");
const quoteCount = document.getElementById("quoteCount");
const refreshBtn = document.getElementById("refreshBtn");
const compareBtn = document.getElementById("compareBtn");
const comparisonResult = document.getElementById("comparisonResult");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formHeading = document.getElementById("formHeading");

let savedQuotes = [];
let editingQuoteId = null;
const selectedQuoteIds = new Set();

function formatRupees(amount) {
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });
}

function showMessage(element, message, success = false) {
    element.textContent = message;
    element.style.color = success ? "#247b4a" : "#c0392b";
}

async function loadQuotes() {
    quotesList.textContent = "Loading quotes...";

    try {
        const response = await fetch("/api/quotes");
        if (!response.ok) throw new Error("Could not load quotes.");

        savedQuotes = await response.json();

        const currentIds = new Set(savedQuotes.map(q => Number(q.id)));
        for (const id of selectedQuoteIds) {
            if (!currentIds.has(id)) selectedQuoteIds.delete(id);
        }

        quoteCount.textContent = savedQuotes.length;
        displayQuotes();
    } catch (error) {
        quotesList.textContent =
            "Unable to load quotes. Check that your backend is running.";
    }
}

function addText(parent, tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
}

function displayQuotes() {
    quotesList.replaceChildren();

    if (savedQuotes.length === 0) {
        quotesList.textContent = "No saved quotes yet.";
        return;
    }

    savedQuotes.forEach(quote => {
        const card = document.createElement("div");
        card.className = "quote-card";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "quote-select";
        checkbox.value = quote.id;
        checkbox.checked = selectedQuoteIds.has(Number(quote.id));
        checkbox.setAttribute("aria-label", "Select " + quote.insurer_name);

        checkbox.addEventListener("change", () => {
            const id = Number(quote.id);
            if (checkbox.checked) selectedQuoteIds.add(id);
            else selectedQuoteIds.delete(id);
        });

        const details = document.createElement("div");
        details.className = "quote-details";

        addText(details, "h3", quote.insurer_name);
        addText(details, "p",
            "Premium: " + formatRupees(quote.premium_amount) +
            " / " + quote.premium_frequency);
        addText(details, "p",
            "Age: " + quote.age +
            " | Cover: " + formatRupees(quote.cover_amount) +
            " | Policy term: " + (quote.policy_term ?? "Not provided"));
        addText(details, "p",
            "Smoking: " + (quote.smoking_status || "Not provided") +
            " | Health profile: " + (quote.health_profile || "Not provided"));
        addText(details, "p",
            "Payment term: " + (quote.premium_payment_term ?? "Not provided") +
            " years | Riders: " + (quote.riders || "Not provided"));
        addText(details, "p",
            "Evidence: " + (quote.evidence || "Not provided"));

        const actions = document.createElement("div");
        actions.className = "quote-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "secondary-btn";
        editButton.textContent = "Edit Quote";
        editButton.addEventListener("click", () => startEditing(quote));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete Quote";
        deleteButton.addEventListener("click", () => deleteQuote(quote));

        actions.append(editButton, deleteButton);
        card.append(checkbox, details, actions);
        quotesList.append(card);
    });
}

function startEditing(quote) {
    editingQuoteId = Number(quote.id);

    const fields = [
        "insurer_name", "age", "cover_amount", "policy_term",
        "premium_amount", "premium_frequency", "smoking_status",
        "health_profile", "premium_payment_term", "riders",
        "claim_ratio", "claim_ratio_year", "health_answer",
        "source_url", "evidence"
    ];

    fields.forEach(name => {
        const field = quoteForm.elements.namedItem(name);
        if (field) field.value = quote[name] ?? "";
    });

    saveQuoteBtn.textContent = "Update Quote";
    cancelEditBtn.hidden = false;
    formHeading.textContent = "Edit insurance quote";
    showMessage(formMessage, "Editing quote ID " + quote.id + ".");
    quoteForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditing() {
    editingQuoteId = null;
    quoteForm.reset();
    saveQuoteBtn.textContent = "Save Quote";
    cancelEditBtn.hidden = true;
    formHeading.textContent = "Add an insurance quote";
    showMessage(formMessage, "Edit cancelled.", true);
}

cancelEditBtn.addEventListener("click", cancelEditing);

async function deleteQuote(quote) {
    const confirmed = window.confirm(
        `Delete "${quote.insurer_name}" (quote ID ${quote.id})?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch("/api/quotes/" + quote.id, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to delete quote.");
        }

        selectedQuoteIds.delete(Number(quote.id));

        if (editingQuoteId === Number(quote.id)) {
            cancelEditing();
        }

        showMessage(formMessage, "Quote deleted successfully.", true);
        await loadQuotes();
    } catch (error) {
        showMessage(formMessage, error.message);
    }
}

quoteForm.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(quoteForm);
    const ratioText = formData.get("claim_ratio").trim();

    const quote = {
        insurer_name: formData.get("insurer_name").trim(),
        age: Number(formData.get("age")),
        cover_amount: Number(formData.get("cover_amount")),
        policy_term: Number(formData.get("policy_term")),
        premium_amount: Number(formData.get("premium_amount")),
        premium_frequency: formData.get("premium_frequency"),
        smoking_status: formData.get("smoking_status"),
        health_profile: formData.get("health_profile"),
        premium_payment_term: Number(formData.get("premium_payment_term")),
        riders: formData.get("riders"),
        claim_ratio: ratioText === "" ? null : Number(ratioText),
        claim_ratio_year: formData.get("claim_ratio_year").trim() || null,
        health_answer: formData.get("health_answer") || null,
        source_url: formData.get("source_url").trim() || null,
        evidence: formData.get("evidence").trim() || null
    };

    const isEditing = editingQuoteId !== null;
    showMessage(formMessage, isEditing ? "Updating quote..." : "Saving quote...");

    try {
        const response = await fetch(
            isEditing ? "/api/quotes/" + editingQuoteId : "/api/quotes",
            {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(quote)
            }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to save quote.");

        const message = isEditing
            ? "Quote updated successfully! Record ID: " + result.id
            : "Quote saved successfully! Record ID: " + result.id;

        editingQuoteId = null;
        quoteForm.reset();
        saveQuoteBtn.textContent = "Save Quote";
        cancelEditBtn.hidden = true;
        formHeading.textContent = "Add an insurance quote";

        showMessage(formMessage, message, true);
        await loadQuotes();
    } catch (error) {
        showMessage(formMessage, error.message);
    }
});

compareBtn.addEventListener("click", async () => {
    const quotes = savedQuotes.filter(
        quote => selectedQuoteIds.has(Number(quote.id))
    );

    if (quotes.length < 2) {
        comparisonResult.textContent =
            "Please select at least two quotes to compare.";
        return;
    }

    comparisonResult.textContent = "Comparing quotes...";

    try {
        const response = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quotes })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Comparison failed.");

        displayComparison(result);
    } catch (error) {
        comparisonResult.textContent = error.message;
    }
});

function displayComparison(result) {
    comparisonResult.replaceChildren();

    addText(comparisonResult, "h2", "Comparison Results");

    const status = addText(
        comparisonResult,
        "p",
        "Status: " + result.status + " — " + result.message
    );

    status.style.fontWeight = "600";
    status.style.color = result.status === "Pass" ? "#247b4a" : "#c0392b";

    if (result.comparison_basis) {
        const basis = result.comparison_basis;
        addText(comparisonResult, "p",
            "Comparison basis: Age " + basis.age +
            ", Cover " + formatRupees(basis.cover_amount) +
            ", Policy term " + basis.policy_term + " years" +
            ", Smoking: " + basis.smoking_status +
            ", Health profile: " + basis.health_profile +
            ", Payment term: " + basis.premium_payment_term +
            " years, Riders: " + basis.riders);
    }

    (result.quotes || []).forEach(quote => {
        const card = document.createElement("div");
        card.className = "result-card";

        addText(card, "h3", quote.insurer_name);
        addText(card, "p",
            "Original premium: " + formatRupees(quote.premium_amount) +
            " / " + quote.premium_frequency);

        addText(card, "p",
            quote.annual_equivalent == null
                ? "Annual equivalent: Unavailable"
                : "Annual equivalent: " + formatRupees(quote.annual_equivalent));

        addText(card, "p",
            "Claim ratio: " + (quote.claim_ratio ?? "Not provided") +
            " | Reporting year: " + (quote.claim_ratio_year || "Not provided"));
        addText(card, "p", "Health answer: " + (quote.health_answer || "Not provided"));
        addText(card, "p", "Smoking status: " + (quote.smoking_status || "Not provided"));
        addText(card, "p", "Health profile: " + (quote.health_profile || "Not provided"));
        addText(card, "p", "Riders: " + (quote.riders || "Not provided"));
        addText(card, "p", "Evidence: " + (quote.evidence || "Not provided"));

        if (quote.source_url) {
            try {
                const url = new URL(quote.source_url);
                if (["http:", "https:"].includes(url.protocol)) {
                    const link = document.createElement("a");
                    link.href = url.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = "Open source";
                    card.append(link);
                }
            } catch {
                addText(card, "p", "Source URL is invalid.");
            }
        }

        comparisonResult.append(card);
    });
}

refreshBtn.addEventListener("click", loadQuotes);
loadQuotes();
