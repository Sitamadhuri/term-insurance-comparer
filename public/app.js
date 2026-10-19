```javascript
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
            `Server returned an invalid response (${response.status}). Check the backend route.`
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
        savedQuotes = await apiRequest("/api/quotes");

        if (!Array.isArray(savedQuotes)) {
            throw new Error("The quotes API did not return a list.");
        }

        const currentIds = new Set(
            savedQuotes.map(quote => Number(quote.id))
        );

        for (const id of selectedQuoteIds) {
            if (!currentIds.has(id)) {
                selectedQuoteIds.delete(id);
            }
        }

        quoteCount.textContent = savedQuotes.length;
        displayQuotes();
    } catch (error) {
        quotesList.textContent =
            "Unable to load quotes. " + error.message;
        quoteCount.textContent = "—";
        console.error("Loading quotes failed:", error);
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
        checkbox
