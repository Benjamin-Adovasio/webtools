const lookupBtn = document.getElementById("lookupBtn");
const domainInput = document.getElementById("domainInput");
const recordType = document.getElementById("recordType");
const resultBox = document.getElementById("resultBox");
const statusEl = document.getElementById("status");

function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "status " + type;
}

function showResult(content) {
    resultBox.textContent = content;
    resultBox.classList.remove("hidden");
}

function hideResult() {
    resultBox.classList.add("hidden");
    resultBox.textContent = "";
}

function setBusy(isBusy) {
    lookupBtn.disabled = isBusy;
    statusEl.setAttribute("aria-busy", String(isBusy));
}

async function lookupDns() {
    const domain = domainInput.value.trim();
    const type = recordType.value;

    hideResult();

    if (!domain) {
        setStatus("Please enter a domain.", "error");
        return;
    }

    setBusy(true);
    setStatus("Querying DNS...", "loading");

    try {
        const response = await fetch("/api/dns", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: domain,
                type: type
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        showResult(JSON.stringify(data, null, 2));
        setStatus("DNS lookup successful.", "success");

    } catch (error) {
        showResult(error.toString());
        setStatus("DNS lookup failed.", "error");
    } finally {
        setBusy(false);
    }
}

lookupBtn.addEventListener("click", lookupDns);
domainInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        lookupBtn.click();
    }
});
