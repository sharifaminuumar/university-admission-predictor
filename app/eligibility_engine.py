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


def evaluate_eligibility(student_grades, program_data):
    """
    Validates a student's WASSCE grades against institutional prerequisite thresholds.
    Returns: (is_eligible, explanation_string_or_meta)
    """
    # 1. Establish the passing grade criteria (Must be A1 to C6)
    failing_grades = {"D7", "E8", "F9", "", "Grade"}

    # 2. Extract and enforce Core Prerequisites
    core_math = student_grades.get("Core Mathematics")
    english = student_grades.get("English Language")
    science = student_grades.get("Integrated Science")

    # Fail immediately if any core prerequisite is missing or below a C6
    if core_math in failing_grades or english in failing_grades or science in failing_grades:
        return False, "Failing grade in mandatory core prerequisites (English, Core Math, or Integrated Science)."

    # 3. Extract program specific requirements from database JSON definition
    requirements = program_data.get("requirements", {})
    mandatory_cores = requirements.get("mandatory_cores", [])
    mandatory_electives = requirements.get("mandatory_electives", [])

    # Map out the student's entire result portfolio for quick lookups
    all_student_subjects = {
        "Core Mathematics": core_math,
        "English Language": english,
        "Integrated Science": science,
        "Social Studies": student_grades.get("Social Studies")
    }

    # Add electives to portfolio map
    for i in range(1, 5):
        name = student_grades.get(f"Elective {i}")
        grade = student_grades.get(f"Elective {i} Grade")
        if name and grade:
            all_student_subjects[name] = grade

    # 4. Check specific mandatory core dependencies (e.g., matching minimum grades if set)
    for req in mandatory_cores:
        sub_name = req.get("subject")
        min_grade = req.get("minimum_grade", "C6")  # Default baseline to C6
        student_grade = all_student_subjects.get(sub_name)

        if not student_grade or student_grade in failing_grades:
            return False, f"Missing or failing grade in core prerequisite: {sub_name}"

    # 5. Check specific mandatory elective dependencies (e.g., Elective Math for Engineering)
    for req in mandatory_electives:
        sub_name = req.get("subject")
        student_grade = all_student_subjects.get(sub_name)

        if not student_grade or student_grade in failing_grades:
            return False, f"Missing or failing grade in required elective: {sub_name}"

    # 6. Verify that the student has at least 3 passing electives overall
    valid_elective_count = 0
    for i in range(1, 5):
        el_name = student_grades.get(f"Elective {i}")
        el_grade = student_grades.get(f"Elective {i} Grade")
        if el_name and el_grade and el_grade not in failing_grades:
            valid_elective_count += 1

    if valid_elective_count < 3:
        return False, "Applicant must possess at least 3 passing elective subjects (A1-C6)."

    return True, "Qualified"


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