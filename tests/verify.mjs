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
const sharedFooterHeadInclude = '<!--#include virtual="/_adovasio-shared/footer/head.html" -->';
const sharedFooterBodyInclude = '<!--#include virtual="/_adovasio-shared/footer/footer.html" -->';
const duplicatedFooterFiles = [
    "assets/css/footer.css",
    "assets/js/footer.js",
    "assets/data/footer/projects.json",
    "assets/data/footer/technologies.json",
    "assets/images/footer/adovasio-footer-mark-96.webp",
    "assets/fonts/manrope-latin-400-800.woff2"
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
    assert(
        html.split(sharedFooterHeadInclude).length === 2,
        `${pagePath} must include the canonical footer head exactly once.`
    );
    assert(
        html.split(sharedFooterBodyInclude).length === 2,
        `${pagePath} must include the canonical footer body exactly once.`
    );
    assert(
        !/<footer\b/i.test(html),
        `${pagePath} must not duplicate the canonical footer markup.`
    );
    assert(!/assets\/(?:css|js)\/footer\.(?:css|js)/i.test(html), `${pagePath} references a copied footer asset.`);
    assert(!/<iframe\b/i.test(html), `${pagePath} must not contain an iframe.`);

    for (const match of matchAll(html, /<svg\b([^>]*)>\s*<use\b/g)) {
        assert(
            /\bviewBox="[^"]+"/.test(match[1]),
            `${pagePath} contains a sprite icon without an explicit viewBox.`
        );
    }

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

const homeHtml = read("index.html");
assert(
    !/Made for real use|Everything in one place/i.test(homeHtml),
    "The homepage must not restore the removed promotional sections."
);

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

const siteCss = read("assets/css/style.css");

assert(siteCss.includes(".tool-card__footer"), "Tool-card footer styling must be preserved.");
assert(!siteCss.includes(".site-footer"), "Site footer styling must come from the canonical shared module.");
assert(!siteCss.includes(".brand--footer"), "Copied footer brand styling must not remain local.");

for (const relativePath of duplicatedFooterFiles) {
    assert(!existsSync(resolve(root, relativePath)), `Copied footer file must be removed: ${relativePath}.`);
}

console.log(
    `Verified ${htmlPages.length} pages, ${catalog.categories.length} categories, ` +
    `${catalog.tools.length} catalog entries, ${pageContracts.length} tool controllers, ` +
    "and the canonical SSI footer contract."
);
