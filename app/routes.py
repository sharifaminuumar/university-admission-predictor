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
    # 1. Grab the student's grades from the incoming request
    student_data = request.json

    if not student_data:
        return jsonify({"error": "No grades provided"}), 400

    qualified_programs = []

    # 2. Fetch every program from the database
    all_programs = Program.query.all()

    # 3. Feed them to the engine one by one
    for program in all_programs:
        # Format the database object into the dictionary our engine expects
        program_data = {
            "cutoff_aggregate": program.cutoff_aggregate,
            "requirements": program.requirements
        }

        # Run the magic
        result = evaluate_eligibility(student_data, program_data)

        # If they qualify, add it to the success list
        if result['eligible']:
            qualified_programs.append({
                "university": program.university.name,
                "short_code": program.university.short_code,
                "program_name": program.name,
                "type": program.program_type,
                "reason": result['reason']
            })

    # 4. Send the results back to the frontend
    return jsonify({
        "status": "success",
        "total_matches": len(qualified_programs),
        "results": qualified_programs
    })