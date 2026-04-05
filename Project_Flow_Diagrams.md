# CIRA Tech Management Platform - Flow Diagrams

This document outlines the core workflows, data structures, and state transitions within the CIRA Tech Platform.

## 1. System Access and Role Definitions

```mermaid
graph TD
    A[User visits Platform] --> B{Has Account?}
    B -- No --> C[Register]
    B -- Yes --> D[Login]
    C --> E[System assigns 'Member' Role]
    D --> F{Check Role Context}
    
    F -- Admin --> G[Full System Access]
    F -- PM --> H[Project Management & Task Review]
    F -- HR --> I[HR Hub, Profiles, Payroll Generation]
    F -- Member --> J[Assigned Tasks & Allowed Spaces Only]
    
    G --> K[Manage System Roles & Settings]
    G --> L[Approve & Pay Invoices / Payrolls]
    H --> M[Create Project Spaces, Folders, Lists, Tasks]
    H --> N[Review & Approve/Reject Tasks]
    I --> O[Conduct Performance Appraisals]
    I --> P[Generate Draft Payrolls]
    J --> Q[Time Tracking & Task Progression]
```

## 2. Project Hierarchy and Relationships

```mermaid
erDiagram
    PROJECT_SPACE ||--o{ FOLDER : "contains"
    PROJECT_SPACE ||--o{ PROJECT_MEMBER : "has"
    PROJECT_SPACE ||--o{ CHANNEL : "owns"
    FOLDER ||--o{ LIST : "contains"
    LIST ||--o{ TASK : "contains"
    TASK ||--o{ TASK_ASSIGNEE : "assigned_to"
    TASK ||--o{ TIME_LOG : "tracks time"
    TASK ||--o{ TASK_REPORT : "generates reports"
    PROFILE ||--o{ PERFORMANCE_APPRAISAL : "receives"
    PROFILE ||--o{ PAYROLL : "earns"
```

## 3. Task Status Lifecycle & Time Tracking

```mermaid
stateDiagram-v2
    [*] --> ToDo: Task Created (by PM/Admin)
    
    state "Active Development" as Active {
        ToDo --> InProgress: Assignee Starts Work
        InProgress --> InProgress: Assignee logs time (TimeLogs)
        InProgress --> InReview: Assignee Submits for Review (Task Report gen.)
    }
    
    state "Review & QA" as QA {
        InReview --> InProgress: PM/Admin Rejects (Revision Needed)
        InReview --> Done: PM/Admin Approves
    }
    
    Done --> [*]
```

## 4. Payroll and Invoice Lifecycle (Financial Flow)

```mermaid
sequenceDiagram
    participant Member
    participant HR
    participant Admin
    participant System

    Member->>System: Logs time on tasks during period
    HR->>System: Submits Performance Appraisal (Bonus %)
    HR->>System: Generates Draft Payroll (Time + Perf Bonus)
    HR->>System: Approves Payroll (Status -> Approved)
    System->>System: Auto-creates Payroll Invoice (Status -> Sent)
    System-->>Admin: Sends Notification about new Invoice
    Admin->>System: Reviews & marks Invoice as Paid
    System->>System: Auto-updates linked Payroll Status to Paid
    System-->>Member: Notification: Salary transferred / Paid
```

## 5. Communication and Notifications Flow

```mermaid
graph LR
    A[Project Space Created] -->|Auto-triggers| B[Default Space Channel Created]
    C[Private Channel Created] -->|Admin/PM invites| D[Channel Invitation Pending]
    D -->|User Accepts| E[Added as Channel Member]
    
    F[System Events] -->|Task Assigned| G[Notification via API]
    F -->|Task Review| G
    F -->|Invoice Created| G
    
    G --> H[User Dashboard Notification Hub]
    H --> I[Mark as Read]
```
