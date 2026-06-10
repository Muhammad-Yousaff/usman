# Job Seeker Web Application (Aidifys)

A full-stack Job Seeker Web Application built using React.js, Express.js, MongoDB, and an AI-powered Resume Analyzer fallback.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **File Parsing**: Mammoth (DOCX), PDF-Parse (PDF)

## Features
- **Job Seeker Portal**: Registration, JWT Login, Profile Management, Applied Jobs tracking.
- **AI CV Analyzer**: Instantly extracts candidate details (name, email, phone, skills), match score, and improvement recommendations from uploaded PDF or DOCX resumes (via LLM or local fallback parser).
- **Newsletter Subscription**: Capture user emails directly into the database.
- **Job Board**: Active postings, location filtering, and categories.
