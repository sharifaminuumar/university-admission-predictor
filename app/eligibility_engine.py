# app/eligibility_engine.py

# Standard WASSCE grading system mapped to aggregates
GRADE_POINTS = {
    'A1': 1, 'B2': 2, 'B3': 3, 'C4': 4,
    'C5': 5, 'C6': 6, 'D7': 7, 'E8': 8, 'F9': 9
}


def meets_minimum_grade(student_grade, required_grade):
    """
    Checks if a student's grade is equal to or better than the requirement.
    Smaller numbers are better in WASSCE (A1 = 1, C6 = 6).
    """
    if student_grade not in GRADE_POINTS or required_grade not in GRADE_POINTS:
        return False

    return GRADE_POINTS[student_grade] <= GRADE_POINTS[required_grade]


def check_mandatory_subjects(student_subjects, required_subjects):
    """
    Validates if the student has the mandatory subjects and meets the specific grade requirements.
    `required_subjects` is a list of dicts: [{"subject": "Elective Mathematics", "minimum_grade": "B3"}, ...]
    """
    for req in required_subjects:
        subject_name = req['subject']
        min_grade = req['minimum_grade']

        # Check if student even took the subject
        if subject_name not in student_subjects:
            return False, f"Missing required subject: {subject_name}"

        # Check if the grade is sufficient
        student_grade = student_subjects[subject_name]
        if not meets_minimum_grade(student_grade, min_grade):
            return False, f"Grade {student_grade} in {subject_name} does not meet minimum {min_grade}"

    return True, "Passed"


def evaluate_eligibility(student_data, program_data):
    """
    The main engine function.
    """
    reqs = program_data['requirements']

    # 1. Check Mandatory Cores
    core_check, core_msg = check_mandatory_subjects(student_data, reqs.get('mandatory_cores', []))
    if not core_check:
        return {"eligible": False, "reason": core_msg}

    # 2. Check Mandatory Electives
    elective_check, elective_msg = check_mandatory_subjects(student_data, reqs.get('mandatory_electives', []))
    if not elective_check:
        return {"eligible": False, "reason": elective_msg}

    # 3. Calculate Aggregate
    student_aggregate = calculate_aggregate(student_data, program_data)
    cutoff = program_data['cutoff_aggregate']

    if student_aggregate > cutoff:
        return {
            "eligible": False,
            "reason": f"Aggregate {student_aggregate} exceeds the cutoff of {cutoff}."
        }

    return {
        "eligible": True,
        "reason": f"Qualifies with an aggregate of {student_aggregate} (Cutoff: {cutoff})."
    }


def calculate_aggregate(student_subjects, program_data):
    """
    Calculates the best WASSCE aggregate (Best 6) for a specific program.
    """
    # 1. Separate student's subjects into Cores and Electives
    cores = {}
    electives = {}

    core_names = ["English Language", "Core Mathematics", "Integrated Science", "Social Studies"]

    for subject, grade in student_subjects.items():
        if subject in core_names:
            cores[subject] = GRADE_POINTS.get(grade, 9)  # Default to 9 (Fail) if invalid
        else:
            electives[subject] = GRADE_POINTS.get(grade, 9)

    # 2. Determine the Best 3 Cores
    # Everyone needs English and Math.
    required_cores = 0
    if "English Language" in cores:
        required_cores += cores["English Language"]
    if "Core Mathematics" in cores:
        required_cores += cores["Core Mathematics"]

    # The 3rd core depends on the program type (Science vs Non-Science)
    pool = program_data['requirements'].get('elective_category_pool', 'Any')
    if pool == 'Sciences':
        third_core = cores.get("Integrated Science", 9)
    else:
        # For non-science or 'Any', pick the better grade between Science and Social Studies
        science_grade = cores.get("Integrated Science", 9)
        social_grade = cores.get("Social Studies", 9)
        third_core = min(science_grade, social_grade)  # min() because lower is better in WASSCE

    core_aggregate = required_cores + third_core

    # 3. Determine the Best 3 Electives
    # Sort electives by best grade (lowest number)
    sorted_electives = sorted(electives.values())

    # Grab the top 3
    best_3_electives = sum(sorted_electives[:3]) if len(sorted_electives) >= 3 else 27  # 27 is automatic fail (9x3)

    # 4. Total Aggregate
    total_aggregate = core_aggregate + best_3_electives

    return total_aggregate