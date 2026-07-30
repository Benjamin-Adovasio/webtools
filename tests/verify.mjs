import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const htmlPages = [
    "index.html",
    "ip.html",
    "dns.html",
    "ping.html",
    "http.html",
    "port.html"
];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function read(relativePath) {
    return readFileSync(resolve(root, relativePath), "utf8");
}

function matchAll(source, expression) {
    return [...source.matchAll(expression)];
}

const catalog = JSON.parse(read("assets/data/tools.json"));
const requiredTools = new Map([
    ["file-converter", "https://convert.adovasio.com"],
    ["pdf-tools", "https://pdf.adovasio.com"],
    ["public-ip", "ip.html"],
    ["dns-lookup", "dns.html"],
    ["ping", "ping.html"],
    ["http-test", "http.html"],
    ["port-check", "port.html"]
]);

assert(Array.isArray(catalog.categories), "Catalog categories must be an array.");
assert(Array.isArray(catalog.tools), "Catalog tools must be an array.");

for (const [toolId, expectedUrl] of requiredTools) {
    const tool = catalog.tools.find((entry) => entry.id === toolId);
    assert(tool, `Catalog is missing required tool "${toolId}".`);
    assert(tool.url === expectedUrl, `"${toolId}" must link to ${expectedUrl}.`);

    for (const field of ["name", "description", "category", "icon", "linkType", "status"]) {
        assert(typeof tool[field] === "string" && tool[field], `"${toolId}" is missing "${field}".`);
    }
}

for (const category of catalog.categories) {
    const visibleTools = catalog.tools.filter(
        (tool) => tool.category === category.id && tool.status === "available"
    );
    assert(visibleTools.length > 0, `Category "${category.id}" must not be empty.`);
}

for (const pagePath of htmlPages) {
    const html = read(pagePath);
    const ids = matchAll(html, /\sid="([^"]+)"/g).map((match) => match[1]);
    const uniqueIds = new Set(ids);

    assert(ids.length === uniqueIds.size, `${pagePath} contains a duplicate id.`);
    assert(/<html[^>]+lang="en"/.test(html), `${pagePath} is missing its language.`);
    assert(/name="viewport"/.test(html), `${pagePath} is missing viewport metadata.`);
    assert(/name="description"/.test(html), `${pagePath} is missing a meta description.`);
    assert(/rel="canonical"/.test(html), `${pagePath} is missing a canonical URL.`);
    assert(/<main\b/.test(html), `${pagePath} is missing a main landmark.`);
    assert(/<footer\b/.test(html), `${pagePath} is missing a footer landmark.`);
    assert(
        html.includes('id="site-footer" data-site-footer'),
        `${pagePath} is missing the shared Adovasio footer mount.`
    );
    assert(
        html.includes('href="assets/css/footer.css"'),
        `${pagePath} is missing the scoped footer stylesheet.`
    );
    assert(
        html.includes('src="assets/js/footer.js"'),
        `${pagePath} is missing the dynamic footer renderer.`
    );
    assert(!/<iframe\b/i.test(html), `${pagePath} must not contain an iframe.`);

    for (const match of matchAll(html, /<(?:input|select)\b[^>]*\sid="([^"]+)"[^>]*>/g)) {
        assert(
            html.includes(`for="${match[1]}"`),
            `${pagePath} is missing a label for #${match[1]}.`
        );
    }

    for (const match of matchAll(html, /\s(?:href|src)="([^"]+)"/g)) {
        const reference = match[1];
        if (
            reference.startsWith("http") ||
            reference.startsWith("#") ||
            reference.startsWith("data:") ||
            reference.startsWith("mailto:")
        ) {
            continue;
        }

        const localPath = reference.split("#")[0].split("?")[0];
        assert(existsSync(resolve(root, localPath)), `${pagePath} references missing file "${localPath}".`);
    }
}

const pageContracts = [
    {
        page: "ip.html",
        script: "assets/js/ip.js",
        button: "checkBtn",
        ids: ["checkBtn", "status", "resultBox"],
        endpoint: "/api/ip",
        response: { ip: "203.0.113.10", method: "GET" }
    },
    {
        page: "dns.html",
        script: "assets/js/dns.js",
        button: "lookupBtn",
        ids: ["lookupBtn", "domainInput", "recordType", "status", "resultBox"],
        values: { domainInput: "example.com", recordType: "A" },
        endpoint: "/api/dns",
        response: { query: "example.com", type: "A", results: [] }
    },
    {
        page: "ping.html",
        script: "assets/js/ping.js",
        button: "pingBtn",
        ids: ["pingBtn", "hostInput", "status", "resultBox"],
        values: { hostInput: "example.com" },
        endpoint: "/api/ping",
        response: { host: "example.com", output: "3 packets transmitted" }
    },
    {
        page: "http.html",
        script: "assets/js/http.js",
        button: "checkBtn",
        ids: ["checkBtn", "urlInput", "status", "resultBox"],
        values: { urlInput: "https://example.com" },
        endpoint: "/api/http",
        response: {
            url: "https://example.com",
            status_code: 200,
            total_time: 0.1,
            content_type: "text/html"
        }
    },
    {
        page: "port.html",
        script: "assets/js/port.js",
        button: "testBtn",
        ids: ["testBtn", "hostInput", "portInput", "status", "resultBox"],
        values: { hostInput: "example.com", portInput: "443" },
        endpoint: "/api/port",
        response: { host: "example.com", port: 443, open: true }
    }
];

function createElement(initialValue = "") {
    const listeners = new Map();
    const classes = new Set(["hidden"]);

    return {
        value: initialValue,
        textContent: "",
        className: "",
        disabled: false,
        attributes: new Map(),
        listeners,
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name)
        },
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        setAttribute(name, value) {
            this.attributes.set(name, String(value));
        },
        click() {
            return listeners.get("click")?.();
        }
    };
}

for (const contract of pageContracts) {
    const html = read(contract.page);
    const source = read(contract.script);

    for (const id of contract.ids) {
        assert(html.includes(`id="${id}"`), `${contract.page} must preserve #${id}.`);
    }

    assert(
        source.includes(`fetch("${contract.endpoint}"`),
        `${contract.script} must preserve ${contract.endpoint}.`
    );
    assert(
        html.includes('aria-live="polite"'),
        `${contract.page} must expose status updates to assistive technology.`
    );

    const elements = {};
    for (const id of contract.ids) {
        elements[id] = createElement(contract.values?.[id] || "");
    }

    let requestedUrl = null;
    const context = {
        document: {
            getElementById(id) {
                return elements[id] || null;
            }
        },
        fetch: async (url) => {
            requestedUrl = url;
            return {
                ok: true,
                status: 200,
                json: async () => contract.response
            };
        },
        console,
        Error,
        JSON,
        Promise,
        parseInt
    };

    vm.runInNewContext(source, context, { filename: contract.script });
    await elements[contract.button].listeners.get("click")();

    assert(requestedUrl === contract.endpoint, `${contract.script} requested the wrong endpoint.`);
    assert(
        elements.status.className === "status success",
        `${contract.script} did not reach its success state.`
    );
    assert(
        !elements.resultBox.classList.contains("hidden"),
        `${contract.script} did not reveal its result.`
    );
    assert(elements[contract.button].disabled === false, `${contract.script} left its button disabled.`);
}

const footerCss = read("assets/css/footer.css");
const footerSource = read("assets/js/footer.js");
const footerData = JSON.parse(read("assets/data/footer/projects.json"));
const footerTechnologies = JSON.parse(read("assets/data/footer/technologies.json"));

assert(
    footerCss.includes('font-family: "Adovasio Footer Manrope"'),
    "The footer must use its isolated Manrope family."
);
assert(!footerCss.includes(":root"), "Footer CSS must not override Tools root variables.");
assert(!footerCss.includes("body::"), "Footer CSS must not add global body effects.");
assert(
    footerCss.includes("@media (prefers-reduced-motion: reduce)"),
    "Footer CSS must preserve reduced-motion behavior."
);
assert(
    footerSource.includes('const MAIN_SITE_ORIGIN = "https://adovasio.com"'),
    "The footer renderer must use absolute main-site links."
);
assert(
    !footerSource.includes('fetch("https://adovasio.com'),
    "Footer project data must remain local to avoid cross-origin failures."
);
assert(
    Array.isArray(footerData.projects) && footerData.projects.length > 0,
    "The footer project snapshot must contain projects."
);
assert(
    footerTechnologies.technologies?.ios,
    "The footer technology snapshot must preserve iOS grouping data."
);

function createFooterSurface(projectsSurface, footerProjectGroup = "", projectLimit = "") {
    return {
        dataset: {
            projectsSurface,
            footerProjectGroup,
            projectLimit
        },
        innerHTML: "",
        attributes: new Map([["aria-busy", "true"]]),
        setAttribute(name, value) {
            this.attributes.set(name, String(value));
        }
    };
}

const footerSurfaces = [
    createFooterSurface("footer-client", "", "1"),
    createFooterSurface("footer-projects", "tools"),
    createFooterSurface("footer-projects", "ios"),
    createFooterSurface("footer-projects", "systems")
];
const revealNodes = Array.from({ length: 5 }, () => {
    const classes = new Set();
    return {
        classList: {
            add(name) {
                classes.add(name);
            },
            contains(name) {
                return classes.has(name);
            }
        }
    };
});
const footerClasses = new Set(["site-footer"]);
const footerRoot = {
    innerHTML: "",
    classList: {
        add(name) {
            footerClasses.add(name);
        }
    },
    removeAttribute() {},
    querySelectorAll(selector) {
        if (selector === "[data-reveal]") {
            return revealNodes;
        }
        if (selector === "[data-projects-surface]") {
            return footerSurfaces;
        }
        return [];
    }
};
const requestedFooterData = [];
const footerContext = {
    document: {
        readyState: "complete",
        body: { dataset: { page: "home" } },
        querySelectorAll(selector) {
            return selector === "[data-site-footer]" ? [footerRoot] : [];
        }
    },
    window: {
        location: {
            origin: "https://tools.adovasio.com",
            pathname: "/index.html"
        }
    },
    fetch: async (url) => {
        requestedFooterData.push(url);
        const localPath = String(url).replace(/^\//, "");
        return {
            ok: true,
            json: async () => JSON.parse(read(localPath))
        };
    },
    console
};

vm.runInNewContext(footerSource, footerContext, { filename: "assets/js/footer.js" });
await new Promise((resolvePromise) => setImmediate(resolvePromise));

const [clientSurface, toolsSurface, iosSurface, systemsSurface] = footerSurfaces;
assert(footerClasses.has("site-footer--mega"), "The footer renderer did not activate mega-footer styling.");
assert(
    footerRoot.innerHTML.includes('href="https://adovasio.com/business.html"'),
    "Explore links must resolve to the main Adovasio site."
);
assert(
    footerRoot.innerHTML.includes('src="/assets/images/footer/adovasio-footer-mark-96.webp"'),
    "The footer must use the ported branding asset."
);
assert(
    requestedFooterData.join(" ").includes("/assets/data/footer/projects.json") &&
        requestedFooterData.join(" ").includes("/assets/data/footer/technologies.json"),
    "The footer renderer did not request both local data snapshots."
);
assert(
    clientSurface.innerHTML.includes("https://sso.adovasio.com") &&
        clientSurface.innerHTML.includes("Client Login"),
    "The footer client CTA must resolve to Adovasio SSO."
);
assert(
    toolsSurface.innerHTML.includes("https://tools.adovasio.com") &&
        toolsSurface.innerHTML.includes("https://convert.adovasio.com") &&
        toolsSurface.innerHTML.includes("https://pdf.adovasio.com"),
    "The footer tools group is missing required Adovasio applications."
);
assert(
    iosSurface.innerHTML.includes("Georgie AI") &&
        iosSurface.innerHTML.includes("Guardian Campus Safety"),
    "The footer iOS group was not rendered from project data."
);
assert(
    systemsSurface.innerHTML.includes("Adovasio VPN") &&
        systemsSurface.innerHTML.includes("Adovasio Cloud") &&
        systemsSurface.innerHTML.includes("Adovasio Index"),
    "The footer systems group was not rendered from project data."
);
for (const surface of footerSurfaces) {
    assert(
        surface.attributes.get("aria-busy") === "false",
        `${surface.dataset.footerProjectGroup || surface.dataset.projectsSurface} stayed busy.`
    );
}
assert(
    revealNodes.every((node) => node.classList.contains("is-visible")),
    "Injected footer content must become visible."
);

console.log(
    `Verified ${htmlPages.length} pages, ${catalog.categories.length} categories, ` +
    `${catalog.tools.length} catalog entries, ${pageContracts.length} tool controllers, ` +
    "and the shared dynamic footer."
);
