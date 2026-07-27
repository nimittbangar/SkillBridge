<<<<<<< HEAD
# SkillBridge
=======
# SkillBridge — Remote Job Portal with Verified Skill Tagging
### CDAC Project

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Bootstrap 5 + Axios |
| Backend | Java 17 + Spring Boot 3.2 + Spring Security |
| Auth | JWT (JSON Web Token) |
| Database | **MySQL 8.0** |
| Tools | IntelliJ IDEA / VS Code, Postman, GitHub |

---

## Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 18+
- **MySQL 8.0** (local)
- IntelliJ IDEA / VS Code

---

## Setup Instructions

### Step 1: Setup MySQL Database
```sql
-- Open MySQL Workbench or CLI and run:
CREATE DATABASE skillbridge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Or just run the backend — Spring Boot creates tables automatically!

Update `application.properties` with your MySQL username/password:
```properties
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD
```

### Step 2: Run Backend
```bash
cd skillbridge/backend
mvn clean install
mvn spring-boot:run
```
Backend runs on: http://localhost:8080

### Step 3: Run Frontend
```bash
cd skillbridge/frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:5173

---

## Responsive Design
| Device | Screen | Status |
|--------|--------|--------|
| Desktop | 1200px+ | ✅ Full sidebar + all features |
| Laptop | 992px–1199px | ✅ Full sidebar |
| Tablet | 768px–991px | ✅ Compact sidebar |
| Mobile | < 768px | ✅ Bottom navigation bar |

---

## User Roles
| Role | Access |
|------|--------|
| SEEKER | Browse jobs, apply, track applications, view interviews |
| EMPLOYER | Post jobs, manage applicants, schedule interviews |
| ADMIN | Manage users, verify skills, full platform access |

**To make Admin:** Register normally, then run in MySQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@skillbridge.com';
```

---

## Team Division
| Member | Module |
|--------|--------|
| Ajay Shinde (Leader) | Auth + Admin Panel + Project Setup |
| Member 2 | Job Module + Search + Skill Match Score |
| Member 3 | Application Tracker + Interview + Offers |
| Member 4 | React Frontend (16 pages) + Responsive UI |

---

## Hosting (Free)
| Service | Purpose | URL |
|---------|---------|-----|
| Render | Backend (Spring Boot) | Render.com |
| Railway | MySQL Database | railway.app |
| Vercel | Frontend (React) | vercel.com |

*SkillBridge — CDAC PGCP Bangalore 2026*
>>>>>>> 8d33b52 (Initial commit)
