const grades = ["", "A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];
const electivesList = [
    "Accounting", "Akan", "Elective Mathematics", "Agricultural Science", "Animal Husbandry",
    "Applied Technology", "Arabic", "Art and Design Foundation", "Art and Design Studio",
    "Automobile Technology", "Biology", "Biomedical Science", "Building Construction Technology",
    "Business Management", "Chemistry", "Christian Religious Studies (CRS)", "Clothing and Textiles",
    "Computer Science", "Computing / ICT", "Crop Husbandry", "Design & Communication Technology",
    "Economics", "Electrical and Electronic Technology", "Engineering Science", "Financial Accounting",
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
    { code: "UG", dropdownLabel: "University of Ghana (Legon)", summaryLabel: "University of Ghana" },
    { code: "KNUST", dropdownLabel: "Kwame Nkrumah University of Science and Technology (KNUST)", summaryLabel: "KNUST" },
    { code: "UDS", dropdownLabel: "University for Development Studies (UDS)", summaryLabel: "UDS" },
    { code: "UPSA", dropdownLabel: "University of Professional Studies, Accra (UPSA)", summaryLabel: "UPSA" },
    { code: "UCC", dropdownLabel: "University of Cape Coast (UCC)", summaryLabel: "University of Cape Coast" }
];

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

function populateUniversitySelect(select, placeholder) {
    if (!select) return;

    if (placeholder) {
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.text = placeholder;
        select.appendChild(placeholderOption);
    }

    UNIVERSITIES.forEach(uni => {
        const option = document.createElement("option");
        option.value = uni.code;
        option.text = uni.dropdownLabel;
        select.appendChild(option);
    });
}

populateUniversitySelect(document.getElementById("universitySelector"));
populateUniversitySelect(document.getElementById("browseUniversitySelector"), "Select an institution…");

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
        nameSelect.className = "w-full h-10 rounded-lg border-outline-variant focus:border-primary text-sm bg-white";
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
        valSelect.className = "w-full h-10 rounded-lg border-outline-variant focus:border-primary text-sm bg-white";
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
    renderEligibilityResults("");
}

function renderEligibilityResults(query) {
    const list = document.getElementById("results-list");
    const count = document.getElementById("match-count");
    if (!list || !count || lastEligiblePrograms === null) return;

    const term = query.trim().toLowerCase();
    const total = lastEligiblePrograms.length;
    const visible = term
        ? lastEligiblePrograms.filter(prog => prog.program_name.toLowerCase().includes(term))
        : lastEligiblePrograms;

    // No qualifying programs at all — distinct from "search matched nothing".
    if (total === 0) {
        count.innerText = "0 Found";
        count.className = "bg-red-100 text-red-800 px-4 py-1 rounded-full font-bold text-sm";
        list.innerHTML = `
            <div class="md:col-span-2 bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
                <div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined">warning</span><strong class="text-lg">No matches found</strong></div>
                <p>You either failed a mandatory core subject (A1-C6 required) or do not meet the minimum aggregate cuts for this institution.</p>
            </div>`;
        return;
    }

    count.innerText = term ? `${visible.length} of ${total} Found` : `${total} Found`;
    count.className = "bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-bold text-sm";

    if (visible.length === 0) {
        list.innerHTML = `
            <div class="md:col-span-2 bg-surface-container-low border border-outline-variant text-on-surface-variant p-6 rounded-xl text-center">
                <span class="material-symbols-outlined text-3xl mb-2">search_off</span>
                <p>No qualified programme matches <strong>"${escapeHtml(query.trim())}"</strong>.</p>
            </div>`;
        return;
    }

    list.innerHTML = visible.map(prog => `
        <div class="card-lift border-l-4 border-l-primary p-5 border-y border-r border-outline-variant rounded-xl overflow-hidden relative">
            <div class="flex justify-between items-start mb-3">
                <span class="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-lg">school</span>
                <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span> Qualified
                </span>
            </div>

            <h3 class="text-lg font-bold text-on-surface mb-1 leading-tight">${escapeHtml(prog.program_name)}</h3>
            <p class="text-sm text-on-surface-variant mb-4">${escapeHtml(prog.university)}</p>

            <div class="flex items-center gap-6 pt-3 border-t border-outline-variant">
                <div>
                    <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Your Score</span>
                    <span class="text-2xl font-bold text-primary">${escapeHtml(prog.student_aggregate)}</span>
                </div>
                <div class="h-10 w-px bg-outline-variant"></div>
                <div>
                    <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Cut-off</span>
                    <span class="text-2xl font-bold text-on-surface-variant">${escapeHtml(prog.cutoff)}</span>
                </div>
            </div>
        </div>
    `).join("");
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

function subjectChips(requirementList, emptyText) {
    if (!Array.isArray(requirementList) || requirementList.length === 0) {
        return `<span class="text-xs text-on-surface-variant italic">${escapeHtml(emptyText)}</span>`;
    }

    return requirementList.map(req => `
        <span class="inline-flex items-center gap-1 bg-surface-container-low border border-outline-variant rounded-md px-2 py-1 text-xs">
            ${escapeHtml(req.subject)}
            <strong class="text-primary">${escapeHtml(req.minimum_grade || "C6")}</strong>
        </span>`).join("");
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
        if (heading) heading.innerText = data.university;
        renderBrowsePrograms("");
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        console.error("Programme catalogue error:", err);
        browsePrograms = null;
        if (count) count.innerText = "Error";
        list.innerHTML = `
            <div class="md:col-span-2 bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
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
                    <span class="text-2xl font-bold text-primary">${escapeHtml(prog.cutoff_aggregate)}</span>
                </div>
            </div>

            <div class="mb-3">
                <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1.5">Required Cores</span>
                <div class="flex flex-wrap gap-1.5">${subjectChips(reqs.mandatory_cores, "Standard core subjects")}</div>
            </div>

            <div class="mb-3">
                <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1.5">Required Electives</span>
                <div class="flex flex-wrap gap-1.5">${subjectChips(reqs.mandatory_electives, "Any 3 passing electives")}</div>
            </div>

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
