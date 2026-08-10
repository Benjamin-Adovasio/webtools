(() => {
    "use strict";

    const root = document.documentElement;
    const siteHeader = document.querySelector("[data-site-header]");
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navPanel = document.querySelector("[data-nav-panel]");
    const mobileNav = window.matchMedia("(max-width: 800px)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const catalogMount = document.querySelector("[data-tool-catalog]");
    const categoryNavMounts = document.querySelectorAll("[data-category-navigation]");
    const iconSprite = "assets/icons/tools.svg";
    let revealObserver = null;

    function setMenu(open, returnFocus = false) {
        if (!navToggle || !navPanel) {
            return;
        }

        const shouldOpen = mobileNav.matches && open;
        navPanel.classList.toggle("is-open", shouldOpen);
        navToggle.setAttribute("aria-expanded", String(shouldOpen));
        navToggle.setAttribute("aria-label", shouldOpen ? "Close navigation" : "Open navigation");
        navPanel.setAttribute("aria-hidden", mobileNav.matches ? String(!shouldOpen) : "false");
        document.body.classList.toggle("menu-open", shouldOpen);

        if (!shouldOpen && returnFocus) {
            navToggle.focus();
        }
    }

    function syncNavigation() {
        setMenu(false);
    }

    if (navToggle && navPanel) {
        navToggle.addEventListener("click", () => {
            setMenu(navToggle.getAttribute("aria-expanded") !== "true");
        });

        navPanel.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
                setMenu(false, true);
            }
        });

        mobileNav.addEventListener("change", syncNavigation);
        syncNavigation();
    }

    if (siteHeader) {
        const updateHeader = () => {
            siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
        };

        window.addEventListener("scroll", updateHeader, { passive: true });
        updateHeader();
    }

    function registerReveals(scope = document) {
        const elements = scope.querySelectorAll("[data-reveal]:not(.is-visible)");

        if (reduceMotion.matches || !("IntersectionObserver" in window)) {
            elements.forEach((element) => element.classList.add("is-visible"));
            return;
        }

        if (!revealObserver) {
            root.classList.add("reveal-ready");
            revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.12,
                rootMargin: "0px 0px -36px"
            });
        }

        elements.forEach((element) => revealObserver.observe(element));
    }

    registerReveals();

    function createIcon(iconName, className = "tool-card__icon") {
        const safeIcon = /^[a-z0-9-]+$/.test(iconName || "") ? iconName : "tool";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

        svg.setAttribute("class", className);
        svg.setAttribute("viewBox", safeIcon.startsWith("arrow-") ? "0 0 24 24" : "0 0 48 48");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        use.setAttribute("href", `${iconSprite}#${safeIcon}`);
        svg.append(use);

        return svg;
    }

    function createCategoryLink(category) {
        const link = document.createElement("a");
        const homePath = document.body.dataset.homePath || "index.html";

        link.href = `${homePath}#${category.id}`;
        link.textContent = category.navLabel || category.name;
        link.className = "site-nav__link";
        if (document.body.dataset.category === category.id) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "location");
        }

        return link;
    }

    function renderCategoryNavigation(categories) {
        categoryNavMounts.forEach((mount) => {
            const links = categories.map((category) => createCategoryLink(category));
            mount.replaceChildren(...links);
        });
    }

    function createToolCard(tool, category) {
        const allowedAccents = new Set(["blue", "cyan", "violet", "indigo", "teal", "amber", "rose"]);
        const accent = allowedAccents.has(tool.accent) ? tool.accent : "blue";
        const card = document.createElement("a");
        const top = document.createElement("div");
        const iconShell = document.createElement("span");
        const meta = document.createElement("span");
        const title = document.createElement("h4");
        const description = document.createElement("p");
        const footer = document.createElement("span");
        const cta = document.createElement("span");
        const linkIcon = tool.linkType === "external" ? "arrow-up-right" : "arrow-right";

        card.className = `tool-card tool-card--${tool.featured ? "featured" : "compact"} tool-card--${accent}`;
        card.href = tool.url;
        card.id = `tool-${tool.id}`;

        if (tool.linkType === "external") {
            card.rel = "external";
        }

        top.className = "tool-card__top";
        iconShell.className = "tool-card__icon-shell";
        iconShell.append(createIcon(tool.icon));
        meta.className = "tool-card__meta";
        meta.textContent = tool.linkType === "external" ? "Adovasio web app" : "Network utility";
        top.append(iconShell, meta);

        title.textContent = tool.name;
        description.textContent = tool.description;

        footer.className = "tool-card__footer";
        cta.textContent = tool.ctaLabel || (tool.linkType === "external" ? "Open application" : "Open tool");
        footer.append(cta, createIcon(linkIcon, "tool-card__arrow"));

        card.append(top, title, description, footer);

        if (tool.featured) {
            const art = document.createElement("span");
            art.className = "tool-card__art";
            art.append(createIcon(tool.icon, "tool-card__watermark"));
            card.append(art);
        }

        card.setAttribute("aria-label", `${tool.name}: ${tool.description}`);

        return card;
    }

    function renderCatalog(categories, tools) {
        if (!catalogMount) {
            return;
        }

        const sections = [];

        categories.forEach((category) => {
            const categoryTools = tools
                .filter((tool) => tool.category === category.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            if (!categoryTools.length) {
                return;
            }

            const section = document.createElement("section");
            const heading = document.createElement("header");
            const eyebrow = document.createElement("p");
            const title = document.createElement("h3");
            const description = document.createElement("p");
            const grid = document.createElement("div");
            const hasFeaturedTools = categoryTools.some((tool) => tool.featured);

            section.className = `tool-category${hasFeaturedTools ? " tool-category--featured" : ""}`;
            section.id = category.id;
            section.setAttribute("aria-labelledby", `${category.id}-title`);

            heading.className = "section-heading";
            heading.dataset.reveal = "";
            eyebrow.className = "eyebrow";
            eyebrow.textContent = category.eyebrow || "Tool category";
            title.id = `${category.id}-title`;
            title.textContent = category.name;
            description.textContent = category.description;
            heading.append(eyebrow, title, description);

            grid.className = hasFeaturedTools ? "featured-grid" : "network-grid";
            categoryTools.forEach((tool) => {
                grid.append(createToolCard(tool, category));
            });

            section.append(heading, grid);
            sections.push(section);
        });

        if (!sections.length) {
            throw new Error("No visible tool categories were found.");
        }

        catalogMount.replaceChildren(...sections);
        catalogMount.removeAttribute("aria-busy");
        registerReveals(catalogMount);

        const hashTarget = window.location.hash.slice(1);
        if (hashTarget && document.getElementById(hashTarget)) {
            window.requestAnimationFrame(() => {
                document.getElementById(hashTarget).scrollIntoView({
                    behavior: reduceMotion.matches ? "auto" : "smooth",
                    block: "start"
                });
            });
        }
    }

    function addDirectorySchema(tools) {
        if (!catalogMount) {
            return;
        }

        const schema = document.createElement("script");
        schema.id = "tool-directory-schema";
        schema.type = "application/ld+json";
        schema.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Free Tools from Adovasio directory",
            itemListElement: tools.map((tool, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: tool.name,
                url: new URL(tool.url, window.location.href).href
            }))
        });
        document.head.append(schema);
    }

    async function loadToolDirectory() {
        if (catalogMount) {
            catalogMount.setAttribute("aria-busy", "true");
        }

        try {
            const response = await fetch("assets/data/tools.json", {
                headers: { "Accept": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Catalog request failed with HTTP ${response.status}`);
            }

            const data = await response.json();
            const tools = Array.isArray(data.tools)
                ? data.tools.filter((tool) => tool && tool.status === "available")
                : [];
            const populatedCategoryIds = new Set(tools.map((tool) => tool.category));
            const categories = Array.isArray(data.categories)
                ? data.categories
                    .filter((category) => category && populatedCategoryIds.has(category.id))
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                : [];

            renderCategoryNavigation(categories);
            renderCatalog(categories, tools);
            addDirectorySchema(tools);
        } catch (error) {
            if (catalogMount) {
                const message = document.createElement("p");
                message.className = "catalog-message";
                message.setAttribute("role", "status");
                message.textContent = "The tool directory could not be loaded. Please refresh the page and try again.";
                catalogMount.replaceChildren(message);
                catalogMount.removeAttribute("aria-busy");
            }
        }
    }

    loadToolDirectory();
})();
