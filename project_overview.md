# SuchnaX Link - Institutional Circular Management System

## Project Overview
SuchnaX Link is a premium, institutional-grade communication platform designed for educational institutions to manage and distribute official circulars, announcements, and notices with precision, security, and a modern aesthetic.

---

## 1. Technical Architecture
The project leverages a robust modern stack ensuring high performance and real-time synchronization.

- **Frontend**: React 18, Vite, Framer Motion (Animations), Tailwind CSS.
- **Backend & Database**: Firebase Firestore (Real-time NoSQL).
- **Authentication**: Firebase Authentication (Role-based: Admin, Faculty, Dept Admin, Student).
- **Storage**: Cloudinary / Firebase Storage for attachments.
- **Quality & Standards**: ESM Linting (Zero-warning policy), Production-ready builds.

---

## 2. Core Modules & Features

### 📡 Circular Center
The heartbeat of the application, where circulars are distributed based on granular targeting rules.
- **Targeting**: Department (CSE, AIDS, AIML, ECE, EEE, MECH, CIVIL), Year (1st-4th), and Section (A-D).
- **Priorities**: Urgent, Important, and Standard categorization with visual distinctness.
- **Interaction**: Read/Unread tracking, Bookmarks, and Acknowledgments.

### ⚙️ Redesigned Desktop Settings
A completely overhauled, professional settings environment.
- **Account**: Profile management with standardized academic titles.
- **Appearance**: Integrated "Royal Dark" theme management with persistence.
- **Security**: Granular controls and session management.
- **Onboarding**: Integrated "Replay Tutorial" for new users.

### 🛡️ Security & Administration
- **RBAC**: Secure Role-Based Access Control enforced at the Firestore Rules level.
- **Audit Logs**: Real-time tracking of critical system actions for institutional compliance.
- **Approvals**: A structured queue for vetting new institutional memberships.

---

## 3. Institutional Standards
To ensure data integrity, the system strictly enforces the following institutional parameters:
- **Departments**: CSE, AIDS, AIML, ECE, EEE, MECH, CIVIL.
- **Years**: 1st Year, 2nd Year, 3rd Year, 4th Year.
- **Sections**: A, B, C, D.

---

## 4. Performance Benchmarks
- **Page Transitions**: Fluid 60fps animations via Framer Motion.
- **Data Latency**: Optimized Firestore queries with client-side sorting to avoid indexing bottlenecks.
- **Offline Support**: Resilient background logic for intermittent connectivity.

---

## 5. Development Status (March 2026)
- **Status**: Production Ready.
- **Build Quality**: Verified clean linting and successful production builds.
- **Repository**: Synced with latest security rules and UI refinements.

---
**Version**: 2.1  
**Author**: Antigravity AI Engineering  
**Last Updated**: March 21, 2026
