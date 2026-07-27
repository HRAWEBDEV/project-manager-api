## v1.0.0

### TODO

- implement logging system
- write task approvers service and route

### Infrastructure

- Hono web framework running on Bun runtime
- PostgreSQL database with Drizzle ORM and connection pooling
- Zod validation integrated with Drizzle schemas (drizzle-zod)
- Request ID tracking, structured logging, CORS, and secure headers middleware
- Static file serving for uploaded images
- Health check endpoint (`GET /healthy`)
- Graceful shutdown handling (SIGINT/SIGTERM)

### Authentication & Sessions

- User signup with automatic organization creation (`POST /auth/signup`)
- User sign-in with username and password (`POST /auth/sign-in`)
- User logout with session revocation (`POST /auth/logout`)
- Session-based authentication using cookies
- Password hashing with Argon2
- Session tracking with IP address and user agent metadata

### User Management

- Get authenticated user info (`GET /users/info`)
- Get user's organizations (`GET /users/organizations`)
- Upload and delete user avatar (`POST /users/avatar`, `DELETE /users/avatar`)
- View pending invitations (`GET /users/me/invitations`)
- Accept or decline invitations (`PATCH /users/me/invitations/:id`)

### Organization Management

- Update organization name (`PATCH /organizations`)
- Upload organization logo (`POST /organizations/logo`)
- Organization invitations — send, list (`POST /organizations/invitations`, `GET /organizations/invitations`)
- Organization members — list, update role, remove (`GET /organizations/members`, `PATCH /organizations/members/:id`, `DELETE /organizations/members/:id`)
- Three-tier role system: owner, admin, member

### Workspace Management

- CRUD for workspaces (`GET/POST /workspaces`, `PATCH/DELETE /workspaces/:id`)
- Workspace members — list, add, update role, remove (`GET/POST /workspaces/members`, `PATCH/DELETE /workspaces/members/:id`)
- Two-tier role system: admin, member
- Creator automatically assigned as admin

### Project Management

- CRUD for projects (`GET/POST /projects`, `PATCH/DELETE /projects/:id`)
- Upload project icon (`POST /projects/:id/icon`)
- Project members — list, add, remove (`GET/POST /projects/:id/members`, `DELETE /projects/:projectId/members/:id`)
- Project archiving support
- Color and icon customization

### Task Management

- CRUD for tasks (`GET/POST /tasks`, `PATCH /tasks/:id`)
- Task assignees — view and update (`GET/PATCH /tasks/:id/assignees`)
- Task checklists — view and update (`GET/PATCH /tasks/:id/checklists`)
- Task tags — view and update (`GET/PATCH /tasks/:id/tags`)
- Subtask support via parent task references
- Date range tracking (start date, end date)
- Filtering by project and assignees

### Tags

- CRUD for workspace-scoped tags (`GET/POST /tags`, `PATCH/DELETE /tags/:id`)

### Boards

- CRUD for project-scoped kanban boards (`GET/POST /boards`, `PATCH/DELETE /boards/:id`)
- Position-based ordering with color customization

### Authorization

- Multi-tier permission system combining organization and workspace roles
- Role-based access control middleware at each hierarchy level
- Organization owners automatically granted workspace admin access
- Granular permissions for each resource type (read, create, update, delete)

### Database

- 16 schema tables with full relational integrity
- Automatic audit timestamps (createdAt, updatedAt) on core entities
- Cascade deletes across the entity hierarchy
- Unique constraints to prevent duplicate memberships and assignments
