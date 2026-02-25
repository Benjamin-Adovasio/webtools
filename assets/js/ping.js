const pingBtn = document.getElementById("pingBtn");
const hostInput = document.getElementById("hostInput");
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

pingBtn.addEventListener("click", async () => {
    const host = hostInput.value.trim();

    if (!host) {
        setStatus("Please enter a host.", "error");
        return;
    }

    setStatus("Pinging host...", "loading");
    hideResult();

    try {
        const response = await fetch("/api/ping", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                host: host
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        showResult(data.output || JSON.stringify(data, null, 2));
        setStatus("Ping completed.", "success");

    } catch (error) {
        showResult(error.toString());
        setStatus("Ping failed.", "error");
    }
});