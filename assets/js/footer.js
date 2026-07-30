(() => {
  "use strict";

  const MAIN_SITE_ORIGIN = "https://adovasio.com";
  const PROJECTS_URL = "/assets/data/footer/projects.json";
  const TECHNOLOGIES_URL = "/assets/data/footer/technologies.json";
  const FOOTER_MARK_URL = "/assets/images/footer/adovasio-footer-mark-96.webp";
  const PROJECT_AUDIENCES = new Set(["public", "client", "internal"]);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSiteFooters, { once: true });
  } else {
    initSiteFooters();
  }

  function initSiteFooters() {
    const footerRoots = Array.from(document.querySelectorAll("[data-site-footer]"));
    if (!footerRoots.length) {
      return;
    }

    renderSiteFooters(footerRoots);
    initProjectSurfaces(footerRoots);
  }

  function renderSiteFooters(footerRoots) {
    const page = getCurrentPage();
    const year = new Date().getFullYear();

    footerRoots.forEach(root => {
      root.classList.add("site-footer--mega");
      root.removeAttribute("aria-labelledby");
      root.innerHTML = `
        <div class="mega-footer__main">
          <div class="mega-footer__shell mega-footer__directory">
            <div class="mega-footer__brand" data-reveal>
              <a class="mega-footer__lockup" href="${MAIN_SITE_ORIGIN}/" aria-label="Adovasio Technology LLC home">
                <img
                  src="${FOOTER_MARK_URL}"
                  width="96"
                  height="96"
                  loading="lazy"
                  alt=""
                />
                <span>
                  <strong>Adovasio</strong>
                  <small>Technology LLC</small>
                </span>
              </a>
              <p class="mega-footer__brand-copy">
                Professional technology without enterprise complexity.
              </p>
              <a class="mega-footer__email" href="mailto:info@adovasio.com">
                info@adovasio.com
              </a>
              <div
                class="mega-footer__client-access"
                data-projects-surface="footer-client"
                data-project-limit="1"
                aria-live="polite"
                aria-busy="true"
              >
                <span class="mega-footer__loading">Loading client access…</span>
              </div>
              <p class="mega-footer__copyright">
                <span>&copy; <span data-current-year>${year}</span> Adovasio Technology LLC</span>
                <span>Technology that just works.</span>
              </p>
            </div>

            <nav class="mega-footer__group" aria-labelledby="footer-explore-title" data-reveal>
              <h2 id="footer-explore-title">Explore</h2>
              <ul>
                <li>
                  <a href="${MAIN_SITE_ORIGIN}/business.html"${renderCurrentPage("business", page)}>Business</a>
                </li>
                <li>
                  <a href="${MAIN_SITE_ORIGIN}/residential.html"${renderCurrentPage("residential", page)}>
                    Residential
                  </a>
                </li>
                <li>
                  <a href="${MAIN_SITE_ORIGIN}/portfolio.html"${renderCurrentPage("portfolio", page)}>Portfolio</a>
                </li>
                <li>
                  <a href="${MAIN_SITE_ORIGIN}/about.html"${renderCurrentPage("about", page)}>About</a>
                </li>
                <li>
                  <a href="${MAIN_SITE_ORIGIN}/contact.html"${renderCurrentPage("contact", page)}>Contact</a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/adovasiotech/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram<span class="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              </ul>
            </nav>

            <nav
              class="mega-footer__group mega-footer__project-group"
              aria-labelledby="footer-tools-title"
              data-reveal
            >
              <h2 id="footer-tools-title">Tools &amp; Platforms</h2>
              <ul
                class="mega-footer__project-list"
                data-projects-surface="footer-projects"
                data-footer-project-group="tools"
                aria-live="polite"
                aria-busy="true"
              >
                <li class="mega-footer__loading">Loading tools…</li>
              </ul>
            </nav>

            <nav
              class="mega-footer__group mega-footer__project-group"
              aria-labelledby="footer-ios-title"
              data-reveal
            >
              <h2 id="footer-ios-title">iOS Apps</h2>
              <ul
                class="mega-footer__project-list"
                data-projects-surface="footer-projects"
                data-footer-project-group="ios"
                aria-live="polite"
                aria-busy="true"
              >
                <li class="mega-footer__loading">Loading apps…</li>
              </ul>
            </nav>

            <nav
              class="mega-footer__group mega-footer__project-group mega-footer__project-group--systems"
              aria-labelledby="footer-systems-title"
              data-reveal
            >
              <h2 id="footer-systems-title">Systems &amp; Infrastructure</h2>
              <ul
                class="mega-footer__project-list"
                data-projects-surface="footer-projects"
                data-footer-project-group="systems"
                aria-live="polite"
                aria-busy="true"
              >
                <li class="mega-footer__loading">Loading systems…</li>
              </ul>
            </nav>
          </div>
        </div>
      `;

      root.querySelectorAll("[data-reveal]").forEach(element => {
        element.classList.add("is-visible");
      });
    });
  }

  function getCurrentPage() {
    const page = cleanText(document.body?.dataset.page).toLowerCase();
    if (page) {
      return page;
    }

    const route = window.location.pathname.split("/").pop() || "home";
    return route.replace(/\.html$/i, "") || "home";
  }

  function renderCurrentPage(target, current) {
    return target === current ? ' aria-current="page"' : "";
  }

  async function initProjectSurfaces(footerRoots) {
    const roots = footerRoots.flatMap(root => (
      Array.from(root.querySelectorAll("[data-projects-surface]"))
    ));
    if (!roots.length) {
      return;
    }

    roots.forEach(root => root.setAttribute("aria-busy", "true"));

    try {
      const [projectPayload, technologyPayload] = await Promise.all([
        fetchJson(PROJECTS_URL),
        fetchJson(TECHNOLOGIES_URL).catch(() => ({ technologies: {} }))
      ]);
      const technologies = normalizeTechnologies(technologyPayload);
      const projects = normalizeProjects(projectPayload, technologies);

      if (!projects.length) {
        throw new Error("No valid projects were found.");
      }

      roots.forEach(root => {
        renderProjectSurface(root, projects);
        root.setAttribute("aria-busy", "false");
      });
    } catch (error) {
      roots.forEach(root => renderProjectError(root));
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }
    return response.json();
  }

  function normalizeTechnologies(payload) {
    const source = payload && typeof payload.technologies === "object"
      ? payload.technologies
      : {};
    const technologies = new Map();

    Object.entries(source).forEach(([id, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const name = cleanText(value.name);
      if (!name) {
        return;
      }

      technologies.set(id, {
        id,
        name,
        logo: normalizeImagePath(value.logo),
        mark: cleanText(value.mark) || getTechnologyMark(name),
        logoShape: normalizeLogoShape(value.logoShape),
        logoSurface: normalizeLogoSurface(value.logoSurface)
      });
    });

    return technologies;
  }

  function normalizeProjects(payload, technologies) {
    const source = payload && Array.isArray(payload.projects) ? payload.projects : [];

    return source
      .map((project, index) => normalizeProject(project, index, technologies))
      .filter(Boolean)
      .sort(compareProjectOrder);
  }

  function normalizeProject(source, index, technologies) {
    if (!source || typeof source !== "object") {
      return null;
    }

    const id = cleanText(source.id);
    const name = cleanText(source.name);
    if (!id || !name) {
      return null;
    }

    const visualSource = source.visual && typeof source.visual === "object"
      ? source.visual
      : {};
    const technologyIds = Array.isArray(source.technologies)
      ? source.technologies.filter(id => technologies.has(id))
      : [];
    const requestedPrimaryTechnology = cleanText(source.primaryTechnology);
    const primaryTechnology = technologyIds.includes(requestedPrimaryTechnology)
      ? requestedPrimaryTechnology
      : "";
    const category = cleanText(source.category) || "Other";
    const url = normalizeUrl(source.url);
    const domain = cleanText(source.domain) || getUrlHost(url);
    const rawOrder = Number(source.order);
    const rawAudience = cleanText(source.audience).toLowerCase();

    return {
      id,
      slug: cleanText(source.slug) || slugify(id),
      name,
      domain,
      url,
      tagline: cleanText(source.tagline),
      description: cleanText(source.description),
      category,
      categoryKey: slugify(category),
      kind: cleanText(source.kind) || "Project",
      audience: PROJECT_AUDIENCES.has(rawAudience) ? rawAudience : "internal",
      featured: source.featured === true,
      placements: normalizePlacements(source.placements),
      status: cleanText(source.status) || "live",
      order: Number.isFinite(rawOrder) ? rawOrder : index + 1,
      action: cleanText(source.action),
      tags: normalizeTags(source.tags),
      aliases: normalizeTags(source.aliases),
      logo: normalizeImagePath(source.logo),
      logoShape: normalizeLogoShape(source.logoShape),
      logoSurface: normalizeLogoSurface(source.logoSurface),
      technologies: technologyIds,
      primaryTechnology,
      visual: {
        type: cleanText(visualSource.type) || cleanText(visualSource.icon) || cleanText(source.icon) || "fallback",
        image: normalizeImagePath(visualSource.image || source.image)
      }
    };
  }

  function normalizePlacements(value) {
    if (!value || typeof value !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([surface, order]) => [surface, Number(order)])
        .filter(([, order]) => Number.isFinite(order))
    );
  }

  function normalizeTags(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(value.map(cleanText).filter(Boolean))
    );
  }

  function normalizeLogoShape(value) {
    const shape = cleanText(value).toLowerCase();
    return new Set(["mark", "stacked", "wide"]).has(shape) ? shape : "mark";
  }

  function normalizeLogoSurface(value) {
    const surface = cleanText(value).toLowerCase();
    return new Set(["light", "dark"]).has(surface) ? surface : "none";
  }

  function renderProjectSurface(root, projects) {
    const surface = root.dataset.projectsSurface;

    if (surface === "footer-projects") {
      renderFooterPortfolioGroup(root, projects, root.dataset.footerProjectGroup);
      return;
    }

    if (surface === "footer-tools" || surface === "footer-client") {
      renderFooterProjectSurface(root, projects, surface, root.dataset.projectLimit);
    }
  }

  function renderFooterPortfolioGroup(root, projects, rawGroup) {
    const group = cleanText(rawGroup).toLowerCase();
    const selected = projects
      .filter(project => getFooterProjectGroup(project) === group)
      .sort((a, b) => compareFooterGroupOrder(a, b, group));

    if (!selected.length) {
      renderFooterProjectFallback(root, "footer-projects");
      return;
    }

    root.innerHTML = selected.map(renderFooterToolProject).join("");
  }

  function getFooterProjectGroup(project) {
    const kind = project.kind.toLowerCase();

    if (Number.isFinite(project.placements["footer-client"])) {
      return "client";
    }

    if (kind === "app" || project.technologies.includes("ios")) {
      return "ios";
    }

    if (project.categoryKey === "tools" || project.audience === "public") {
      return "tools";
    }

    return "systems";
  }

  function compareFooterGroupOrder(a, b, group) {
    const placement = `footer-${group}`;
    const aPlacement = a.placements[placement];
    const bPlacement = b.placements[placement];
    const aHasPlacement = Number.isFinite(aPlacement);
    const bHasPlacement = Number.isFinite(bPlacement);

    if (aHasPlacement || bHasPlacement) {
      if (!aHasPlacement) {
        return 1;
      }
      if (!bHasPlacement) {
        return -1;
      }
      if (aPlacement !== bPlacement) {
        return aPlacement - bPlacement;
      }
    }

    return compareProjectOrder(a, b);
  }

  function renderFooterProjectSurface(root, projects, surface, rawLimit) {
    const requiredAudience = surface === "footer-client" ? "client" : "public";
    const selected = selectPlacedProjects(
      projects.filter(project => (
        project.status.toLowerCase() === "live"
        && project.audience === requiredAudience
      )),
      surface,
      rawLimit
    );

    if (!selected.length) {
      renderFooterProjectFallback(root, surface);
      return;
    }

    root.innerHTML = surface === "footer-client"
      ? renderFooterClientProject(selected[0])
      : selected.map(renderFooterToolProject).join("");
  }

  function renderFooterToolProject(project) {
    const destination = project.url
      || `${MAIN_SITE_ORIGIN}/portfolio.html#project-${slugify(project.slug)}`;
    const action = cleanText(project.action);

    return `
      <li${action ? ' class="mega-footer__project--action"' : ""}>
        <a href="${escapeAttribute(destination)}" ${buildLinkAttributes(destination)}>
          <span class="mega-footer__project-name">
            <span>${escapeHtml(project.name)}</span>
            ${action ? `<small>${escapeHtml(action)}</small>` : ""}
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
            <path d="M5 15 15 5M7 5h8v8"></path>
          </svg>
          ${renderExternalNote(destination)}
        </a>
      </li>
    `;
  }

  function renderFooterClientProject(project) {
    const destination = project.url || `${MAIN_SITE_ORIGIN}/contact.html`;
    const action = project.action || project.name;

    return `
      <a
        class="mega-footer__client-login"
        href="${escapeAttribute(destination)}"
        ${buildLinkAttributes(destination)}
      >
        <svg class="mega-footer__client-login-icon" aria-hidden="true" viewBox="0 0 20 20">
          <rect x="4.5" y="8.5" width="11" height="8" rx="2"></rect>
          <path d="M7 8.5V6.8a3 3 0 0 1 6 0v1.7"></path>
        </svg>
        <span>${escapeHtml(action)}</span>
        <svg class="mega-footer__client-login-arrow" aria-hidden="true" viewBox="0 0 20 20" focusable="false">
          <path d="M5 15 15 5M7 5h8v8"></path>
        </svg>
        ${renderExternalNote(destination)}
      </a>
    `;
  }

  function renderFooterProjectFallback(root, surface) {
    if (surface === "footer-client") {
      root.innerHTML = `
        <a class="mega-footer__client-login" href="${MAIN_SITE_ORIGIN}/contact.html">
          <span>Client Access</span>
          <svg class="mega-footer__client-login-arrow" aria-hidden="true" viewBox="0 0 20 20" focusable="false">
            <path d="M5 15 15 5M7 5h8v8"></path>
          </svg>
        </a>
      `;
      return;
    }

    root.innerHTML = `
      <li>
        <a class="mega-footer__fallback" href="${MAIN_SITE_ORIGIN}/portfolio.html">Explore the portfolio</a>
      </li>
    `;
  }

  function selectPlacedProjects(projects, surface, rawLimit) {
    const placed = projects
      .filter(project => Number.isFinite(project.placements[surface]))
      .sort((a, b) => (
        a.placements[surface] - b.placements[surface] || compareProjectOrder(a, b)
      ));
    const fallback = surface === "home"
      ? projects.filter(project => project.featured)
      : [];
    const selection = placed.length ? placed : fallback;
    const limit = Number(rawLimit);

    return Number.isFinite(limit) && limit > 0
      ? selection.slice(0, limit)
      : selection;
  }

  function renderProjectError(root) {
    root.setAttribute("aria-busy", "false");
    renderFooterProjectFallback(root, root.dataset.projectsSurface);
  }

  function normalizeUrl(value) {
    const url = cleanText(value);
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return url.startsWith("/") ? `${MAIN_SITE_ORIGIN}${url}` : "";
  }

  function normalizeImagePath(value) {
    const path = cleanText(value);
    return path.startsWith("/assets/images/") ? `${MAIN_SITE_ORIGIN}${path}` : "";
  }

  function getUrlHost(value) {
    if (!value) {
      return "";
    }

    try {
      return new URL(value, window.location.origin).host;
    } catch (error) {
      return "";
    }
  }

  function buildLinkAttributes(url) {
    return isExternalUrl(url) ? 'target="_blank" rel="noopener noreferrer"' : "";
  }

  function renderExternalNote(url) {
    return isExternalUrl(url)
      ? '<span class="sr-only"> (opens in a new tab)</span>'
      : "";
  }

  function isExternalUrl(url) {
    return /^https?:\/\//i.test(url);
  }

  function compareProjectOrder(a, b) {
    return a.order - b.order || a.name.localeCompare(b.name);
  }

  function getTechnologyMark(name) {
    return name
      .split(/\s+/)
      .map(word => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  function slugify(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other";
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
