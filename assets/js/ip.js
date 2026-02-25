const checkBtn = document.getElementById("checkBtn");
const statusEl = document.getElementById("status");
const resultBox = document.getElementById("resultBox");

function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "status " + type;
}

checkBtn.addEventListener("click", async () => {
    setStatus("Contacting API...", "loading");
    resultBox.classList.add("hidden");
    resultBox.textContent = "";

    try {
        const response = await fetch("/api/ip", {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        resultBox.textContent = JSON.stringify(data, null, 2);
        resultBox.classList.remove("hidden");
        setStatus("IP information retrieved successfully.", "success");

    } catch (error) {
        setStatus("Failed to contact API. Backend not running?", "error");
        resultBox.textContent = error.toString();
        resultBox.classList.remove("hidden");
    }
});