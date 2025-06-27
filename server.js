const express = require('express');
const oracledb = require('oracledb');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(bodyParser.json());

const dbConfig = {
    user: "system",
    password: "Kpsr",
    connectString: "127.0.0.1:1521/XE"
};

// Utility function to create a table if it doesn't exist
async function ensureTable(connection, tableName, createSQL) {
    const result = await connection.execute(
        `SELECT table_name FROM user_tables WHERE table_name = :tn`,
        [tableName.toUpperCase()]
    );
    if (result.rows.length === 0) {
        await connection.execute(createSQL);
        console.log(`✅ Created '${tableName}' table!`);
    }
}

// Initialize Database
async function initializeDatabase() {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Create required tables if they don't exist
        await ensureTable(connection, "students", `
            CREATE TABLE students (
                name VARCHAR2(100),
                regNo VARCHAR2(20) UNIQUE,
                department VARCHAR2(50),
                admission_type VARCHAR2(20),
                cgpa NUMBER(3,2)
            )
        `);

        await ensureTable(connection, "regular_students", `
            CREATE TABLE regular_students (
                name VARCHAR2(100),
                regNo VARCHAR2(20) UNIQUE,
                department VARCHAR2(50),
                admission_type VARCHAR2(20),
                cgpa NUMBER(3,2)
            )
        `);

        await ensureTable(connection, "lateral_students", `
            CREATE TABLE lateral_students (
                name VARCHAR2(100),
                regNo VARCHAR2(20) UNIQUE,
                department VARCHAR2(50),
                admission_type VARCHAR2(20),
                cgpa NUMBER(3,2)
            )
        `);

        await ensureTable(connection, "self_support_students", `
            CREATE TABLE self_support_students (
                name VARCHAR2(100),
                regNo VARCHAR2(20) UNIQUE,
                department VARCHAR2(50),
                admission_type VARCHAR2(20),
                cgpa NUMBER(3,2)
            )
        `);

        await ensureTable(connection, "admission_count", `
            CREATE TABLE admission_count (
                admission_type VARCHAR2(20) PRIMARY KEY,
                count NUMBER
            )
        `);

        // Drop existing trigger (if any)
        try {
            await connection.execute(`
                BEGIN
                    EXECUTE IMMEDIATE 'DROP TRIGGER student_insert_trigger';
                EXCEPTION WHEN OTHERS THEN
                    IF SQLCODE != -4080 THEN RAISE; END IF;
                END;
            `);
            console.log("✅ Dropped existing trigger (if any).");
        } catch (err) {
            console.error("❌ Error dropping trigger:", err);
        }

        // Create new trigger
        await connection.execute(`
            CREATE OR REPLACE TRIGGER student_insert_trigger
            AFTER INSERT ON students
            FOR EACH ROW
            BEGIN
                IF :NEW.admission_type = 'Regular' THEN
                    INSERT INTO regular_students (name, regNo, department, admission_type, cgpa)
                    VALUES (:NEW.name, :NEW.regNo, :NEW.department, :NEW.admission_type, :NEW.cgpa);
                ELSIF :NEW.admission_type = 'Lateral' THEN
                    INSERT INTO lateral_students (name, regNo, department, admission_type, cgpa)
                    VALUES (:NEW.name, :NEW.regNo, :NEW.department, :NEW.admission_type, :NEW.cgpa);
                ELSIF :NEW.admission_type = 'Self-Support' THEN
                    INSERT INTO self_support_students (name, regNo, department, admission_type, cgpa)
                    VALUES (:NEW.name, :NEW.regNo, :NEW.department, :NEW.admission_type, :NEW.cgpa);
                END IF;

                MERGE INTO admission_count ac
                USING (SELECT :NEW.admission_type AS admission_type FROM dual) temp
                ON (ac.admission_type = temp.admission_type)
                WHEN MATCHED THEN
                    UPDATE SET ac.count = ac.count + 1
                WHEN NOT MATCHED THEN
                    INSERT (admission_type, count) VALUES (:NEW.admission_type, 1);
            END;
        `);

        console.log("✅ Created/replaced the 'student_insert_trigger' trigger!");
    } catch (err) {
        console.error("❌ DB init error:", err);
    } finally {
        if (connection) await connection.close();
    }
}

// Register Student
app.post('/register', async (req, res) => {
    const { name, regNo, department, admissionType, cgpa } = req.body;

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `INSERT INTO students (name, regNo, department, admission_type, cgpa)
             VALUES (:name, :regNo, :department, :admissionType, :cgpa)`,
            { name, regNo, department, admissionType, cgpa }
        );
        await connection.commit();
        res.json({ message: "Student registered successfully!" });
    } catch (err) {
        console.error("❌ Registration error:", err);
        res.status(500).json({ message: "Registration failed: " + err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Generic fetch function
const fetchTable = (tableName) => async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT * FROM ${tableName}`);
        if (result.rows.length === 0) {
            return res.json([]);
        }
        res.json(result.rows);
    } catch (err) {
        console.error(`❌ Fetch error from ${tableName}:`, err);
        res.status(500).json({ error: "Database error" });
    } finally {
        if (connection) await connection.close();
    }
};

app.get('/students', fetchTable('students'));
app.get('/regular', fetchTable('regular_students'));
app.get('/selfsupport', fetchTable('self_support_students'));
app.get('/lateral', fetchTable('lateral_students'));
app.get('/admissioncount', fetchTable('admission_count'));

// Clear all data
app.delete("/clear", async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const tables = ["students", "regular_students", "lateral_students", "self_support_students", "admission_count"];
        for (const table of tables) {
            await connection.execute(`DELETE FROM ${table}`);
        }
        await connection.commit();
        res.json({ message: "All student data cleared!" });
    } catch (err) {
        console.error("❌ Clear error:", err);
        res.status(500).json({ message: "Error clearing data.", error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Start server
initializeDatabase().then(() => {
    app.listen(5000, () => {
        console.log("🚀 Server running on http://localhost:5000");
    });
});
