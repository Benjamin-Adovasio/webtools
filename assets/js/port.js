const testBtn = document.getElementById("testBtn");
const hostInput = document.getElementById("hostInput");
const portInput = document.getElementById("portInput");
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
    testBtn.disabled = isBusy;
    statusEl.setAttribute("aria-busy", String(isBusy));
}

async function checkPort() {
    const host = hostInput.value.trim();
    const port = parseInt(portInput.value, 10);

    hideResult();

    if (!host) {
        setStatus("Please enter a host.", "error");
        return;
    }

    if (!port || port < 1 || port > 65535) {
        setStatus("Please enter a valid port (1–65535).", "error");
        return;
    }

    setBusy(true);
    setStatus("Testing port connectivity...", "loading");

    try {
        const response = await fetch("/api/port", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                host: host,
                port: port
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        const output =
            "Host: " + data.host + "\n" +
            "Port: " + data.port + "\n" +
            "Open: " + (data.open ? "Yes" : "No");

        showResult(output);
        setStatus("Port test completed.", "success");

    } catch (error) {
        showResult(error.toString());
        setStatus("Port test failed.", "error");
    } finally {
        setBusy(false);
    }
}

testBtn.addEventListener("click", checkPort);
[hostInput, portInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            testBtn.click();
        }
    });
});
