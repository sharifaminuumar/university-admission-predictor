from flask import Blueprint, request, jsonify, render_template
from .models import Program, University
from .eligibility_engine import (
    evaluate_eligibility,
    calculate_aggregate,
    build_subject_portfolio,
    classify_band,
    suggest_improvement,
)

main = Blueprint('main', __name__)

# A programme missed by this many aggregate points or fewer is still shown, flagged
# as not eligible, together with the single grade upgrade that would close the gap.
NEAR_MISS_WINDOW = -3

# classify_band() calls margin >= 3 "Safe"; reused so the advice targets match.
SAFE_MARGIN = 3


@main.route('/', methods=['GET'])
def index():
    # This will serve our HTML frontend later
    return render_template('index.html')


@main.route('/api/universities', methods=['GET'])
def list_universities():
    """Summary of every seeded institution — powers the marquee and the directory.

    Cut-off ranges are computed from *published* cut-offs only; a range built from
    site-wide ceilings would just read "36-36" and imply a precision we don't have.
    """
    summaries = []

    for university in University.query.order_by(University.name).all():
        programs = university.programs
        published = [p.cutoff_aggregate for p in programs if p.cutoff_source == "published"]

        summaries.append({
            "university": university.name,
            "university_code": university.short_code,
            "region": university.region,
            "program_count": len(programs),
            "diploma_count": sum(1 for p in programs if p.program_type == "Diploma"),
            "published_cutoff_count": len(published),
            "cutoff_min": min(published) if published else None,
            "cutoff_max": max(published) if published else None,
        })

    return jsonify({
        "status": "success",
        "university_count": len(summaries),
        "program_count": sum(s["program_count"] for s in summaries),
        "universities": summaries,
    })


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
            "cutoff_source": program.cutoff_source,
            "program_type": program.program_type,
            "requirements": program.requirements
        }
        for program in sorted(university.programs, key=lambda p: p.name)
    ]

    return jsonify({
        "status": "success",
        "university": university.name,
        "university_code": university.short_code,
        "region": university.region,
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
            # A subject requirement is missing, which no grade upgrade can fix once
            # results are out, so there is no useful advice to offer here.
            continue

        # Aggregate is computed per-program since the 3rd core (Science vs Social Studies)
        # depends on that program's elective_category_pool requirement
        student_aggregate = calculate_aggregate(student_portfolio, program_data_dict)
        margin = program.cutoff_aggregate - student_aggregate

        if margin < 0:
            # Subject requirements are met and only the aggregate falls short. If it is
            # close, show it as an explicitly-not-eligible "Near Miss" with advice.
            if margin < NEAR_MISS_WINDOW:
                continue

            tip = suggest_improvement(student_portfolio, program_data_dict, program.cutoff_aggregate)
            if tip is None:
                continue
            band, eligible, goal = "Near Miss", False, "qualify"
        else:
            band, _ = classify_band(student_aggregate, program.cutoff_aggregate, program.cutoff_source)
            eligible, goal = True, "reach the Safe band"

            # A Reach band comes from the cut-off being unpublished, not from the
            # student's grades, so no upgrade can move it — offering a target would
            # imply a change that cannot happen.
            if band == "Competitive":
                tip = suggest_improvement(
                    student_portfolio, program_data_dict, program.cutoff_aggregate - SAFE_MARGIN
                )
            else:
                tip = None

        eligible_list.append({
            "program_name": program.name,
            "cutoff": program.cutoff_aggregate,
            "cutoff_source": program.cutoff_source,
            "program_type": program.program_type,
            "student_aggregate": student_aggregate,
            "margin": margin,
            "band": band,
            "eligible": eligible,
            "improvement": (dict(tip, goal=goal) if tip else None),
            "university": program.university_data.name,
            "region": program.university_data.region,
            # Sent so a result card can show WHY the student qualifies, using the
            # same requirement chips the Browse catalogue renders.
            "requirements": program_data_dict["requirements"]
        })

    # Safest first, with the not-yet-eligible Near Misses last, then by name so the
    # ordering is stable across identical requests.
    band_rank = {"Safe": 0, "Competitive": 1, "Reach": 2, "Near Miss": 3}
    eligible_list.sort(key=lambda p: (band_rank.get(p["band"], 3), -p["margin"], p["program_name"]))

    return jsonify({
        "status": "success",
        "eligible_programs": eligible_list
    })