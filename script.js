// Student Registration Form Submission
document.getElementById("registrationForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("name");
    const regNoInput = document.getElementById("regNo");
    const deptInput = document.getElementById("department");
    const admissionTypeInput = document.getElementById("admissionType");

    const name = nameInput.value;
    const regNo = regNoInput.value;
    const department = deptInput.value;
    const admissionType = admissionTypeInput.value;

    const gpaResult = document.getElementById('gpa-result').textContent;
    const cgpaResult = document.getElementById('cgpa-result').textContent;

    let gpa = gpaResult !== "Your GPA: N/A" ? parseFloat(gpaResult.split(":")[1].trim()) : null;
    let cgpa = cgpaResult !== "Your CGPA: N/A" ? parseFloat(cgpaResult.split(":")[1].trim()) : null;

    if (!name || !regNo || !department || !admissionType || (gpa === null && cgpa === null)) {
        alert("Please fill all fields and calculate GPA or CGPA.");
        return;
    }

    const studentData = { name, regNo, department, admissionType, gpa, cgpa };

    try {
        const response = await fetch("http://localhost:5000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData),
            cache: "no-store"
        });

        if (response.ok) {
            alert("Student registered successfully!");

            nameInput.value = "";
            regNoInput.value = "";
            deptInput.value = "";
            admissionTypeInput.value = "";

            document.getElementById("gpa-subjects-container").innerHTML = `
                <div class="subject">
                  <label>Subject Name</label>
                  <input type="text" placeholder="Subject Name" required>
                  <label>Credits</label>
                  <input type="number" placeholder="Credits" required>
                  <label>Grade (0-10)</label>
                  <input type="number" placeholder="Grade (0-10)" min="0" max="10" required>
                </div>
            `;

            document.getElementById("cgpa-semesters-container").innerHTML = `
                <div class="semester">
                  <label>GPA for Semester</label>
                  <input type="number" placeholder="GPA for Semester" min="0" max="10" step="0.01" required>
                  <label>Total Credits for Semester</label>
                  <input type="number" placeholder="Total Credits for Semester" required>
                </div>
            `;

            document.getElementById('gpa-result').textContent = 'Your GPA: N/A';
            document.getElementById('cgpa-result').textContent = 'Your CGPA: N/A';
        } else {
            alert("Error registering student.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Try again later.");
    }
});

// Clear All Data
async function clearAllData() {
    if (!confirm("Are you sure you want to delete all student data?")) return;

    try {
        const response = await fetch("http://localhost:5000/clear", { method: "DELETE" });

        if (response.ok) {
            alert("All student data cleared!");
        } else {
            alert("Error clearing student data.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Try again later.");
    }
}

// Add Subject Input (for GPA Calculator)
function addSubject(containerId) {
    const container = document.getElementById(containerId);
    const subjectDiv = document.createElement('div');
    subjectDiv.classList.add('subject');

    subjectDiv.innerHTML = `
        <label>Subject Name</label>
        <input type="text" placeholder="Subject Name" required>
        <label>Credits</label>
        <input type="number" placeholder="Credits" required>
        <label>Grade (0-10)</label>
        <input type="number" placeholder="Grade (0-10)" min="0" max="10" required>
    `;

    container.appendChild(subjectDiv);
}

// GPA Calculator
function calculateGPA(event) {
    event.preventDefault();

    const subjects = document.querySelectorAll('#gpa-subjects-container .subject');
    let totalCredits = 0;
    let totalPoints = 0;

    subjects.forEach(subject => {
        const inputs = subject.querySelectorAll('input');
        const credits = parseFloat(inputs[1].value);
        const grade = parseFloat(inputs[2].value);

        if (credits > 0 && grade >= 0 && grade <= 10) {
            totalCredits += credits;
            totalPoints += credits * grade;
        }
    });

    const gpa = totalPoints / totalCredits;
    const result = document.getElementById('gpa-result');
    result.textContent = !isNaN(gpa) && totalCredits > 0
        ? `Your GPA: ${gpa.toFixed(2)}`
        : 'Your GPA: N/A';
}

// CGPA Calculator
function calculateCGPA(event) {
    event.preventDefault();

    const semesters = document.querySelectorAll('#cgpa-semesters-container .semester');
    let totalCredits = 0;
    let totalGradePoints = 0;

    semesters.forEach(sem => {
        const inputs = sem.querySelectorAll('input');
        const gpa = parseFloat(inputs[0].value);
        const credits = parseFloat(inputs[1].value);

        if (credits > 0 && gpa >= 0 && gpa <= 10) {
            totalCredits += credits;
            totalGradePoints += gpa * credits;
        }
    });

    const cgpa = totalGradePoints / totalCredits;
    const result = document.getElementById('cgpa-result');
    result.textContent = !isNaN(cgpa) && totalCredits > 0
        ? `Your CGPA: ${cgpa.toFixed(2)}`
        : 'Your CGPA: N/A';
}

// Add Semester Input (for CGPA Calculator)
function addSemester() {
    const container = document.getElementById('cgpa-semesters-container');
    const semesterDiv = document.createElement('div');
    semesterDiv.classList.add('semester');

    semesterDiv.innerHTML = `
        <label>GPA for Semester</label>
        <input type="number" placeholder="GPA for Semester" min="0" max="10" step="0.01" required>
        <label>Total Credits for Semester</label>
        <input type="number" placeholder="Total Credits for Semester" required>
    `;

    container.appendChild(semesterDiv);
}

// Event Listeners for Calculators
document.getElementById('gpaForm').addEventListener('submit', calculateGPA);
document.getElementById('cgpaForm').addEventListener('submit', calculateCGPA);
