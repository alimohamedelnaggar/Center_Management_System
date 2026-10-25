# 🎓 Center Management System

A modern Center Management System built with **ASP.NET Core 10**, **React**, **Clean Architecture**, **CQRS**, and **SignalR** for managing students, groups, attendance, sessions, and payments in real time.

---

### 🚀 Features

### 👨‍🎓 Student Management
- Add new students
- Edit student information
- Delete students
- Activate / Deactivate students
- Search students
- Pagination
- Filter by group

### 👥 Group Management
- Create groups
- Edit groups
- Delete groups
- Assign students to groups
- Manage schedules

### 📅 Session Management
- Create sessions
- Edit sessions
- Delete sessions
- Automatic session pricing

### ✅ Attendance Management
- Take attendance per session
- Present / Absent status
- Update attendance
- Real-time attendance synchronization using SignalR

### 💰 Payment Management
- Monthly subscriptions
- Per-session payments
- Payment history
- Duplicate payment validation
- Real-time payment updates

### 📊 Dashboard
- Student statistics
- Attendance statistics
- Payment statistics

---

# 🏗️ Architecture

The project follows **Clean Architecture** with **CQRS**.

```
Presentation
      │
Application (CQRS + MediatR)
      │
Domain
      │
Infrastructure
```

Patterns used:

- Clean Architecture
- CQRS
- Repository Pattern
- MediatR
- Dependency Injection
- FluentValidation
- SignalR

---

# 🛠 Technologies

## Backend

- ASP.NET Core 10
- Entity Framework Core
- SQL Server
- MediatR
- FluentValidation
- SignalR
- AutoMapper
- JWT Authentication

## Frontend

- React
- Vite
- Tailwind CSS v4
- Axios
- React Router
- Lucide Icons
- React Hot Toast

---

# 📂 Project Structure

```
API/
│
├── CenterManagement.Api
├── CenterManagement.Core
├── CenterManagement.Data
├── CenterManagement.Infrastructure
└── CenterManagement.Service

Frontend/
│
└── CenterManagement
```

---

# ⚡ Getting Started

## Clone repository

```bash
git clone https://github.com/yourusername/Center_Management.git
```

---

## Backend

```bash
cd API/CenterManagementCleanArchitecture
```

Restore packages

```bash
dotnet restore
```

Update database

```bash
dotnet ef database update
```

Run

```bash
dotnet run
```

---

## Frontend

```bash
cd Frontend/CenterManagement
```

Install packages

```bash
npm install
```

Run

```bash
npm run dev
```

---

# 📡 SignalR Events

Current real-time events:

- StudentAdded
- StudentUpdated
- StudentDeleted
- PaymentAdded
- AttendanceSaved

---

# 📸 Screenshots

You can add screenshots here.

Example:

```
screenshots/
    dashboard.png
    students.png
    attendance.png
    payments.png
```

---

# 🔮 Future Features

- Exams Management
- Grades
- Reports
- Parent Dashboard
- Notifications
- Export PDF & Excel
- AI Assistant

---
 

# ⭐ Support

If you like this project, don't forget to leave a ⭐ on GitHub.
