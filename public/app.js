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

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            `Invalid server response (${response.status}).`
        );
    }

    if (!response.ok) {
        throw new Error(
            result.error || `Request failed (${response.status}).`
        );
    }

    return result;
}

async function loadQuotes() {
    quotesList.textContent = "Loading quotes...";

    try {
        const data = await apiRequest("/api/quotes");

        if (!Array.isArray(data)) {
            throw new Error("The server did not return a quote list.");
        }

        savedQuotes = data;

        const existingIds = new Set(
            savedQuotes.map(quote => Number(quote.id))
        );

        for (const id of selectedQuoteIds) {
            if (!existingIds.has(id)) {
                selectedQuoteIds.delete(id);
            }
        }

        quoteCount.textContent = savedQuotes.length;
        displayQuotes();
    } catch (error) {
        quotesList.textContent = "Unable to load quotes: " + error.message;
        quoteCount.textContent = "—";
        console.error("Load quotes error:", error);
    }
}

function addText(parent, tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.appendChild(element);
    return element;
}

function displayQuotes() {
    quotesList.replaceChildren();

    if (savedQuotes.length === 0) {
        quotesList.textContent = "No saved quotes yet. Add your first quote above.";
        return;
    }

    savedQuotes.forEach(quote => {
        const card = document.createElement("div");
        card.className = "quote-card";

        const header = document.createElement("div");
        header.className = "quote-card-header";

        const selectionLabel = document.createElement("label");
        selectionLabel.className = "quote-selection";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "quote-select";
        checkbox.checked = selectedQuoteIds.has(Number(quote.id));

        checkbox.addEventListener("change", () => {
            const id = Number(quote.id);

            if (checkbox.checked) {
                selectedQuoteIds.add(id);
            } else {
                selectedQuoteIds.delete(id);
            }
        });

        selectionLabel.appendChild(checkbox);
        addText(selectionLabel, "span", "Select to compare");
        header.appendChild(selectionLabel);

        const title = document.createElement("h3");
        title.textContent = quote.insurer_name;
        header.appendChild(title);
        card.appendChild(header);

        const details = document.createElement("div");
        details.className = "quote-details";

        addText(details, "p", `Age: ${quote.age}`);
        addText(details, "p", `Life cover: ${formatRupees(quote.cover_amount)}`);
        addText(details, "p", `Policy term: ${quote.policy_term} years`);
        addText(details, "p", `Premium: ${formatRupees(quote.premium_amount)} (${quote.premium_frequency})`);
        addText(details, "p", `Premium payment term: ${quote.premium_payment_term} years`);
        addText(details, "p", `Smoking: ${quote.smoking_status}`);
        addText(details, "p", `Health profile: ${quote.health_profile}`);
        addText(details, "p", `Riders: ${quote.riders}`);

        if (quote.claim_ratio != null) {
            addText(
                details,
                "p",
                `Claim ratio: ${quote.claim_ratio}%${quote.claim_ratio_year ? ` (${quote.claim_ratio_year})` : ""}`
            );
        }

        if (quote.health_answer) {
            addText(details, "p", `Health question answer: ${quote.health_answer}`);
        }

        if (quote.source_url) {
            const source = document.createElement("a");
            source.href = quote.source_url;
            source.textContent = "View source";
            source.target = "_blank";
            source.rel = "noopener noreferrer";
            details.appendChild(source);
        }

        if (quote.evidence) {
            addText(details, "p", `Evidence: ${quote.evidence}`);
        }

        card.appendChild(details);

        const actions = document.createElement("div");
        actions.className = "form-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "secondary-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editQuote(quote));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "secondary-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteQuote(quote.id));

        actions.append(editButton, deleteButton);
        card.appendChild(actions);
        quotesList.appendChild(card);
    });
}

function getFormData() {
    const formData = new FormData(quoteForm);
    const data = Object.fromEntries(formData.entries());

    data.insurer_name = data.insurer_name.trim();
    data.age = Number(data.age);
    data.cover_amount = Number(data.cover_amount);
    data.policy_term = Number(data.policy_term);
    data.premium_payment_term = Number(data.premium_payment_term);
    data.premium_amount = Number(data.premium_amount);

    data.claim_ratio =
        data.claim_ratio === "" ? null : Number(data.claim_ratio);

    data.claim_ratio_year = data.claim_ratio_year.trim();
    data.health_answer = data.health_answer || null;
    data.source_url = data.source_url.trim();
    data.evidence = data.evidence.trim();

    if (data.claim_ratio === null) {
        data.claim_ratio_year = "";
    }

    return data;
}

quoteForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!quoteForm.reportValidity()) {
        return;
    }

    saveQuoteBtn.disabled = true;
    showMessage(formMessage, "Saving quote...", true);

    try {
        const data = getFormData();

        const url = editingQuoteId
            ? `/api/quotes/${editingQuoteId}`
            : "/api/quotes";

        const method = editingQuoteId ? "PUT" : "POST";

        const result = await apiRequest(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        showMessage(
            formMessage,
            result.message || "Quote saved successfully!",
            true
        );

        resetForm();
        await loadQuotes();
    } catch (error) {
        showMessage(formMessage, "Unable to save quote: " + error.message);
        console.error("Save quote error:", error);
    } finally {
        saveQuoteBtn.disabled = false;
    }
});

function editQuote(quote) {
    editingQuoteId = Number(quote.id);

    for (const [key, value] of Object.entries(quote)) {
        const field = quoteForm.elements.namedItem(key);

        if (field && value != null) {
            field.value = value;
        }
    }

    formHeading.textContent = "Edit insurance quote";
    saveQuoteBtn.textContent = "Update Quote";
    cancelEditBtn.hidden = false;

    quoteForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    showMessage(formMessage, "Editing quote #" + quote.id, true);
}

function resetForm() {
    quoteForm.reset();
    editingQuoteId = null;

    formHeading.textContent = "Add an insurance quote";
    saveQuoteBtn.textContent = "Save Quote";
    cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener("click", () => {
    resetForm();
    showMessage(formMessage, "Edit cancelled.", true);
});

async function deleteQuote(id) {
    if (!confirm("Are you sure you want to delete this quote?")) {
        return;
    }

    try {
        const result = await apiRequest(`/api/quotes/${id}`, {
            method: "DELETE"
        });

        selectedQuoteIds.delete(Number(id));
        showMessage(formMessage, result.message || "Quote deleted.", true);
        comparisonResult.replaceChildren();

        await loadQuotes();
    } catch (error) {
        showMessage(formMessage, "Unable to delete quote: " + error.message);
        console.error("Delete quote error:", error);
    }
}

refreshBtn.addEventListener("click", loadQuotes);

compareBtn.addEventListener("click", async () => {
    const selectedQuotes = savedQuotes.filter(quote =>
        selectedQuoteIds.has(Number(quote.id))
    );

    if (selectedQuotes.length < 2) {
        comparisonResult.textContent = "Please select at least two quotes to compare.";
        return;
    }

    compareBtn.disabled = true;
    comparisonResult.textContent = "Comparing quotes...";

    try {
        const result = await apiRequest("/api/compare", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                quotes: selectedQuotes
            })
        });

        comparisonResult.replaceChildren();

        addText(comparisonResult, "h3", "Comparison Results");

        if (Array.isArray(result)) {
            result.forEach(item => {
                const section = document.createElement("div");
                section.className = "comparison-item";

                if (typeof item === "object" && item !== null) {
                    Object.entries(item).forEach(([key, value]) => {
                        addText(section, "p", `${key.replaceAll("_", " ")}: ${value ?? "N/A"}`);
                    });
                } else {
                    addText(section, "p", String(item));
                }

                comparisonResult.appendChild(section);
            });
        } else if (result && typeof result === "object") {
            Object.entries(result).forEach(([key, value]) => {
                const section = document.createElement("div");
                section.className = "comparison-item";

                addText(section, "h4", key.replaceAll("_", " "));

                if (Array.isArray(value)) {
                    value.forEach(item => {
                        addText(section, "p", JSON.stringify(item));
                    });
                } else if (value && typeof value === "object") {
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        addText(section, "p", `${subKey.replaceAll("_", " ")}: ${subValue ?? "N/A"}`);
                    });
                } else {
                    addText(section, "p", String(value ?? "N/A"));
                }

                comparisonResult.appendChild(section);
            });
        } else {
            addText(comparisonResult, "p", String(result));
        }
    } catch (error) {
        comparisonResult.textContent = "Unable to compare quotes: " + error.message;
        console.error("Compare quotes error:", error);
    } finally {
        compareBtn.disabled = false;
    }
});
loadQuotes();

