# Project Structure

## Overview

The application is organized into four main levels:

```
Organization
└── Workspace
    └── Project
        └── Task
```

Each level has a specific responsibility to keep the system scalable and easy to understand.

---

# Organization

An **Organization** represents a company, team, or group of people using the application.

It is the highest level in the hierarchy.

## Responsibilities

- Owns all application data
- Manages members
- Manages invitations
- Controls organization-level permissions
- Contains one or more workspaces

## Examples

- Acme Inc.
- Open Source Team
- Personal Company

---

# Workspace

A **Workspace** is used to organize projects inside an organization.

Think of it as a department, team, or area of work.

Every workspace belongs to exactly one organization.

```
Organization
├── Marketing
├── Development
├── HR
└── Finance
```

## Responsibilities

- Groups related projects
- Has its own members
- Allows different teams to work independently
- Controls workspace-level access

A user may belong to multiple workspaces within the same organization.

---

# Project

A **Project** is a collection of work with a specific goal.

Every project belongs to one workspace.

```
Workspace
├── Website Redesign
├── Mobile App
└── Backend API
```

## Responsibilities

- Organizes tasks
- Contains project members
- Tracks project progress
- Stores project settings

Projects should remain focused on one objective.

---

# Task

A **Task** represents a single piece of work.

Every task belongs to one project.

```
Project
├── Design Login Page
├── Implement Authentication
├── Fix Notification Bug
└── Deploy API
```

## Responsibilities

- Represents actionable work
- Has a status
- Can have assignees
- Can contain checklists
- Can have due dates
- Can have attachments
- Can have comments
- Can have subtasks

Tasks are the smallest work unit in the system.

---

# Complete Hierarchy

```
Organization
│
├── Members
├── Invitations
│
└── Workspace
    │
    ├── Members
    │
    └── Project
        │
        ├── Members
        ├── Task
        │   ├── Assignees
        │   ├── Checklist
        │   ├── Comments
        │   ├── Attachments
        │   └── Subtasks
        │
        └── Project Settings
```

---

# Relationships

| Entity       | Belongs To   | Can Contain                                            |
| ------------ | ------------ | ------------------------------------------------------ |
| Organization | —            | Workspaces, Members, Invitations                       |
| Workspace    | Organization | Projects, Members                                      |
| Project      | Workspace    | Tasks, Members                                         |
| Task         | Project      | Assignees, Checklists, Comments, Attachments, Subtasks |

---

# Design Principles

- Organizations isolate all data.
- Workspaces separate teams or areas of work.
- Projects organize work around a single objective.
- Tasks represent individual pieces of work.
- Permissions become more specific as you move down the hierarchy.
- Membership can exist at the organization, workspace, and project levels.
- Every resource has a single parent, creating a clear ownership chain.
