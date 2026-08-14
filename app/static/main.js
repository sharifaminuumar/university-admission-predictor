// ---------------------------------------------------------------------------
// Theme (light / dark)
// ---------------------------------------------------------------------------
// The initial class is applied by an inline script in index.html <head> so the
// page never flashes the wrong theme; this only handles toggling afterwards.
const THEME_STORAGE_KEY = "edupredict-theme";

function currentTheme() {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let themeSwitchTimer = null;

function applyTheme(theme) {
    const isDark = theme === "dark";
    const root = document.documentElement;

    // Suppress transitions across the swap. Every themed property carries one, so
    // without this the whole page cross-fades at once instead of flipping cleanly.
    root.setAttribute("data-theme-switching", "");
    clearTimeout(themeSwitchTimer);
    themeSwitchTimer = setTimeout(() => root.removeAttribute("data-theme-switching"), 60);

    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);

    const icon = document.getElementById("themeToggleIcon");
    const button = document.getElementById("themeToggle");

    // Show the theme you'd switch *to*, which is the usual convention.
    if (icon) icon.innerText = isDark ? "light_mode" : "dark_mode";
    if (button) {
        const label = isDark ? "Switch to light mode" : "Switch to dark mode";
        button.setAttribute("aria-pressed", String(isDark));
        button.setAttribute("aria-label", label);
        button.title = label;
    }
}

applyTheme(currentTheme());

const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        applyTheme(next);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch (err) {
            // Private browsing / storage disabled: the theme still applies for this page view.
            console.warn("Could not persist theme preference:", err);
        }
    });
}

// Follow the OS setting live, but only until the user has made an explicit choice.
if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", event => {
        let hasExplicitChoice = false;
        try {
            hasExplicitChoice = Boolean(localStorage.getItem(THEME_STORAGE_KEY));
        } catch (err) {
            hasExplicitChoice = false;
        }
        if (!hasExplicitChoice) applyTheme(event.matches ? "dark" : "light");
    });
}

const grades = ["", "A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];
const electivesList = [
    "Accounting", "Akan", "Elective Mathematics", "Agricultural Science", "Animal Husbandry",
    "Applied Electricity", "Applied Technology", "Arabic", "Art and Design Foundation", "Art and Design Studio",
    "Automobile Technology", "Biology", "Biomedical Science", "Building Construction Technology",
    "Business Management", "Chemistry", "Christian Religious Studies (CRS)", "Clothing and Textiles",
    "Computer Science", "Computing / ICT", "Crop Husbandry", "Design & Communication Technology",
    "Economics", "Electrical and Electronic Technology", "Electronics", "Engineering Science", "Financial Accounting",
    "Fisheries", "Food and Nutrition", "French", "General Knowledge in Art", "Geography",
    "Ghanaian Language", "Ghanaian Languages", "Government", "Graphic Design",
    "History", "Horticulture", "Islamic Religious Studies (IRS)", "Literature in English",
    "Management in Living", "Metal Technology", "Performing Arts", "Physical Education and Health",
    "Physics", "Religious and Moral Education (RME)", "Religious Studies", "Robotics", "Spanish",
    "Technical Drawing", "Wood Technology"
].sort();

// Single source of truth for supported institutions. `code` must match the
// short_code seeded in the database. Both dropdowns and the results header are
// built from this list, so onboarding a school only means adding one entry here.
const UNIVERSITIES = [
    { code: "UG", type: "Public", region: "Greater Accra", dropdownLabel: "University of Ghana (Legon)", summaryLabel: "University of Ghana" },
    { code: "KNUST", type: "Public", region: "Ashanti", dropdownLabel: "Kwame Nkrumah University of Science and Technology (KNUST)", summaryLabel: "KNUST" },
    { code: "UDS", type: "Public", region: "Northern", dropdownLabel: "University for Development Studies (UDS)", summaryLabel: "UDS" },
    { code: "UPSA", type: "Public", region: "Greater Accra", dropdownLabel: "University of Professional Studies, Accra (UPSA)", summaryLabel: "UPSA" },
    { code: "UCC", type: "Public", region: "Central", dropdownLabel: "University of Cape Coast (UCC)", summaryLabel: "University of Cape Coast" },
    { code: "UEW", type: "Public", region: "Central", dropdownLabel: "University of Education, Winneba (UEW)", summaryLabel: "University of Education, Winneba" },
    { code: "UHAS", type: "Public", region: "Volta", dropdownLabel: "University of Health and Allied Sciences (UHAS)", summaryLabel: "UHAS" },
    { code: "UMAT", type: "Public", region: "Western", dropdownLabel: "University of Mines and Technology (UMaT)", summaryLabel: "UMaT" },
    { code: "UENR", type: "Public", region: "Bono", dropdownLabel: "University of Energy and Natural Resources (UENR)", summaryLabel: "UENR" },
    { code: "AAMUSTED", type: "Public", region: "Ashanti", dropdownLabel: "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development (AAMUSTED)", summaryLabel: "AAMUSTED" },
    { code: "ATU", type: "Technical", region: "Greater Accra", dropdownLabel: "Accra Technical University (ATU)", summaryLabel: "Accra Technical University" },
    { code: "GCTU", type: "Public", region: "Greater Accra", dropdownLabel: "Ghana Communication Technology University (GCTU)", summaryLabel: "GCTU" },
    { code: "ASHESI", type: "Private", region: "Eastern", dropdownLabel: "Ashesi University (Berekuso)", summaryLabel: "Ashesi University" },
    { code: "VVU", type: "Private", region: "Greater Accra", dropdownLabel: "Valley View University (VVU)", summaryLabel: "Valley View University" }
];

// Regions that actually have institutions, alphabetised for the filter dropdowns.
const REGIONS = [...new Set(UNIVERSITIES.map(uni => uni.region))].sort();

function summaryLabelFor(uniCode) {
    const match = UNIVERSITIES.find(uni => uni.code === uniCode);
    return match ? match.summaryLabel : uniCode;
}

// Program names come from our own seed data, but they still flow through
// innerHTML, so escape anything interpolated into a template.
function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value).replace(
        /[&<>"']/g,
        char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
    );
}

// Rebuilds an institution dropdown, optionally narrowed to one region. The
// current selection is preserved when it still belongs to the chosen region,
// so changing region never silently swaps the school under the user.
function populateUniversitySelect(select, placeholder, region) {
    if (!select) return;

    const previous = select.value;
    const visible = region ? UNIVERSITIES.filter(uni => uni.region === region) : UNIVERSITIES;

    select.innerHTML = "";

    if (placeholder) {
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.text = placeholder;
        select.appendChild(placeholderOption);
    }

    visible.forEach(uni => {
        const option = document.createElement("option");
        option.value = uni.code;
        option.text = uni.dropdownLabel;
        select.appendChild(option);
    });

    const stillAvailable = visible.some(uni => uni.code === previous);
    select.value = stillAvailable ? previous : (placeholder ? "" : (visible[0] ? visible[0].code : ""));

    return stillAvailable;
}

function populateRegionSelect(select) {
    if (!select) return;

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.text = "All regions";
    select.appendChild(allOption);

    REGIONS.forEach(region => {
        const count = UNIVERSITIES.filter(uni => uni.region === region).length;
        const option = document.createElement("option");
        option.value = region;
        option.text = `${region} (${count})`;
        select.appendChild(option);
    });
}

populateRegionSelect(document.getElementById("regionSelector"));
populateRegionSelect(document.getElementById("browseRegionSelector"));
populateUniversitySelect(document.getElementById("universitySelector"), null, "");
populateUniversitySelect(document.getElementById("browseUniversitySelector"), "Select an institution…", "");

// Eligibility mode: narrowing the region rebuilds the institution list.
const regionSelector = document.getElementById("regionSelector");
if (regionSelector) {
    regionSelector.addEventListener("change", event => {
        populateUniversitySelect(document.getElementById("universitySelector"), null, event.target.value);
    });
}

// Browse mode: narrowing the region rebuilds the list and, if the loaded school
// falls outside the new region, clears the catalogue rather than leaving a
// result on screen that contradicts the filter.
const browseRegionSelector = document.getElementById("browseRegionSelector");
if (browseRegionSelector) {
    browseRegionSelector.addEventListener("change", event => {
        const browseSelect = document.getElementById("browseUniversitySelector");
        const kept = populateUniversitySelect(browseSelect, "Select an institution…", event.target.value);
        if (!kept) loadBrowsePrograms("");
    });
}

// Populate Core Grade dropdowns
["Core Mathematics", "English Language", "Integrated Science", "Social Studies"].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
        grades.forEach(grade => {
            let option = document.createElement("option");
            option.value = grade;
            option.text = grade === "" ? "Grade" : grade;
            select.appendChild(option);
        });
    }
});

// Build Elective Rows with New Tailwind Two-Column UI Structure
const electivesContainer = document.getElementById("electives-container");
if (electivesContainer) {
    for (let i = 1; i <= 4; i++) {
        const wrapper = document.createElement("div");
        wrapper.className = "bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant";

        const grid = document.createElement("div");
        grid.className = "grid grid-cols-2 gap-3";

        // Subject Column
        const nameCol = document.createElement("div");
        nameCol.className = "flex flex-col gap-1";
        const nameLabel = document.createElement("label");
        nameLabel.className = "text-xs font-medium text-on-surface-variant";
        nameLabel.innerText = `Elective ${i} ${i === 4 ? '(Optional)' : ''}`;

        const nameSelect = document.createElement("select");
        nameSelect.id = `el${i}_name`;
        nameSelect.className = "w-full h-10 rounded-lg border-outline-variant focus:border-primary text-sm bg-surface-container-lowest";
        if (i < 4) nameSelect.required = true;

        let defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.text = `Select Subject`;
        nameSelect.appendChild(defaultOpt);

        electivesList.forEach(subject => {
            let option = document.createElement("option");
            option.value = subject;
            option.text = subject;
            nameSelect.appendChild(option);
        });

        nameCol.appendChild(nameLabel);
        nameCol.appendChild(nameSelect);

        // Grade Column
        const gradeCol = document.createElement("div");
        gradeCol.className = "flex flex-col gap-1";
        const gradeLabel = document.createElement("label");
        gradeLabel.className = "text-xs font-medium text-on-surface-variant";
        gradeLabel.innerText = "Grade";

        const valSelect = document.createElement("select");
        valSelect.id = `el${i}_val`;
        valSelect.className = "w-full h-10 rounded-lg border-outline-variant focus:border-primary text-sm bg-surface-container-lowest";
        if (i < 4) valSelect.required = true;

        grades.forEach(grade => {
            let option = document.createElement("option");
            option.value = grade;
            option.text = grade === "" ? "Grade" : grade;
            valSelect.appendChild(option);
        });

        gradeCol.appendChild(gradeLabel);
        gradeCol.appendChild(valSelect);

        // Assemble
        grid.appendChild(nameCol);
        grid.appendChild(gradeCol);
        wrapper.appendChild(grid);
        electivesContainer.appendChild(wrapper);
    }
}

// ---------------------------------------------------------------------------
// Mode tabs: "Check Eligibility" vs "Browse Programmes"
// ---------------------------------------------------------------------------
const MODES = {
    eligibility: { tab: "tab-eligibility", panel: "panel-eligibility", results: "results-container" },
    browse: { tab: "tab-browse", panel: "panel-browse", results: "browse-container" }
};

function activateMode(activeName) {
    Object.entries(MODES).forEach(([name, ids]) => {
        const isActive = name === activeName;
        const tab = document.getElementById(ids.tab);
        const panel = document.getElementById(ids.panel);
        const results = document.getElementById(ids.results);

        if (tab) tab.setAttribute("aria-selected", String(isActive));
        if (panel) panel.classList.toggle("hidden", !isActive);

        // Only ever show the results belonging to the active mode. The inactive
        // mode's results stay rendered so switching back is instant.
        if (results && !isActive) results.classList.add("hidden");
    });

    // Re-reveal the active mode's results only if it actually has something to show.
    if (activeName === "eligibility" && lastEligiblePrograms !== null) {
        document.getElementById("results-container").classList.remove("hidden");
    }
    if (activeName === "browse" && browsePrograms !== null) {
        document.getElementById("browse-container").classList.remove("hidden");
    }
}

Object.entries(MODES).forEach(([name, ids]) => {
    const tab = document.getElementById(ids.tab);
    if (tab) tab.addEventListener("click", () => activateMode(name));
});

// ---------------------------------------------------------------------------
// Eligibility mode
// ---------------------------------------------------------------------------

// null = no prediction run yet; an array = results ready (possibly empty).
let lastEligiblePrograms = null;
let lastPredictionCode = null;

document.getElementById("gradeForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    // UI Loading States
    const btn = document.getElementById("submitBtn");
    const spinner = document.getElementById("btnSpinner");
    const btnText = document.getElementById("btnText");

    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.innerText = "Computing Data...";

    const universitySelector = document.getElementById('universitySelector');

    let payload = {
        "university_code": universitySelector ? universitySelector.value : 'UG',
        "Core Mathematics": document.getElementById("Core Mathematics").value,
        "English Language": document.getElementById("English Language").value,
        "Integrated Science": document.getElementById("Integrated Science").value,
        "Social Studies": document.getElementById("Social Studies").value,
        "el1_name": document.getElementById("el1_name").value,
        "el1_val": document.getElementById("el1_val").value,
        "el2_name": document.getElementById("el2_name").value,
        "el2_val": document.getElementById("el2_val").value,
        "el3_name": document.getElementById("el3_name").value,
        "el3_val": document.getElementById("el3_val").value,
        "el4_name": document.getElementById("el4_name") ? document.getElementById("el4_name").value : "",
        "el4_val": document.getElementById("el4_val") ? document.getElementById("el4_val").value : ""
    };

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Smooth loading visual

        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        displayResults(data, payload.university_code);
    } catch (err) {
        console.error("Prediction engine error:", err);
    } finally {
        if (btn) btn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.innerText = "Analyze Eligibility";
    }
});

function displayResults(data, uniCode) {
    const container = document.getElementById("results-container");
    const summaryAgg = document.getElementById("summary-aggregate");
    const summaryUni = document.getElementById("summary-uni");
    const searchInput = document.getElementById("results-search");

    if (!container) return;

    lastEligiblePrograms = data.eligible_programs || [];
    lastPredictionCode = uniCode;

    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (summaryUni) summaryUni.innerText = summaryLabelFor(uniCode);
    if (summaryAgg) {
        summaryAgg.innerText = lastEligiblePrograms.length > 0
            ? lastEligiblePrograms[0].student_aggregate
            : "N/A";
    }

    // A fresh prediction starts from an unfiltered list.
    if (searchInput) searchInput.value = "";
    activeBandFilter = "";
    renderBandFilter();
    renderEligibilityResults("");
}

// "" means every band; otherwise one of BAND_ORDER.
let activeBandFilter = "";

function renderBandFilter() {
    const container = document.getElementById("band-filter");
    if (!container || lastEligiblePrograms === null) return;

    const counts = BAND_ORDER.reduce((acc, band) => {
        acc[band] = lastEligiblePrograms.filter(prog => prog.band === band).length;
        return acc;
    }, {});

    const buttons = [{ value: "", label: "All", n: lastEligiblePrograms.length }]
        .concat(BAND_ORDER.map(band => ({ value: band, label: band, n: counts[band] })));

    container.innerHTML = buttons.map(btn => `
        <button type="button" class="band-tab flex-1 h-10 rounded-lg font-bold text-xs sm:text-sm transition-all px-2"
                data-band="${escapeHtml(btn.value)}" aria-selected="${btn.value === activeBandFilter}"
                ${btn.n === 0 && btn.value !== "" ? "disabled" : ""}>
            ${escapeHtml(btn.label)} (${btn.n})
        </button>`).join("");

    container.querySelectorAll("button[data-band]").forEach(button => {
        button.addEventListener("click", () => {
            activeBandFilter = button.getAttribute("data-band");
            const searchInput = document.getElementById("results-search");
            renderBandFilter();
            renderEligibilityResults(searchInput ? searchInput.value : "");
        });
    });
}

function renderEligibilityResults(query) {
    const list = document.getElementById("results-list");
    const count = document.getElementById("match-count");
    if (!list || !count || lastEligiblePrograms === null) return;

    const term = query.trim().toLowerCase();
    const total = lastEligiblePrograms.length;
    const visible = lastEligiblePrograms.filter(prog =>
        (!term || prog.program_name.toLowerCase().includes(term)) &&
        (!activeBandFilter || prog.band === activeBandFilter)
    );

    // No qualifying programs at all — distinct from "filters matched nothing".
    if (total === 0) {
        count.innerText = "0 Found";
        count.className = "bg-error-container-strong text-on-error-container px-4 py-1 rounded-full font-bold text-sm";
        list.innerHTML = `
            <div class="md:col-span-2 bg-error-container border border-error-outline text-on-error-container p-6 rounded-xl">
                <div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined">warning</span><strong class="text-lg">No matches found</strong></div>
                <p>You either missed a mandatory subject requirement or do not meet the minimum aggregate cuts for this institution.</p>
            </div>`;
        return;
    }

    const filtering = Boolean(term || activeBandFilter);
    count.innerText = filtering ? `${visible.length} of ${total} Found` : `${total} Found`;
    count.className = "bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-bold text-sm";

    if (visible.length === 0) {
        const what = term ? `matches <strong>"${escapeHtml(query.trim())}"</strong>` : "";
        const band = activeBandFilter ? `in the <strong>${escapeHtml(activeBandFilter)}</strong> band` : "";
        list.innerHTML = `
            <div class="md:col-span-2 bg-surface-container-low border border-outline-variant text-on-surface-variant p-6 rounded-xl text-center">
                <span class="material-symbols-outlined text-3xl mb-2">search_off</span>
                <p>No qualified programme ${[what, band].filter(Boolean).join(" ")}.</p>
            </div>`;
        return;
    }

    list.innerHTML = visible.map(prog => {
        const notEligible = prog.eligible === false;
        const open = isOpenEntry(prog);

        return `
        <div class="result-card card-lift border-l-4 ${notEligible ? "border-l-error-outline" : "border-l-primary"} p-5 border-y border-r border-outline-variant rounded-xl overflow-hidden relative">
            <div class="flex justify-between items-start gap-2 mb-3">
                ${lastPredictionCode
                    ? logoBadge(lastPredictionCode, 40)
                    : `<span class="material-symbols-outlined ${notEligible ? "text-on-error-container bg-error-container" : "text-primary bg-primary-fixed"} p-2 rounded-lg">school</span>`}
                ${bandBadge(prog.band)}
            </div>

            <h3 class="text-lg font-bold text-on-surface mb-1 leading-tight">${escapeHtml(prog.program_name)}</h3>
            <p class="text-sm text-on-surface-variant mb-4">${escapeHtml(prog.university)}</p>

            ${notEligible ? `
            <p class="text-xs font-bold text-on-error-container bg-error-container border border-error-outline rounded-lg px-3 py-2 mb-4">
                You do not qualify yet — your aggregate is ${Math.abs(prog.margin)} point${Math.abs(prog.margin) === 1 ? "" : "s"} above this cut-off.
            </p>` : ""}

            <div class="flex items-center gap-6 pt-3 border-t border-outline-variant">
                <div>
                    <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Your Score</span>
                    <span class="text-2xl font-bold text-primary">${escapeHtml(prog.student_aggregate)}</span>
                </div>
                <div class="h-10 w-px bg-outline-variant"></div>
                <div>
                    <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Cut-off</span>
                    <span class="text-2xl font-bold text-on-surface-variant">${formatCutoff(prog)}</span>
                </div>
                <div class="h-10 w-px bg-outline-variant"></div>
                <div>
                    <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Margin</span>
                    <span class="text-2xl font-bold text-on-surface-variant" ${open ? 'title="No aggregate bar, so there is no margin to measure."' : ""}>${open ? "—" : `${prog.margin >= 0 ? "+" : ""}${escapeHtml(prog.margin)}`}</span>
                </div>
            </div>

            ${improvementTip(prog)}

            <div class="pt-4 mt-4 border-t border-outline-variant">
                ${requirementsSection(prog.requirements)}
            </div>

            <div>${cutoffSourceBadge(prog.cutoff_source)}${cutoffCaveat(prog.cutoff_source)}</div>
        </div>`;
    }).join("");
}

const resultsSearch = document.getElementById("results-search");
if (resultsSearch) {
    resultsSearch.addEventListener("input", event => renderEligibilityResults(event.target.value));
}

// ---------------------------------------------------------------------------
// Browse mode
// ---------------------------------------------------------------------------

// null = nothing loaded yet; an array = catalogue ready for the chosen school.
let browsePrograms = null;

// How much a cut-off can actually be trusted. Only ~21% of seeded programmes have a
// real published cut-off; the rest are their university's site-wide entry minimum,
// which means "clears the minimum bar", not "would be admitted". Showing both
// identically would overstate a student's chances, so every card is labelled.
const CUTOFF_SOURCE_BADGES = {
    published: {
        label: "Competitive cut-off",
        icon: "verified",
        className: "bg-primary-fixed text-primary",
        tooltip: "A real cut-off aggregate published by the university for this specific programme."
    },
    general_ceiling: {
        label: "General entry ceiling",
        icon: "info",
        className: "bg-warning-container text-on-warning-container border border-warning-outline",
        tooltip: "This university publishes no cut-off for this programme, so this is its site-wide minimum entry aggregate. Meeting it means you clear the minimum entry requirement — not that you would be admitted. The real departmental cut-off is likely lower (more competitive)."
    },
    unverified: {
        label: "Unverified cut-off",
        icon: "help",
        className: "bg-surface-container-low text-on-surface-variant border border-outline-variant",
        tooltip: "This cut-off predates our sourcing records and has not been traced to an official university publication."
    }
};

function cutoffSourceBadge(source) {
    const meta = CUTOFF_SOURCE_BADGES[source] || CUTOFF_SOURCE_BADGES.unverified;
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${meta.className}" title="${escapeHtml(meta.tooltip)}">
                <span class="material-symbols-outlined text-[13px]">${meta.icon}</span>${escapeHtml(meta.label)}
            </span>`;
}

// How comfortably the student clears each cut-off. Computed server-side by
// eligibility_engine.classify_band() so the UI never re-derives the rule.
const BAND_BADGES = {
    Safe: {
        icon: "shield_person",
        className: "bg-success-container text-on-success-container",
        tooltip: "Your aggregate is at least 3 points better than this cut-off."
    },
    Competitive: {
        icon: "target",
        className: "bg-primary-fixed text-primary",
        tooltip: "You clear this cut-off, but only just — within 3 points. Treat it as contested."
    },
    Reach: {
        icon: "trending_up",
        className: "bg-warning-container text-on-warning-container border border-warning-outline",
        tooltip: "This university publishes no real cut-off for this programme, so clearing the minimum entry bar does not mean you would be admitted. The actual departmental cut-off is unknown and likely more competitive."
    }
};

BAND_BADGES["Near Miss"] = {
    icon: "notifications_active",
    className: "bg-error-container-strong text-on-error-container border border-error-outline",
    tooltip: "You do NOT currently qualify for this programme — your aggregate is just above its cut-off. It is listed because a single grade improvement would close the gap."
};

const BAND_ORDER = ["Safe", "Competitive", "Reach", "Near Miss"];

// Diploma entry publishes no aggregate bar, encoded as the maximum possible
// aggregate (54). Showing a student "CUT-OFF 54" reads as a real threshold, so
// label it for what it is.
const OPEN_ENTRY_AGGREGATE = 54;

function isOpenEntry(prog) {
    const cutoff = prog.cutoff !== undefined ? prog.cutoff : prog.cutoff_aggregate;
    return cutoff >= OPEN_ENTRY_AGGREGATE && prog.cutoff_source === "general_ceiling";
}

function formatCutoff(prog) {
    const cutoff = prog.cutoff !== undefined ? prog.cutoff : prog.cutoff_aggregate;
    return isOpenEntry(prog) ? "Open" : escapeHtml(cutoff);
}

function bandBadge(band) {
    const meta = BAND_BADGES[band];
    if (!meta) return "";
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${meta.className}" title="${escapeHtml(meta.tooltip)}">
                <span class="material-symbols-outlined text-[13px]">${meta.icon}</span>${escapeHtml(band)}
            </span>`;
}

// The single grade upgrade that would close the gap, computed server-side by
// eligibility_engine.suggest_improvement().
function improvementTip(prog) {
    const tip = prog.improvement;
    if (!tip) return "";

    const goal = tip.goal === "qualify"
        ? "would make you eligible"
        : "would move this into the Safe band";

    return `<div class="mt-4 flex items-start gap-2 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2">
                <span class="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">lightbulb</span>
                <p class="text-xs text-on-surface-variant leading-snug">
                    <strong class="text-on-surface">Tip:</strong>
                    upgrading <strong class="text-on-surface">${escapeHtml(tip.subject)}</strong>
                    from ${escapeHtml(tip.from_grade)} to ${escapeHtml(tip.to_grade)}
                    cuts your aggregate to <strong class="text-on-surface">${escapeHtml(tip.new_aggregate)}</strong>, which ${goal}.
                </p>
            </div>`;
}

function cutoffCaveat(source) {
    if (source !== "general_ceiling") return "";
    return `<p class="text-[11px] text-on-surface-variant mt-2 leading-snug">
                Minimum university entry threshold — not a guaranteed departmental cut-off.
            </p>`;
}

function subjectChip(subject, grade) {
    return `<span class="inline-flex items-center gap-1 bg-surface-container-low border border-outline-variant rounded-md px-2 py-1 text-xs">
                ${escapeHtml(subject)}
                <strong class="text-primary">${escapeHtml(grade || "C6")}</strong>
            </span>`;
}

function subjectChips(requirementList, emptyText) {
    if (!Array.isArray(requirementList) || requirementList.length === 0) {
        return `<span class="text-xs text-on-surface-variant italic">${escapeHtml(emptyText)}</span>`;
    }

    return requirementList.map(req => subjectChip(req.subject, req.minimum_grade)).join("");
}

function requirementGroup(label, chipsHtml) {
    return `<div class="mb-3">
                <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1.5">${escapeHtml(label)}</span>
                <div class="flex flex-wrap gap-1.5">${chipsHtml}</div>
            </div>`;
}

// Shared by the eligibility result cards and the Browse catalogue so both present
// requirements identically. `elective_options` is rendered as its own "Any N of"
// group — without it, an OR-shaped rule (UHAS Medicine, UMaT's substitutable third
// elective) would look like it had no elective requirement at all.
function requirementsSection(requirements) {
    const reqs = requirements || {};
    const options = reqs.elective_options;

    let html = requirementGroup(
        "Required cores",
        subjectChips(reqs.mandatory_cores, "Standard core subjects")
    );

    const hasOptions = options && Array.isArray(options.subjects) && options.subjects.length > 0;
    const hasNamedElectives = Array.isArray(reqs.mandatory_electives) && reqs.mandatory_electives.length > 0;

    // With a pool present, an empty mandatory list means "no *additional* subject",
    // not "anything goes" — word it so the two groups read together.
    html += requirementGroup(
        "Required electives",
        subjectChips(
            reqs.mandatory_electives,
            hasOptions ? "None beyond the pool below" : "Any 3 passing electives"
        )
    );

    if (hasOptions) {
        const needed = options.minimum_required || options.subjects.length;
        const grade = options.minimum_grade || "C6";
        html += requirementGroup(
            `Any ${needed} of these`,
            options.subjects.map(subject => subjectChip(subject, grade)).join("")
        );
    }

    return html;
}

async function loadBrowsePrograms(uniCode) {
    const container = document.getElementById("browse-container");
    const list = document.getElementById("browse-list");
    const heading = document.getElementById("browse-heading");
    const count = document.getElementById("browse-count");
    const searchInput = document.getElementById("browse-search");

    if (!container || !list) return;

    if (!uniCode) {
        // Back to the placeholder option — clear the catalogue entirely.
        browsePrograms = null;
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    if (searchInput) searchInput.value = "";
    if (count) count.innerText = "Loading…";
    list.innerHTML = `
        <div class="md:col-span-2 text-center text-on-surface-variant p-8">
            <span class="material-symbols-outlined animate-spin text-3xl">sync</span>
            <p class="mt-2">Fetching programmes…</p>
        </div>`;

    try {
        const response = await fetch(`/api/programs/${encodeURIComponent(uniCode)}`);
        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        browsePrograms = data.programs || [];
        if (heading) heading.innerText = data.region ? `${data.university} — ${data.region}` : data.university;
        renderBrowsePrograms("");
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        console.error("Programme catalogue error:", err);
        browsePrograms = null;
        if (count) count.innerText = "Error";
        list.innerHTML = `
            <div class="md:col-span-2 bg-error-container border border-error-outline text-on-error-container p-6 rounded-xl">
                <div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined">error</span><strong class="text-lg">Could not load programmes</strong></div>
                <p>Please check your connection and try selecting the institution again.</p>
            </div>`;
    }
}

function renderBrowsePrograms(query) {
    const list = document.getElementById("browse-list");
    const count = document.getElementById("browse-count");
    if (!list || !count || browsePrograms === null) return;

    const term = query.trim().toLowerCase();
    const total = browsePrograms.length;
    const visible = term
        ? browsePrograms.filter(prog => prog.program_name.toLowerCase().includes(term))
        : browsePrograms;

    count.innerText = term ? `${visible.length} of ${total} Programmes` : `${total} Programmes`;
    count.className = "bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-bold text-sm";

    if (visible.length === 0) {
        list.innerHTML = `
            <div class="md:col-span-2 bg-surface-container-low border border-outline-variant text-on-surface-variant p-6 rounded-xl text-center">
                <span class="material-symbols-outlined text-3xl mb-2">search_off</span>
                <p>No programme matches <strong>"${escapeHtml(query.trim())}"</strong>.</p>
            </div>`;
        return;
    }

    list.innerHTML = visible.map(prog => {
        const reqs = prog.requirements || {};
        const pool = reqs.elective_category_pool || "Any";

        return `
        <div class="card-lift border-l-4 border-l-secondary-container p-5 border-y border-r border-outline-variant rounded-xl">
            <div class="flex justify-between items-start gap-3 mb-3">
                <h3 class="text-lg font-bold text-on-surface leading-tight">${escapeHtml(prog.program_name)}</h3>
                <div class="text-right shrink-0">
                    <span class="text-xs text-on-surface-variant block uppercase tracking-wider">Cut-off</span>
                    <span class="text-2xl font-bold text-primary">${formatCutoff(prog)}</span>
                </div>
            </div>

            <div class="mb-3">${cutoffSourceBadge(prog.cutoff_source)}${cutoffCaveat(prog.cutoff_source)}</div>

            ${requirementsSection(reqs)}

            <div class="pt-3 border-t border-outline-variant flex items-center gap-2 text-xs text-on-surface-variant">
                <span class="material-symbols-outlined text-[16px]">category</span>
                Elective pool: <strong class="text-on-surface">${escapeHtml(pool)}</strong>
            </div>
        </div>`;
    }).join("");
}

const browseSelector = document.getElementById("browseUniversitySelector");
if (browseSelector) {
    browseSelector.addEventListener("change", event => loadBrowsePrograms(event.target.value));
}

const browseSearch = document.getElementById("browse-search");
if (browseSearch) {
    browseSearch.addEventListener("input", event => renderBrowsePrograms(event.target.value));
}

// ---------------------------------------------------------------------------
// Shareable links: encode the form state in the URL so a student can save or
// send their result and have it reproduce exactly.
// ---------------------------------------------------------------------------

// Short query keys, mapped to the element ids they populate.
const SHARE_PARAMS = {
    uni: "universitySelector",
    eng: "English Language",
    math: "Core Mathematics",
    sci: "Integrated Science",
    soc: "Social Studies"
};

function readFormState() {
    const state = {};

    Object.entries(SHARE_PARAMS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el && el.value) state[key] = el.value;
    });

    for (let i = 1; i <= 4; i++) {
        const name = document.getElementById(`el${i}_name`);
        const grade = document.getElementById(`el${i}_val`);
        if (name && grade && name.value && grade.value) {
            state[`elec${i}_name`] = name.value;
            state[`elec${i}_grade`] = grade.value;
        }
    }

    return state;
}

function buildShareUrl() {
    const params = new URLSearchParams(readFormState());
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// Returns true when the URL carried enough state to run a prediction.
function hydrateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return false;

    // Only accept values the dropdowns actually offer, so a hand-edited or
    // truncated link can never inject an unselectable option.
    const setIfValid = (id, value) => {
        const el = document.getElementById(id);
        if (!el || !value) return false;
        const allowed = [...el.options].some(option => option.value === value);
        if (allowed) el.value = value;
        return allowed;
    };

    let filled = 0;
    Object.entries(SHARE_PARAMS).forEach(([key, id]) => {
        if (params.has(key) && setIfValid(id, params.get(key))) filled++;
    });

    for (let i = 1; i <= 4; i++) {
        const name = params.get(`elec${i}_name`);
        const grade = params.get(`elec${i}_grade`);
        if (name && grade) {
            const okName = setIfValid(`el${i}_name`, name);
            const okGrade = setIfValid(`el${i}_val`, grade);
            if (okName && okGrade) filled++;
        }
    }

    // Needs the three universal cores plus three electives to be worth running.
    return filled >= 6;
}

let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.innerText = message;
    toast.classList.remove("hidden");
    // Force a reflow so the transition replays on repeated clicks.
    void toast.offsetWidth;
    toast.classList.add("toast-visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("toast-visible");
        setTimeout(() => toast.classList.add("hidden"), 300);
    }, 2600);
}

async function copyShareLink() {
    const url = buildShareUrl();

    try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!");
    } catch (err) {
        // Clipboard API needs a secure context and permission; fall back to a
        // selectable temporary field so the link is never simply lost.
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        let copied = false;
        try {
            copied = document.execCommand("copy");
        } catch (fallbackError) {
            copied = false;
        }
        document.body.removeChild(field);
        showToast(copied ? "Link copied to clipboard!" : "Could not copy — check the address bar.");
    }

    // Reflect the shared state in the address bar so a manual copy works too.
    window.history.replaceState({}, "", url);
}

const shareButton = document.getElementById("shareBtn");
if (shareButton) shareButton.addEventListener("click", copyShareLink);

const printButton = document.getElementById("printBtn");
if (printButton) printButton.addEventListener("click", () => window.print());

// Run last, once every dropdown has been populated.
if (hydrateFromUrl()) {
    const form = document.getElementById("gradeForm");
    if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

// ===========================================================================
// Multi-view navigation (hash routing)
// ===========================================================================
const VIEWS = ["home", "predict", "directory", "calculator", "faq", "about"];
const DEFAULT_VIEW = "home";

function currentViewFromHash() {
    const hash = window.location.hash.replace("#", "");
    return VIEWS.includes(hash) ? hash : DEFAULT_VIEW;
}

function showView(name, { scroll = true } = {}) {
    const view = VIEWS.includes(name) ? name : DEFAULT_VIEW;

    VIEWS.forEach(candidate => {
        const panel = document.getElementById(`view-${candidate}`);
        if (!panel) return;
        const active = candidate === view;
        panel.classList.toggle("hidden", !active);
        // Re-trigger the entrance animation on each activation.
        panel.classList.remove("view-enter");
        if (active) {
            void panel.offsetWidth;
            panel.classList.add("view-enter");
        }
    });

    // Both the desktop bar and the mobile drawer share the nav-link markup.
    document.querySelectorAll("#view-nav [data-view], #drawer-nav [data-view]").forEach(link => {
        if (link.getAttribute("data-view") === view) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    closeDrawer();

    // Lazily build the heavier views the first time they are opened.
    if (view === "directory") renderDirectory();
    if (view === "calculator") buildCalculator();
    if (view === "faq") buildFaq();

    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("hashchange", () => showView(currentViewFromHash()));

// ===========================================================================
// Institution summaries — shared by the marquee and the directory
// ===========================================================================
let universitySummaries = null;

async function loadUniversitySummaries() {
    if (universitySummaries) return universitySummaries;

    const response = await fetch("/api/universities");
    const data = await response.json();
    if (!response.ok || data.status !== "success") throw new Error("Could not load institutions");

    // Merge the API's live counts with the frontend's presentation metadata.
    universitySummaries = data.universities.map(row => {
        const meta = UNIVERSITIES.find(uni => uni.code === row.university_code) || {};
        return { ...row, type: meta.type || "Public", label: meta.summaryLabel || row.university };
    });

    paintMetrics(data.university_count, data.program_count);

    return universitySummaries;
}

function cutoffRangeText(row) {
    if (!row.published_cutoff_count) return "No published cut-offs";
    if (row.cutoff_min === row.cutoff_max) return `Cut-off ${row.cutoff_min}`;
    return `Cut-offs ${row.cutoff_min}–${row.cutoff_max}`;
}

// ===========================================================================
// Infinite marquee
// ===========================================================================
// Institutional colours for the crest monograms. These are recognisable brand
// colours, not reproductions of the universities' actual crests — real crests are
// trademarked artwork we have no licence to embed.
const CREST_COLOURS = {
    UG:       { bg: "#001e40", fg: "#fecb00" },
    KNUST:    { bg: "#0b5d3b", fg: "#ffd200" },
    UCC:      { bg: "#1b3a8f", fg: "#ffffff" },
    UEW:      { bg: "#0f6466", fg: "#ffffff" },
    UDS:      { bg: "#6b4423", fg: "#f5d76e" },
    UPSA:     { bg: "#12275c", fg: "#e8b800" },
    UHAS:     { bg: "#00695f", fg: "#ffffff" },
    UMAT:     { bg: "#7a1420", fg: "#f0c419" },
    UENR:     { bg: "#2e7d32", fg: "#ffffff" },
    AAMUSTED: { bg: "#5b1a35", fg: "#f2c14e" },
    ATU:      { bg: "#0b4f8a", fg: "#ffffff" },
    GCTU:     { bg: "#4a2c82", fg: "#ffffff" },
    ASHESI:   { bg: "#7f1d1d", fg: "#ffffff" },
    VVU:      { bg: "#1b6b3a", fg: "#ffffff" },
};

const CREST_FALLBACK = { bg: "#43474f", fg: "#ffffff" };

// Adding a university later means dropping <shortcode>.png into this folder —
// no JavaScript change required.
function logoPath(code) {
    return `/static/images/logos/${String(code).toLowerCase()}.png`;
}

// The real logo sits on top of the generated monogram. If the file is missing or
// fails to load, `this.remove()` drops the <img> and the monogram underneath
// becomes visible — a graceful fallback with no innerHTML string-escaping.
function logoBadge(code, size = 40) {
    return `
    <span class="logo-badge shrink-0 relative inline-flex items-center justify-center rounded-lg overflow-hidden bg-surface-container-low border border-outline-variant"
          style="width:${size}px;height:${size}px;">
        ${crestSvg(code, size - 6)}
        <img src="${escapeHtml(logoPath(code))}" alt="${escapeHtml(code)} logo" decoding="async"
             onerror="this.remove()"
             class="absolute inset-0 w-full h-full object-contain p-1"/>
    </span>`;
}

// A monogram crest: the first two letters of the short code on the institution's
// colour, drawn as SVG so it stays crisp at any density.
function crestSvg(code, size = 34) {
    const palette = CREST_COLOURS[code] || CREST_FALLBACK;
    const initials = String(code).slice(0, 2).toUpperCase();

    return `
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" role="img" aria-label="${escapeHtml(code)} crest" class="shrink-0">
        <rect width="40" height="40" rx="10" fill="${palette.bg}"/>
        <path d="M20 4 L34 9 v11 c0 8-6 14-14 16 C12 34 6 28 6 20 V9 Z" fill="${palette.fg}" opacity="0.14"/>
        <text x="20" y="20" text-anchor="middle" dominant-baseline="central"
              font-family="Inter, sans-serif" font-size="15" font-weight="800" fill="${palette.fg}">${escapeHtml(initials)}</text>
    </svg>`;
}

// Programme counts are generalised so the copy stays evergreen as schools are
// added, and rounded DOWN so the figure is never an overstatement.
function generaliseCount(value, step = 10) {
    const floored = Math.floor(value / step) * step;
    return floored >= step ? `${floored}+` : `${value}`;
}

function programmeCountLabel(row) {
    if (row.program_count >= 20) return `${generaliseCount(row.program_count, 10)} Programmes`;
    return "Accredited Degrees & Diplomas";
}

function marqueeCard(row) {
    return `
    <button type="button" class="marquee-card pressable shrink-0 w-64 text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-4"
            data-code="${escapeHtml(row.university_code)}" title="View ${escapeHtml(row.university)} programmes">
        <div class="flex items-center gap-2.5 mb-2.5">
            ${logoBadge(row.university_code, 40)}
            <span class="text-lg font-bold text-primary leading-none">${escapeHtml(row.university_code)}</span>
            <span class="ml-auto text-[10px] font-bold uppercase tracking-wider bg-surface-container-low text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5">${escapeHtml(row.region)}</span>
        </div>
        <p class="text-xs text-on-surface leading-snug mb-2 line-clamp-2 h-8 overflow-hidden">${escapeHtml(row.university)}</p>
        <p class="text-xs font-bold text-on-surface-variant">${escapeHtml(programmeCountLabel(row))}</p>
    </button>`;
}

async function buildMarquee() {
    const tracks = [document.getElementById("marquee-track"), document.getElementById("home-marquee-track")]
        .filter(Boolean);
    if (!tracks.length) return;

    let rows;
    try {
        rows = await loadUniversitySummaries();
    } catch (err) {
        console.error("Marquee load failed:", err);
        tracks.forEach(track => track.closest(".marquee").classList.add("hidden"));
        return;
    }

    // Two identical copies so the -50% translation loops seamlessly.
    const cards = rows.map(marqueeCard).join("");

    tracks.forEach(track => {
        track.innerHTML = cards + cards;
        // Duration scales with content so speed stays constant regardless of count.
        track.style.animationDuration = `${Math.max(30, rows.length * 4)}s`;
        track.addEventListener("click", event => {
            const card = event.target.closest("[data-code]");
            if (card) openCatalogue(card.getAttribute("data-code"));
        });
    });
}

// Jump to a school's catalogue in Browse mode from anywhere in the app.
function openCatalogue(code) {
    showView("predict", { scroll: false });
    activateMode("browse");

    const region = document.getElementById("browseRegionSelector");
    if (region) {
        region.value = "";
        populateUniversitySelect(document.getElementById("browseUniversitySelector"), "Select an institution…", "");
    }

    const select = document.getElementById("browseUniversitySelector");
    if (!select) return;
    select.value = code;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    // loadBrowsePrograms scrolls to the results itself once the fetch resolves.
}

// ===========================================================================
// University Directory
// ===========================================================================
let directoryFilter = "";
let directoryBuilt = false;

const DIRECTORY_TYPES = ["Public", "Technical", "Private"];

async function renderDirectory() {
    const grid = document.getElementById("directory-grid");
    const filterBar = document.getElementById("directory-filter");
    if (!grid) return;

    let rows;
    try {
        rows = await loadUniversitySummaries();
    } catch (err) {
        grid.innerHTML = `<p class="text-on-error-container">Could not load institutions. Please refresh.</p>`;
        return;
    }

    if (filterBar && !directoryBuilt) {
        const counts = { "": rows.length };
        DIRECTORY_TYPES.forEach(t => { counts[t] = rows.filter(r => r.type === t).length; });
        filterBar.innerHTML = [{ value: "", label: "All" }]
            .concat(DIRECTORY_TYPES.map(t => ({ value: t, label: t })))
            .map(btn => `
                <button type="button" class="band-tab px-4 h-10 rounded-lg font-bold text-sm border border-outline-variant"
                        data-type="${escapeHtml(btn.value)}" aria-selected="${btn.value === directoryFilter}">
                    ${escapeHtml(btn.label)} (${counts[btn.value]})
                </button>`).join("");

        filterBar.querySelectorAll("button[data-type]").forEach(button => {
            button.addEventListener("click", () => {
                directoryFilter = button.getAttribute("data-type");
                filterBar.querySelectorAll("button[data-type]").forEach(b =>
                    b.setAttribute("aria-selected", String(b.getAttribute("data-type") === directoryFilter)));
                paintDirectory(rows);
            });
        });
        directoryBuilt = true;
    }

    paintDirectory(rows);
}

function paintDirectory(rows) {
    const grid = document.getElementById("directory-grid");
    const visible = directoryFilter ? rows.filter(row => row.type === directoryFilter) : rows;

    grid.innerHTML = visible.map(row => `
        <div class="uni-card bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col"
             style="box-shadow: var(--shadow-soft);">
            <div class="flex items-start justify-between gap-2 mb-3">
                <span class="flex items-center gap-2.5">
                    ${logoBadge(row.university_code, 40)}
                    <span class="text-xl font-bold text-primary">${escapeHtml(row.university_code)}</span>
                </span>
                <span class="text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-primary rounded px-2 py-1">${escapeHtml(row.type)}</span>
            </div>

            <h3 class="font-bold text-on-surface leading-snug mb-3 flex-grow">${escapeHtml(row.university)}</h3>

            <div class="space-y-1.5 text-xs text-on-surface-variant mb-4">
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">location_on</span>${escapeHtml(row.region)} Region</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">menu_book</span>${row.program_count} programmes${row.diploma_count ? ` · ${row.diploma_count} diploma` : ""}</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">bar_chart</span>${escapeHtml(cutoffRangeText(row))}</p>
            </div>

            <button type="button" class="pressable w-full h-10 rounded-lg bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-1.5"
                    data-open-catalogue="${escapeHtml(row.university_code)}">
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span> View Catalogue
            </button>
        </div>`).join("");

    grid.querySelectorAll("[data-open-catalogue]").forEach(button => {
        button.addEventListener("click", () => openCatalogue(button.getAttribute("data-open-catalogue")));
    });
}

// ===========================================================================
// Standalone aggregate calculator
// ===========================================================================
const CALC_CORES = ["English Language", "Core Mathematics", "Integrated Science", "Social Studies"];
const GRADE_POINTS = { A1: 1, B2: 2, B3: 3, C4: 4, C5: 5, C6: 6, D7: 7, E8: 8, F9: 9 };
let calculatorBuilt = false;

function calcRow(label, id, isElective) {
    const options = isElective
        ? `<option value="">Select subject</option>` + electivesList.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")
        : "";
    const gradeOptions = `<option value="">Grade</option>` +
        Object.keys(GRADE_POINTS).map(g => `<option value="${g}">${g}</option>`).join("");

    return `
    <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-on-surface-variant" for="${id}_grade">${escapeHtml(label)}</label>
        <div class="${isElective ? "grid grid-cols-2 gap-2" : ""}">
            ${isElective ? `<select id="${id}_name" class="h-10 rounded-lg border-outline-variant bg-surface-container-lowest text-sm">${options}</select>` : ""}
            <select id="${id}_grade" class="h-10 w-full rounded-lg border-outline-variant bg-surface-container-lowest text-sm">${gradeOptions}</select>
        </div>
    </div>`;
}

function buildCalculator() {
    if (calculatorBuilt) return;

    const cores = document.getElementById("calc-cores");
    const electives = document.getElementById("calc-electives");
    if (!cores || !electives) return;

    cores.innerHTML = CALC_CORES.map((name, i) => calcRow(name, `calc_core${i}`, false)).join("");
    electives.innerHTML = [1, 2, 3].map(i => calcRow(`Elective ${i}`, `calc_el${i}`, true)).join("");

    document.querySelectorAll("#calc-cores select, #calc-electives select")
        .forEach(select => select.addEventListener("change", runCalculator));

    calculatorBuilt = true;
    runCalculator();
}

function runCalculator() {
    const box = document.getElementById("calc-result");
    if (!box) return;

    const grade = id => document.getElementById(id) ? document.getElementById(id).value : "";
    const points = value => GRADE_POINTS[value];

    const english = points(grade("calc_core0_grade"));
    const maths = points(grade("calc_core1_grade"));
    const science = points(grade("calc_core2_grade"));
    const social = points(grade("calc_core3_grade"));
    const electives = [1, 2, 3].map(i => points(grade(`calc_el${i}_grade`))).filter(Boolean);

    const missing = [];
    if (!english) missing.push("English");
    if (!maths) missing.push("Core Maths");
    if (!science && !social) missing.push("Integrated Science or Social Studies");
    if (electives.length < 3) missing.push(`${3 - electives.length} more elective grade(s)`);

    if (missing.length) {
        box.innerHTML = `
            <p class="text-sm text-on-surface-variant">Add your grades to see your aggregate.</p>
            <p class="text-xs text-on-surface-variant mt-2">Still needed: ${escapeHtml(missing.join(", "))}</p>`;
        return;
    }

    const bestThree = [...electives].sort((a, b) => a - b).slice(0, 3).reduce((a, b) => a + b, 0);
    // The third core differs by track: science programmes always count Integrated
    // Science, everything else takes whichever of Science/Social Studies is better.
    const generalTotal = english + maths + Math.min(science || 9, social || 9) + bestThree;
    const scienceTotal = science ? english + maths + science + bestThree : null;

    box.innerHTML = `
        <span class="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Your Best-6 aggregate</span>
        <div class="text-6xl font-bold text-primary my-2">${generalTotal}</div>
        <p class="text-sm text-on-surface-variant">General / Arts &amp; Business track — counts the better of Integrated Science and Social Studies.</p>
        ${scienceTotal !== null && scienceTotal !== generalTotal ? `
        <div class="mt-4 pt-4 border-t border-outline-variant">
            <span class="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Science track</span>
            <div class="text-3xl font-bold text-on-surface mt-1">${scienceTotal}</div>
            <p class="text-xs text-on-surface-variant mt-1">Science programmes must count Integrated Science as the third core.</p>
        </div>` : ""}
        <a href="#predict" class="pressable inline-flex items-center gap-1.5 mt-5 h-10 px-4 rounded-lg bg-primary text-on-primary font-bold text-sm">
            <span class="material-symbols-outlined text-[18px]">target</span> Check which programmes accept this
        </a>`;
}

// ===========================================================================
// FAQ
// ===========================================================================
const FAQ_ITEMS = [
    {
        q: "How is the WASSCE aggregate calculated?",
        a: "Your aggregate is the sum of your best six subjects: English Language, Core Mathematics, a third core (Integrated Science or Social Studies), and your three best electives. Grades score A1=1 through F9=9, so a lower aggregate is better. The best possible is 6."
    },
    {
        q: "Why does the third core subject change between programmes?",
        a: "Science, health and engineering programmes must count Integrated Science as the third core. Everything else takes whichever of Integrated Science and Social Studies is better for you. That means the same grades can produce different aggregates at different programmes, which is why we recalculate per programme rather than once."
    },
    {
        q: "What does \"General entry ceiling\" mean on a card?",
        a: "It means that university publishes no cut-off for that programme, so we show its site-wide minimum entry aggregate instead — usually 36. Clearing it means you meet the minimum requirement to apply, not that you would be admitted. The real departmental cut-off is unknown and almost certainly more competitive."
    },
    {
        q: "What is the difference between Safe, Competitive, Reach and Near Miss?",
        a: "Safe means your aggregate is at least 3 points better than the cut-off. Competitive means you clear it by less than 3 points, so the place is contested. Reach means the cut-off is not a real published one, so clearing it proves little. Near Miss means you do not qualify yet — you are within 3 points, and we show the single grade upgrade that would close the gap."
    },
    {
        q: "Can I enter a diploma or HND programme with a D7?",
        a: "Yes. Ghanaian diploma and HND entry is normally advertised as \"passes (A1–D7)\" in the core subjects while still requiring credits (C6 or better) in the electives. Diploma programmes in this app apply that relaxed core rule and carry no aggregate ceiling, which is why their cut-off shows as \"Open\"."
    },
    {
        q: "Can I combine results from two different sittings?",
        a: "Most Ghanaian universities allow you to combine sittings, though some competitive programmes prefer a single sitting and a few discount the second attempt. This tool has no concept of sittings — enter the best grade you hold in each subject, and confirm the combining rule with the specific university before you apply."
    },
    {
        q: "Does qualifying here mean I will be admitted?",
        a: "No. This is a guide, not an admission decision. Cut-offs move year to year with demand, several programmes require entrance examinations or interviews we cannot model, and some universities weigh factors beyond grades entirely. Treat a result as a shortlist, not a promise."
    }
];

let faqBuilt = false;

function buildFaq() {
    const list = document.getElementById("faq-list");
    if (!list || faqBuilt) return;

    list.innerHTML = FAQ_ITEMS.map(item => `
        <details class="faq-item bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <summary class="pressable cursor-pointer list-none p-5 flex items-center justify-between gap-4 font-bold text-on-surface">
                <span>${escapeHtml(item.q)}</span>
                <span class="faq-chevron material-symbols-outlined text-on-surface-variant shrink-0">expand_more</span>
            </summary>
            <div class="faq-answer">
                <div><p class="px-5 pb-5 text-sm text-on-surface-variant leading-relaxed">${escapeHtml(item.a)}</p></div>
            </div>
        </details>`).join("");

    faqBuilt = true;
}

// ---------------------------------------------------------------------------
// Boot the multi-view layer
// ---------------------------------------------------------------------------
showView(currentViewFromHash(), { scroll: false });
buildMarquee();

// ===========================================================================
// Generalised metrics + mobile drawer
// ===========================================================================

// Copy stays evergreen by deriving from live counts rather than hardcoded
// numbers, and always rounds DOWN so a claim is never an overstatement.
function paintMetrics(universityCount, programmeCount) {
    const universities = `${universityCount} Universities`;
    const programmes = `${generaliseCount(programmeCount, 100)} Programmes`;

    const hero = document.getElementById("hero-stats");
    if (hero) hero.innerText = `${universities} · ${programmes} · 100% Free`;

    const banner = document.getElementById("home-metrics");
    if (banner) {
        banner.innerHTML = [universities, programmes, "100% Free &amp; Open Access"]
            .map(text => `<span class="px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant">${text}</span>`)
            .join("");
    }

    document.querySelectorAll('[data-metric="universities"]').forEach(el => { el.innerText = `${universityCount} Ghanaian universities`; });
    document.querySelectorAll('[data-metric="programmes"]').forEach(el => { el.innerText = `${generaliseCount(programmeCount, 100)} accredited programmes`; });
}

// Looked up at call time, not module scope: showView() calls closeDrawer() during
// boot, which would hit the temporal dead zone of a `const` declared down here.
function drawerParts() {
    return {
        panel: document.getElementById("mobile-drawer"),
        backdrop: document.getElementById("drawer-backdrop"),
        toggle: document.getElementById("menuToggle"),
    };
}

function openDrawer() {
    const { panel: drawer, backdrop: drawerBackdrop, toggle } = drawerParts();
    if (!drawer || !drawerBackdrop) return;
    drawer.classList.remove("hidden");
    drawerBackdrop.classList.remove("hidden");
    // Commit the pre-animation position before adding the open class, otherwise
    // the browser collapses both into one frame and nothing appears to move.
    void drawer.offsetWidth;
    drawer.classList.add("drawer-open");
    drawerBackdrop.classList.add("drawer-open");
    document.body.style.overflow = "hidden";
    if (toggle) toggle.setAttribute("aria-expanded", "true");
}

function closeDrawer() {
    const { panel: drawer, backdrop: drawerBackdrop, toggle } = drawerParts();
    if (!drawer || !drawerBackdrop || drawer.classList.contains("hidden")) return;
    drawer.classList.remove("drawer-open");
    drawerBackdrop.classList.remove("drawer-open");
    document.body.style.overflow = "";
    if (toggle) toggle.setAttribute("aria-expanded", "false");

    // Keep it in the DOM until the slide-out finishes, then hide it from
    // assistive tech and tab order.
    setTimeout(() => {
        if (!drawer.classList.contains("drawer-open")) {
            drawer.classList.add("hidden");
            drawerBackdrop.classList.add("hidden");
        }
    }, 240);
}

const menuToggle = document.getElementById("menuToggle");
if (menuToggle) {
    // Toggle, not open-only: the backdrop normally covers this button while the
    // drawer is open, but a second press should never re-open an open drawer.
    menuToggle.addEventListener("click", () => {
        const { panel } = drawerParts();
        if (panel && panel.classList.contains("drawer-open")) closeDrawer();
        else openDrawer();
    });
}

const menuClose = document.getElementById("menuClose");
if (menuClose) menuClose.addEventListener("click", closeDrawer);

const backdropEl = document.getElementById("drawer-backdrop");
if (backdropEl) backdropEl.addEventListener("click", closeDrawer);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDrawer();
});

// Returning to desktop width should never leave a drawer stranded open.
if (window.matchMedia) {
    window.matchMedia("(min-width: 1024px)").addEventListener("change", event => {
        if (event.matches) closeDrawer();
    });
}
