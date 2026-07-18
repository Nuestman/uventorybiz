# MineAid HMS - Deployment Guide

## Production Deployment Checklist

> **Version 3.0.0**: This guide covers deployment to Railway (recommended) and Vercel.  
> For migration from Replit, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Railway Deployment (Recommended)

**Railway is recommended for Express.js monoliths** - it's designed for traditional Node.js apps and works seamlessly with our codebase.

📖 **See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for complete Railway deployment guide.**

### Quick Start

1. **Connect Repository**: Railway → New Project → Deploy from GitHub
2. **Set Environment Variables**: Add `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`, `FRONTEND_URL`
3. **Deploy**: Railway automatically deploys on every push

**That's it!** Railway handles everything automatically.

---

## Vercel Deployment (Serverless)

### Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- Neon PostgreSQL account ([neon.tech](https://neon.tech))
- Git repository (GitHub, GitLab, or Bitbucket)
- Domain name (optional, Vercel provides free subdomain)

### Environment Setup

#### Required Environment Variables

**In Vercel Dashboard → Project Settings → Environment Variables:**

```bash
# Database (Required)
# Use Neon production branch connection string
DATABASE_URL="postgresql://user:password@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Session Security (Required)
SESSION_SECRET="8c3f0d27d574dbf2c3cb9536cdcddb3eab201dd0118d3d503dd781e9e87fefe8076100c9c2fbbc45537cfab0583da9acd5d6e345db1ce036a84a393636bb4e60"

# Environment (Required)
NODE_ENV="production"

# Vercel Blob Storage (Optional but recommended)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxx"

# Frontend URL (Optional - auto-detected from VERCEL_URL)
FRONTEND_URL="https://your-domain.vercel.app"

# Email Service (Gmail SMTP)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"
```

#### Optional Environment Variables

```bash
# Monitoring and Logging
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="info"
```

#### Optional Environment Variables
```bash
# Redis for session storage (alternative to PostgreSQL)
REDIS_URL="redis://user:password@host:port"

# Monitoring and Logging
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="info"

# Rate Limiting
RATE_LIMIT_WINDOW="15" # minutes
RATE_LIMIT_MAX="100"   # requests per window
```

### Neon Database Setup

#### 1. Create Neon Account and Project

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project (e.g., `mineaidhms`)
3. Copy the connection string from the main branch (production)

#### 2. Create Development Branch (Optional)

1. In Neon dashboard, create a new branch named `development`
2. Use this branch for preview deployments
3. Copy the development branch connection string

#### 3. Run Schema Migration

> **Current workflow:** **[DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)** — do not use `migrations/schema.sql` for new installs.

**New empty database**

```bash
# Set DATABASE_URL in .env to the Neon branch connection string
npm run db:drizzle-migrate
npm run db:seed
```

**Existing database (already on legacy SQL)**

```bash
npm run db:drizzle-baseline -- --confirm
# Then for new schema changes: db:generate → db:drizzle-migrate
```

Avoid `npm run db:push` on legacy or partial databases (interactive rename prompts).

#### 4. Verify Database Schema

```sql
-- Drizzle tracking
SELECT COUNT(*) FROM drizzle.__drizzle_migrations;

-- Sample of current tables (87+ in public schema)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should include (among others):
-- encounters, portal_users, conversations, notification_types,
-- schema_migration_demos, telecare_sessions, …
```

#### 5. Set Up Database Branches

- **Production**: Use `main` branch for production environment
- **Development**: Create `development` branch for preview deployments
- **Local**: Use local PostgreSQL for local development (optional)

Configure different `DATABASE_URL` in Vercel for each environment:
- Production: Production branch connection string
- Preview: Development branch connection string
- Development: Local database (for local dev only)

### Vercel Blob Storage Setup

#### 1. Create Blob Store

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Create**
3. Select **Blob Store**
4. Name it (e.g., `mineaidhms-files`)
5. Copy the `BLOB_READ_WRITE_TOKEN`

#### 2. Configure in Environment Variables

Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables (see Environment Setup above).

#### 3. Verify File Uploads

Files will automatically use Vercel Blob when token is set. If not set, falls back to local filesystem (for development only).

### Email Service Integration

#### Gmail SMTP Setup (Current Implementation)

The system uses Gmail SMTP for email delivery:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification
   - Click "App passwords"
   - Generate password for "Mail"
3. **Set Environment Variables**:
   ```bash
   GMAIL_USER="your-email@gmail.com"
   GMAIL_APP_PASSWORD="your-16-character-app-password"
   ```

#### Email Features

- User invitation emails
- Email verification
- Password reset emails
- Admin approval notifications
- Status change notifications

### SMS Service Integration

#### Twilio Setup
1. Create Twilio account
2. Purchase phone number
3. Generate API credentials
4. Update SMS service in production:

```typescript
// Replace mock SMS service in server/modules/auth/auth.service.ts
private async sendVerificationSMS(phone: string, code: string) {
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  await client.messages.create({
    body: `Your MineAid verification code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
}
```

### Security Configuration

#### 1. Session Security
```typescript
// Update session configuration for production
const sessionSettings = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // No client-side access
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'strict' // CSRF protection
  },
  store: sessionStore
};
```

#### 2. CORS Configuration
```typescript
// Add CORS middleware for production
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 3. Rate Limiting
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Vercel Deployment Steps

#### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Select the repository containing MineAid HMS

#### 2. Configure Project Settings

Vercel will auto-detect settings from `vercel.json`:

- **Framework Preset**: Other
- **Root Directory**: `./` (project root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

The `vercel.json` file configures:
- Serverless function for API routes (`/api/*`)
- Static build for client (`/`)
- Proper routing and headers

#### 3. Set Environment Variables

Go to **Project Settings → Environment Variables** and add:

**Production Environment:**
```bash
DATABASE_URL=<production-neon-connection-string>
SESSION_SECRET=<production-secret>
NODE_ENV=production
BLOB_READ_WRITE_TOKEN=<your-blob-token>
FRONTEND_URL=<your-production-domain>
GMAIL_USER=<your-email>
GMAIL_APP_PASSWORD=<your-app-password>
```

**Preview Environment:**
```bash
DATABASE_URL=<development-neon-connection-string>
SESSION_SECRET=<dev-secret>
NODE_ENV=development
BLOB_READ_WRITE_TOKEN=<your-blob-token>
FRONTEND_URL=<preview-vercel-url>
GMAIL_USER=<your-email>
GMAIL_APP_PASSWORD=<your-app-password>
```

**Development Environment** (for local development only):
```bash
DATABASE_URL=<local-or-neon-dev-connection-string>
SESSION_SECRET=<dev-secret>
NODE_ENV=development
FRONTEND_URL=http://localhost:17009
GMAIL_USER=<your-email>
GMAIL_APP_PASSWORD=<your-app-password>
```

#### 4. Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (typically 2-5 minutes)
3. Visit your deployment URL (e.g., `mineaidhms.vercel.app`)

#### 5. Custom Domain (Optional)

1. Go to **Project Settings → Domains**
2. Add your custom domain (e.g., `mineaidhms.com`)
3. Configure DNS records as instructed by Vercel:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or add A record for apex domain
4. Wait for DNS propagation (up to 48 hours)
5. Update `FRONTEND_URL` environment variable to your custom domain

#### 6. Automatic Deployments

- **Production**: Automatic deployment on `main` branch push
- **Preview**: Automatic deployment for pull requests
- **Development**: Manual deployment or preview URLs

### Monitoring and Logging

#### 1. Application Monitoring
```typescript
// Add Sentry for error tracking
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

#### 2. Health Check Endpoint
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

#### 3. Logging Configuration
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Backup and Recovery

#### 1. Database Backups
```bash
# Automated daily backups
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

#### 2. File System Backups
```bash
# If storing uploaded files locally
tar -czf app_files_$DATE.tar.gz /path/to/uploads
```

### Performance Optimization

#### 1. Database Optimization
- Enable connection pooling
- Add database indexes for frequently queried fields
- Regular VACUUM and ANALYZE operations

#### 2. Application Optimization
- Enable gzip compression
- Implement caching for static assets
- Use CDN for asset delivery

#### 3. Frontend Optimization
- Bundle splitting for code efficiency
- Image optimization and lazy loading
- Service worker for offline functionality

### Alternative Deployment Options

#### Docker Deployment (Self-Hosted)

If you prefer self-hosting instead of Vercel:

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:17009"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
      - ./public:/app/public
```

#### Other Cloud Platforms

- **Railway**: Simple deployment with PostgreSQL and automatic HTTPS
- **Render**: Full-stack deployment with PostgreSQL add-on
- **AWS**: Deploy using AWS Lambda + RDS + S3
- **Google Cloud**: Cloud Run + Cloud SQL + Cloud Storage

For all platforms, ensure:
- `DATABASE_URL` points to Neon PostgreSQL
- Environment variables are configured
- Build command is `npm run build`
- Output directory is `dist`

### Post-Deployment Verification

#### 1. Functional Testing
- [ ] User registration and login
- [ ] Patient management operations
- [ ] Appointment scheduling
- [ ] Medical records creation
- [ ] Incident reporting
- [ ] Dashboard metrics

#### 2. Security Testing
- [ ] HTTPS enforcement
- [ ] Session security
- [ ] Input validation
- [ ] Rate limiting
- [ ] Error handling

#### 3. Performance Testing
- [ ] Load testing with concurrent users
- [ ] Database query performance
- [ ] API response times
- [ ] Memory usage monitoring

### Maintenance Schedule

#### Daily
- Monitor application logs
- Check system resource usage
- Verify backup completion

#### Weekly
- Review security logs
- Update dependencies
- Performance metrics analysis

#### Monthly
- Security audit
- Database maintenance
- Documentation updates

## Vercel-Specific Features

### Serverless Functions

API routes are deployed as serverless functions:
- Automatic scaling
- Zero-downtime deployments
- Global edge network
- Built-in monitoring

### Automatic HTTPS

Vercel provides:
- Automatic SSL certificates (Let's Encrypt)
- HTTP/2 support
- HTTPS redirect
- Perfect SSL scores

### Performance

- **Edge Network**: CDN for static assets
- **Serverless Functions**: Fast API responses
- **Automatic Optimizations**: Image optimization, compression
- **Analytics**: Built-in performance monitoring

### Monitoring

Vercel Dashboard provides:
- Function logs and errors
- Performance metrics
- Usage statistics
- Deployment history

## Database Management (Neon)

### Branch Management

- **Main Branch**: Production database
- **Development Branch**: Preview/testing database
- **Point-in-Time Restore**: Available for recovery

### Backups

Neon automatically provides:
- Continuous backups
- Point-in-time restore
- No manual backup scripts needed

### Connection Pooling

Neon includes built-in connection pooling:
- Connection string automatically uses pooling
- Optimized for serverless functions
- No additional configuration needed

## Troubleshooting

### Build Failures

**Issue**: Build fails with TypeScript errors

**Solution**:
- Run `npm run check` locally first
- Ensure all dependencies are in `package.json`
- Check Vercel build logs for specific errors

### Database Connection Issues

**Issue**: Cannot connect to Neon database

**Solution**:
- Verify `DATABASE_URL` is correct in Vercel dashboard
- Ensure connection string includes `?sslmode=require`
- Check Neon dashboard for connection status
- Verify database branch is active

### File Upload Issues

**Issue**: Files not uploading to Vercel Blob

**Solution**:
- Verify `BLOB_READ_WRITE_TOKEN` is set in Vercel
- Check Blob store exists and is accessible
- Review function logs for specific errors

### Environment Variable Issues

**Issue**: Environment variables not loading

**Solution**:
- Ensure variables are set for correct environment (Production/Preview)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

---

**Last Updated**: November 22, 2025  
**Version**: 3.0.0  
**Platform**: Vercel + Neon PostgreSQL  
**Contact**: MineAid Development Team