const checkBtn = document.getElementById("checkBtn");
const urlInput = document.getElementById("urlInput");
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

checkBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();

    if (!url) {
        setStatus("Please enter a URL.", "error");
        return;
    }

    setStatus("Checking HTTP response...", "loading");
    hideResult();

    try {
        const response = await fetch("/api/http", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: url
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        const formattedOutput =
            "Status Code: " + data.status_code + "\n" +
            "Total Time: " + data.total_time + "s\n" +
            "Content Type: " + data.content_type;

        showResult(formattedOutput);
        setStatus("HTTP check completed.", "success");

    } catch (error) {
        showResult(error.toString());
        setStatus("HTTP check failed.", "error");
    }
});