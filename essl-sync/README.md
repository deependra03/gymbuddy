# ESSL to GymBuddy Sync System

This system has two components:

## Part 1: ESSL → JSON (Python)
Reads the eTimeTrackLite Access MDB, discovers monthly DeviceLogs_MM_YYYY tables, maps UserId to Employees, and writes records to data/attendance.json.

IMPORTANT:
This script reads data already downloaded into eTimeTrackLite.
It does NOT trigger the biometric device to download new punches.

### Setup

1. Copy `.env.example` to `.env`.
2. Set the exact path to `eTimeTrackLite1.mdb`.
3. Install dependencies:

    python -m pip install -r requirements.txt

4. Optional database finder:

    python find_db.py

5. Test one sync:

    python run_once.py

6. If successful, inspect:

    data\attendance.json

7. Run the configurable scheduler:

    python main.py

Default interval is 30 minutes. Change `SYNC_INTERVAL_MINUTES`
in `.env`.

Logs are written to `logs\sync.log`.

---

## Part 2: GymBuddy Attendance Processing (Node.js)

Processes ESSL attendance logs from GymBuddy `attendance_logs` table:
- Matches users by phone, email, or ESSL enroll number
- Creates users if not found (with default password: GymBuddy@123)
- Populates the `attendance` table
- Marks records as processed

### Setup

1. Copy `.env.example` to `.env` (if not already done).
2. Set `DATABASE_URL` to your GymBuddy PostgreSQL connection string.
3. Install dependencies:

    npm install

4. Generate Prisma client:

    npx prisma generate

5. Test the processor:

    node process-attendance.js

### Scheduling (Windows Task Scheduler)

Create a task to run every 5 minutes:

1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task: "GymBuddy ESSL Attendance Processor"
3. Trigger: Daily, repeat every 5 minutes
4. Action: Start program
   - Program: `node.exe` (use full path from `where node`)
   - Arguments: `process-attendance.js`
   - Start in: `c:\gymbuddy\essl-sync`

### User Matching Priority

The script matches users in this order:
1. **ESSL enroll number** (esslEnrollNumber) - highest priority
2. **Phone number** (phone)
3. **Email** (email)

If no match is found and phone/email is available, a new user is created with:
- Name from ESSL employee record
- Phone/email from ESSL record
- Default password: `GymBuddy@123` (should be changed by user)
- Role: member
- Membership: 1 year from creation

### Processing Flow

1. Fetches unprocessed batches from `attendance_logs` table
2. Parses raw JSON to get individual ESSL records
3. For each record:
   - Finds or creates user based on phone/email/esslEnrollNumber
   - Creates attendance record (IN/OUT based on direction)
   - Skips if attendance already exists
4. Marks batch as processed
5. Logs summary of processed/skipped/error records

### Troubleshooting

- Check that `DATABASE_URL` is set correctly in `.env`
- Ensure Prisma client is generated: `npx prisma generate`
- Verify database connection by running `npx prisma studio`
- Check console output for detailed processing logs
- Review `attendance_logs` table for records with `error` field set
