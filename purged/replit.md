# MineAid - Healthcare Management System

## Overview
MineAid is a comprehensive healthcare management system designed for mining operations. It provides a digital solution for managing medical services, incident reporting, patient records, and appointment scheduling, accessible via web and mobile-responsive interfaces. The system centralizes medical operations, maintains detailed records for regulatory compliance, improves response times, and offers data-driven insights for safety improvements.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, using a component-based architecture. It leverages shadcn/ui components (built on Radix UI) and Tailwind CSS for styling and responsive design. Routing is managed by Wouter, and server state is handled by TanStack Query for efficient data fetching. Forms use `react-hook-form` with Zod validation.

### Backend Architecture
The server-side uses an Express.js REST API with TypeScript, organized into modular routes, storage, and database interactions. It supports a dual authentication system: Replit OpenID Connect and a custom email/phone authentication with secure password hashing and session management. The data layer uses a repository pattern to abstract database operations.

### Database Architecture
MineAid uses PostgreSQL as the primary database with Drizzle ORM for type-safe operations. It features a multi-tenant schema design with strict tenant isolation, ensuring all tables include `tenant_id` foreign keys for data separation. Drizzle migrations manage schema changes, and Neon serverless PostgreSQL with connection pooling is used for scalable connectivity.

### Authentication and Authorization
> **Note:** Legacy Replit-era project doc. Replit OAuth was removed in 4.x; auth is **staff auth** (`AuthService`) plus optional OIDC.

Server-side session management is implemented using PostgreSQL with `connect-pg-simple`. It supports user roles (medical_staff, safety_officers, administrators) and includes CSRF protection, secure session handling, and robust error management. Staff authentication features include email/phone registration, secure session tokens, verification systems (email, phone, password reset), and security features like password requirements and rate limiting. Automatic tenant assignment and strict data isolation are core to the security model.

### Super Admin System
A comprehensive Super Admin system provides global management capabilities with secure password-based authentication ("superadmin123"). Features include full tenant management (create, approve, status updates, plan management), complete tenant administrator CRUD operations (edit, delete, approve), user management across all tenants, and professional email notifications via SendGrid integration. All Super Admin operations include comprehensive audit logging for compliance and security tracking.

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL for scalable data storage.
- **Drizzle ORM**: Type-safe database toolkit.

### Authentication Services
- **Replit Authentication**: OpenID Connect provider.
- **Passport.js**: Authentication middleware.

### UI and Styling
- **Radix UI**: Accessible, unstyled UI primitives.
- **shadcn/ui**: Pre-built UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Development and Build Tools
- **Vite**: Fast development server and optimized production builds.
- **TypeScript**: Type system for compile-time type checking.
- **ESBuild**: Fast JavaScript bundler for server-side code.

### Data Management
- **TanStack Query**: Server state management.
- **React Hook Form**: Efficient form handling with validation.
- **Zod**: Schema validation library.
- **date-fns**: Date utility library.

### Session and Storage
- **connect-pg-simple**: PostgreSQL session store for Express.js.
- **express-session**: Session middleware for Express.js.

### Email Services
- **Nodemailer**: Professional email service using Gmail SMTP for tenant approval notifications and admin welcome emails.
- **Gmail SMTP**: Configured email transport for reliable message delivery.