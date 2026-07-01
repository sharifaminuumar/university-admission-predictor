from flask import Blueprint, request, jsonify, render_template
from .models import Program, University
from .eligibility_engine import evaluate_eligibility

main = Blueprint('main', __name__)


@main.route('/', methods=['GET'])
def index():
    # This will serve our HTML frontend later
    return render_template('index.html')


@main.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}

    selected_uni_code = data.get('university_code', 'UG')

    student_grades = {
        "Core Mathematics": data.get('Core Mathematics'),
        "English Language": data.get('English Language'),
        "Integrated Science": data.get('Integrated Science'),
        "Social Studies": data.get('Social Studies'),
        "Elective 1": data.get('el1_name'), "Elective 1 Grade": data.get('el1_val'),
        "Elective 2": data.get('el2_name'), "Elective 2 Grade": data.get('el2_val'),
        "Elective 3": data.get('el3_name'), "Elective 3 Grade": data.get('el3_val'),
        "Elective 4": data.get('el4_name'), "Elective 4 Grade": data.get('el4_val'),
    }

    # --- WASSCE AGGREGATE CALCULATION ENGINE ---
    grade_scale = {"A1": 1, "B2": 2, "B3": 3, "C4": 4, "C5": 5, "C6": 6, "D7": 7, "E8": 8, "F9": 9}

    # 1. Parse core values (Core Math, English, Integrated Science are mandatory prerequisites)
    core_math_val = grade_scale.get(student_grades.get("Core Mathematics"), 9)
    english_val = grade_scale.get(student_grades.get("English Language"), 9)
    science_val = grade_scale.get(student_grades.get("Integrated Science"), 9)
    social_val = grade_scale.get(student_grades.get("Social Studies"), 9)

    # Base core aggregate uses the 3 mandatory cores
    computed_core_aggregate = core_math_val + english_val + science_val

    # 2. Gather all valid elective scores provided by the student
    elective_values = []
    for i in range(1, 5):
        grade_str = student_grades.get(f"Elective {i} Grade")
        if grade_str in grade_scale:
            elective_values.append(grade_scale[grade_str])

    # Sort electives from best to lowest score (1 is best, 9 is worst)
    elective_values.sort()

    # Take the top 3 best elective values, defaulting to a fallback fail value if missing
    best_three_electives = elective_values[:3]
    while len(best_three_electives) < 3:
        best_three_electives.append(9)

    # Calculate total aggregate score (Best 3 Cores + Best 3 Electives)
    final_calculated_aggregate = computed_core_aggregate + sum(best_three_electives)
    # --------------------------------------------

    all_programs = Program.query.join(University).filter(University.short_code == selected_uni_code).all()
    eligible_list = []

    for program in all_programs:
        program_data_dict = {
            "program_name": program.name,
            "cutoff_aggregate": program.cutoff_aggregate,
            "requirements": program.requirements
        }

        # Run subject eligibility matching filter check
        is_eligible, execution_meta = evaluate_eligibility(student_grades, program_data_dict)

        # 🚨 THE FIX: Ensure the student's numerical aggregate is LESS THAN OR EQUAL TO the cut-off
        if is_eligible and final_calculated_aggregate <= program.cutoff_aggregate:
            eligible_list.append({
                "program_name": program.name,
                "cutoff": program.cutoff_aggregate,
                "student_aggregate": final_calculated_aggregate,
                "university": program.university_data.name
            })

    return jsonify({
        "status": "success",
        "eligible_programs": eligible_list
    })