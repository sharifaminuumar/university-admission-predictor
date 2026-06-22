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

// Build Elective Rows cleanly
const electivesContainer = document.getElementById("electives-container");
if (electivesContainer) {
    for (let i = 1; i <= 4; i++) {
        const row = document.createElement("div");
        row.className = "form-group-row";

        const nameSelect = document.createElement("select");
        nameSelect.id = `el${i}_name`;
        if (i < 4) nameSelect.required = true;

        let defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.text = `Select Elective ${i}${i === 4 ? ' (Optional)' : ''}`;
        nameSelect.appendChild(defaultOpt);

        electivesList.forEach(subject => {
            let option = document.createElement("option");
            option.value = subject;
            option.text = subject;
            nameSelect.appendChild(option);
        });

        const valSelect = document.createElement("select");
        valSelect.id = `el${i}_val`;
        if (i < 4) valSelect.required = true;

        grades.forEach(grade => {
            let option = document.createElement("option");
            option.value = grade;
            option.text = grade === "" ? "Grade" : grade;
            valSelect.appendChild(option);
        });

        row.appendChild(nameSelect);
        row.appendChild(valSelect);
        electivesContainer.appendChild(row);
    }
}

document.getElementById("gradeForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    // UI Loading States
    const btn = document.getElementById("submitBtn");
    const spinner = document.getElementById("btnSpinner");
    const btnText = document.getElementById("btnText");

    btn.disabled = true;
    spinner.style.display = "block";
    btnText.innerText = "Computing Best Combinations...";

    let payload = {
        "Core Mathematics": document.getElementById("Core Mathematics").value,
        "English Language": document.getElementById("English Language").value,
        "Integrated Science": document.getElementById("Integrated Science").value,
        "Social Studies": document.getElementById("Social Studies").value
    };

    for (let i = 1; i <= 4; i++) {
        let name = document.getElementById(`el${i}_name`).value;
        let val = document.getElementById(`el${i}_val`).value;
        if (name && val) payload[name] = val;
    }

    try {
        // Artificial 400ms timeout just so the user can see your engine working!
        await new Promise(resolve => setTimeout(resolve, 400));

        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        displayResults(data);
    } catch (err) {
        console.error(err);
    } finally {
        // Reset UI Loading state
        btn.disabled = false;
        spinner.style.display = "none";
        btnText.innerText = "Analyze Eligibility";
    }
});

function displayResults(data) {
    const container = document.getElementById("results-container");
    const list = document.getElementById("results-list");
    const count = document.getElementById("match-count");

    list.innerHTML = "";
    container.style.display = "block";
    container.scrollIntoView({ behavior: 'smooth' });

    if (data.total_matches === 0) {
        count.innerText = "0 Programs Matched";
        list.innerHTML = `<div class="error-item"><strong>No matches found.</strong> You don't meet the baseline cuts or specific core requirements for the programs currently in the system.</div>`;
        return;
    }

    count.innerText = `Matched Programs (${data.total_matches})`;
    data.results.forEach(prog => {
        list.innerHTML += `
            <div class="result-item">
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 4px;">
                    <strong style="font-size:1.1rem; color:var(--text);">${prog.program_name}</strong>
                    <span style="font-size:0.8rem; font-weight:700; background:#fff; padding:2px 8px; border-radius:12px; border:1px solid var(--border);">${prog.type}</span>
                </div>
                <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:8px;">${prog.university}</div>
                <small style="color: #15803d; font-weight:600;">➔ ${prog.reason}</small>
            </div>
        `;
    });
}