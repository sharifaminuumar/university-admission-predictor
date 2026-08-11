from flask import Blueprint, request, jsonify, render_template
from .models import Program, University
from .eligibility_engine import evaluate_eligibility, calculate_aggregate, build_subject_portfolio

main = Blueprint('main', __name__)


@main.route('/', methods=['GET'])
def index():
    # This will serve our HTML frontend later
    return render_template('index.html')


@main.route('/api/programs/<uni_code>', methods=['GET'])
def list_programs(uni_code):
    """Browse mode: every program for one university, with raw cutoffs/requirements.

    No grades involved — this is the read-only catalogue behind the "Browse
    Programmes" tab, so students can look up requirements without filling the form.
    """
    university = University.query.filter_by(short_code=uni_code.upper()).first()

    if university is None:
        return jsonify({
            "status": "error",
            "message": f"Unknown university code: {uni_code}"
        }), 404

    programs = [
        {
            "program_name": program.name,
            "cutoff_aggregate": program.cutoff_aggregate,
            "program_type": program.program_type,
            "requirements": program.requirements
        }
        for program in sorted(university.programs, key=lambda p: p.name)
    ]

    return jsonify({
        "status": "success",
        "university": university.name,
        "university_code": university.short_code,
        "program_count": len(programs),
        "programs": programs
    })


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

    student_portfolio = build_subject_portfolio(student_grades)

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
        if not is_eligible:
            continue

        # Aggregate is computed per-program since the 3rd core (Science vs Social Studies)
        # depends on that program's elective_category_pool requirement
        student_aggregate = calculate_aggregate(student_portfolio, program_data_dict)

        if student_aggregate <= program.cutoff_aggregate:
            eligible_list.append({
                "program_name": program.name,
                "cutoff": program.cutoff_aggregate,
                "student_aggregate": student_aggregate,
                "university": program.university_data.name
            })

    return jsonify({
        "status": "success",
        "eligible_programs": eligible_list
    })