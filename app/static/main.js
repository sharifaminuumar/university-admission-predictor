const grades = ["", "A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];
const electivesList = [
    "Accounting", "Elective Mathematics", "Agricultural Science", "Animal Husbandry",
    "Applied Technology", "Arabic", "Art and Design Foundation", "Art and Design Studio",
    "Automobile Technology", "Biology", "Biomedical Science", "Building Construction Technology",
    "Business Management", "Chemistry", "Christian Religious Studies (CRS)", "Clothing and Textiles",
    "Computer Science", "Computing / ICT", "Crop Husbandry", "Design & Communication Technology",
    "Economics", "Electrical and Electronic Technology", "Engineering Science", "Fisheries",
    "Food and Nutrition", "French", "Geography", "Ghanaian Languages", "Government",
    "History", "Horticulture", "Islamic Religious Studies (IRS)", "Literature in English",
    "Management in Living", "Metal Technology", "Performing Arts", "Physical Education and Health",
    "Physics", "Religious and Moral Education (RME)", "Robotics", "Spanish", "Technical Drawing",
    "Wood Technology"
].sort();

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

// Form Submission & API Interaction
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
    const list = document.getElementById("results-list");
    const count = document.getElementById("match-count");
    const summaryAgg = document.getElementById("summary-aggregate");
    const summaryUni = document.getElementById("summary-uni");

    if (!container || !list || !count) return;

    list.innerHTML = "";
    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const programs = data.eligible_programs || [];

    // Set Header UI
    if (summaryUni) {
        if (uniCode === 'UG') summaryUni.innerText = 'University of Ghana';
        else if (uniCode === 'KNUST') summaryUni.innerText = 'Kwame Nkrumah University of Science and Technology';
        else if (uniCode === 'UDS') summaryUni.innerText = 'University for Development Studies';
    }

    if (programs.length === 0) {
        if (summaryAgg) summaryAgg.innerText = "N/A";
        count.innerText = "0 Found";
        count.className = "bg-red-100 text-red-800 px-4 py-1 rounded-full font-bold text-sm";
        list.innerHTML = `
            <div class="md:col-span-2 bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
                <div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined">warning</span><strong class="text-lg">No matches found</strong></div>
                <p>You either failed a mandatory core subject (A1-C6 required) or do not meet the minimum aggregate cuts for this institution.</p>
            </div>`;
        return;
    }

// Safely extract the score exactly like the cards do!
    if (summaryAgg) {
        summaryAgg.innerText = programs.student_aggregate;
    }

    count.innerText = `${programs.length} Found`;
    count.className = "bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-bold text-sm";

    programs.forEach(prog => {
        list.innerHTML += `
            <div class="card-lift border-l-4 border-l-primary p-5 border-y border-r border-outline-variant rounded-xl overflow-hidden relative">
                <div class="flex justify-between items-start mb-3">
                    <span class="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-lg">school</span>
                    <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">check_circle</span> Qualified
                    </span>
                </div>
                
                <h3 class="text-lg font-bold text-on-surface mb-1 leading-tight">${prog.program_name}</h3>
                <p class="text-sm text-on-surface-variant mb-4">${prog.university}</p>
                
                <div class="flex items-center gap-6 pt-3 border-t border-outline-variant">
                    <div>
                        <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Your Score</span>
                        <span class="text-2xl font-bold text-primary">${prog.student_aggregate}</span>
                    </div>
                    <div class="h-10 w-px bg-outline-variant"></div>
                    <div>
                        <span class="text-xs text-on-surface-variant block uppercase tracking-wider mb-1">Cut-off</span>
                        <span class="text-2xl font-bold text-on-surface-variant">${prog.cutoff}</span>
                    </div>
                </div>
            </div>
        `;
    });
}