# 🚀 AI Assistant - Deployment Checklist

**Project:** AzVirt DMS AI Assistant  
**Version:** 1.0  
**Date:** February 5, 2025

---

## ✅ Pre-Deployment Checklist

### 1. Server Requirements

- [ ] **Operating System:** Linux/Windows Server with Docker support
- [ ] **RAM:** Minimum 8GB (16GB recommended for multiple models)
- [ ] **Disk Space:** Minimum 50GB free (for AI models)
- [ ] **CPU:** Multi-core processor (GPU optional but recommended)
- [ ] **Network:** Stable internet connection for model downloads

### 2. Ollama Installation

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Verify installation
curl http://localhost:11434
```

**Expected Response:** `Ollama is running`

- [ ] Ollama installed successfully
- [ ] Ollama service running on port 11434
- [ ] Ollama accessible from application server

### 3. Model Installation

**Required Models (Minimum Setup):**

```bash
# Fast general-purpose chat model (5GB)
ollama pull qwen3:8b

# Vision/OCR model (2.3GB)
ollama pull granite3.2-vision:2b
```

**Recommended Additional Models:**

```bash
# Advanced reasoning (8.5GB)
ollama pull deepseek-r1:14b

# OCR specialist (6.4GB)
ollama pull deepseek-ocr:3b

# Code generation (3.7GB)
ollama pull deepseek-coder:6.7b
```

**Verify Models:**

```bash
ollama list
```

- [ ] At least 2 models installed (qwen3:8b, granite3.2-vision:2b)
- [ ] Models accessible via Ollama API
- [ ] Sufficient disk space for models

### 4. Environment Variables

Create/update `.env` file:

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Ollama Configuration (Required)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_VISION_MODEL=granite3.2-vision:2b

# Gemini API (Optional - for cloud models)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# AWS S3 Storage (Required for file uploads)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=azvirt-dms-storage

# Authentication (Required)
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Application
NODE_ENV=production
PORT=3000
```

**Verification:**

- [ ] All required environment variables set
- [ ] Database connection string correct
- [ ] Ollama URL accessible
- [ ] S3 credentials valid
- [ ] Clerk keys configured

### 5. Database Migration

```bash
# Generate migration files
pnpm db:push

# Verify AI tables exist
psql $DATABASE_URL -c "\d ai_conversations"
psql $DATABASE_URL -c "\d ai_messages"
```

**Expected Tables:**
- `ai_conversations` (id, userId, title, modelName, createdAt, updatedAt)
- `ai_messages` (id, conversationId, role, content, model, audioUrl, imageUrl, createdAt)

- [ ] Database migrations applied
- [ ] AI tables created successfully
- [ ] Indexes created for performance

### 6. Dependencies Installation

```bash
# Install all dependencies
pnpm install

# Verify no security vulnerabilities
pnpm audit

# Build application
pnpm build
```

- [ ] Dependencies installed without errors
- [ ] No critical security vulnerabilities
- [ ] Application builds successfully

---

## 🧪 Testing Checklist

### 1. Ollama Connection Test

```bash
# Run connection test
npx tsx test_ollama.ts
```

**Expected Output:**
```
✅ Ollama is running!
✅ Found X model(s)
✅ Chat successful!
```

- [ ] Ollama connection successful
- [ ] Models listed correctly
- [ ] Chat test passes

### 2. API Endpoints Test

**Test Chat Endpoint:**

```bash
curl -X POST http://localhost:3000/api/trpc/ai.chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Hello, test message",
    "model": "qwen3:8b"
  }'
```

- [ ] Chat endpoint responds
- [ ] Authentication works
- [ ] Response is valid

**Test Model List Endpoint:**

```bash
curl http://localhost:3000/api/trpc/ai.listModels \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] Models endpoint responds
- [ ] Returns list of available models
- [ ] Includes both Ollama and Gemini models (if configured)

### 3. Frontend Test

1. Navigate to: `http://localhost:3000/ai-assistant`
2. Test the following:

- [ ] Page loads without errors
- [ ] Model selector shows available models
- [ ] Can create new conversation
- [ ] Can send chat message
- [ ] Can receive AI response
- [ ] Voice recorder button appears
- [ ] Image upload button appears
- [ ] Prompt templates load
- [ ] Conversation list displays
- [ ] Can delete conversation

### 4. Voice Transcription Test

- [ ] Click microphone button
- [ ] Record 5-second audio
- [ ] Stop recording
- [ ] Audio transcribes successfully
- [ ] Message sends to AI

### 5. Image Upload Test

- [ ] Click image button
- [ ] Upload test image (invoice/document)
- [ ] Image preview appears
- [ ] OCR extraction works
- [ ] AI analyzes image correctly

### 6. Tool Execution Test

Send these test messages:

```
"How much cement do we have in stock?"
"Show me today's deliveries"
"Log 8 hours for test user on test project"
```

- [ ] search_materials tool executes
- [ ] get_delivery_status tool executes
- [ ] log_work_hours tool executes
- [ ] Tool responses are accurate

---

## 🔒 Security Checklist

### 1. Authentication & Authorization

- [ ] Clerk authentication properly configured
- [ ] Protected routes require authentication
- [ ] User sessions managed securely
- [ ] API endpoints validate user tokens

### 2. Data Protection

- [ ] Database uses SSL/TLS connection
- [ ] Environment variables not exposed
- [ ] S3 buckets have proper ACL settings
- [ ] File uploads validated (type, size)
- [ ] User data isolated (no cross-user access)

### 3. Rate Limiting (Recommended)

```typescript
// Add to server/_core/index.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/trpc/ai', limiter);
```

- [ ] Rate limiting configured
- [ ] DDoS protection enabled
- [ ] API abuse monitoring in place

### 4. Privacy Compliance

- [ ] User conversations are private
- [ ] Data retention policy defined
- [ ] GDPR compliance (if applicable)
- [ ] User can delete their data

---

## 📊 Performance Checklist

### 1. Response Times

**Target Metrics:**
- Chat response: < 5 seconds (local models)
- Image OCR: < 10 seconds
- Voice transcription: < 5 seconds
- Tool execution: < 2 seconds

**Test and verify:**

- [ ] Chat responses within target time
- [ ] Image processing acceptable
- [ ] Voice transcription timely
- [ ] No timeout errors

### 2. Resource Usage

**Monitor:**
- CPU usage during AI inference
- RAM consumption per model
- Disk I/O for model loading
- Network bandwidth for uploads

**Expected:**
- CPU: 40-80% during inference
- RAM: 4-8GB for qwen3:8b model
- Disk: Minimal after model loaded
- Network: Depends on file uploads

- [ ] CPU usage acceptable
- [ ] RAM not exhausted
- [ ] Disk space sufficient
- [ ] Network stable

### 3. Scaling Considerations

- [ ] Consider load balancer for multiple instances
- [ ] Database connection pooling configured
- [ ] File upload CDN (if high traffic expected)
- [ ] Model caching strategy in place

---

## 🚀 Deployment Steps

### 1. Staging Deployment

```bash
# Set environment to staging
export NODE_ENV=staging

# Build application
pnpm build

# Start server
pnpm start
```

- [ ] Deploy to staging environment
- [ ] Run all tests in staging
- [ ] Verify with test users
- [ ] Monitor logs for errors

### 2. Production Deployment

```bash
# Set environment to production
export NODE_ENV=production

# Build with optimizations
pnpm build

# Start with PM2 (process manager)
pm2 start dist/index.js --name azvirt-dms

# Or use systemd service
sudo systemctl start azvirt-dms
```

**Deployment Options:**

**Option A: Docker**
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Option B: Systemd Service**
```ini
# /etc/systemd/system/azvirt-dms.service
[Unit]
Description=AzVirt DMS Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/azvirt-dms
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

- [ ] Choose deployment method
- [ ] Deploy to production
- [ ] Verify service starts
- [ ] Check health endpoints

### 3. Post-Deployment Verification

```bash
# Health check
curl http://production-url/health

# AI Assistant test
curl http://production-url/ai-assistant

# Check logs
tail -f /var/log/azvirt-dms/app.log
```

- [ ] Application accessible
- [ ] AI Assistant page loads
- [ ] No errors in logs
- [ ] SSL certificate valid (HTTPS)

---

## 📱 Monitoring & Logging

### 1. Application Monitoring

**Setup monitoring for:**
- [ ] Application uptime
- [ ] API response times
- [ ] Error rates
- [ ] User activity

**Tools to consider:**
- Application: PM2, New Relic, Datadog
- Logs: ELK Stack, Grafana Loki
- Errors: Sentry

### 2. AI-Specific Monitoring

**Track:**
- [ ] Model inference times
- [ ] Tool execution success rates
- [ ] Voice transcription accuracy
- [ ] Image OCR success rates
- [ ] Conversation metrics (messages per session)

**Setup alerts for:**
- [ ] Ollama service down
- [ ] Model loading failures
- [ ] High error rates (>5%)
- [ ] Slow responses (>10s)

### 3. Log Configuration

```typescript
// server/_core/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export default logger;
```

- [ ] Logging configured
- [ ] Log rotation set up
- [ ] Logs forwarded to monitoring system

---

## 👥 User Onboarding

### 1. Documentation

- [ ] User guide shared (AI_ASSISTANT_USER_GUIDE.md)
- [ ] Training materials prepared
- [ ] Video tutorials recorded (optional)
- [ ] FAQ document created

### 2. Training Session

- [ ] Schedule training for users
- [ ] Demo key features:
  - Basic chat
  - Voice input
  - Image upload
  - Prompt templates
  - Tool execution
- [ ] Q&A session
- [ ] Collect feedback

### 3. Support Setup

- [ ] Support email configured
- [ ] Issue tracking system ready
- [ ] Escalation process defined
- [ ] Knowledge base articles created

---

## 🔧 Maintenance Plan

### Daily Tasks

- [ ] Check application logs for errors
- [ ] Monitor CPU/RAM usage
- [ ] Verify Ollama service running
- [ ] Check disk space

### Weekly Tasks

- [ ] Review user feedback
- [ ] Analyze conversation metrics
- [ ] Update prompt templates
- [ ] Performance optimization

### Monthly Tasks

- [ ] Update AI models (if new versions)
- [ ] Review and archive old conversations
- [ ] Security audit
- [ ] Backup verification

---

## 📋 Rollback Plan

**If deployment fails:**

### 1. Immediate Rollback

```bash
# Restore previous version
git checkout previous-release-tag
pnpm install
pnpm build
pnpm start

# Or with PM2
pm2 reload azvirt-dms
```

### 2. Database Rollback

```bash
# Restore database backup
pg_restore -d azvirt_dms backup_before_ai.sql
```

### 3. Communication

- [ ] Notify users of rollback
- [ ] Document rollback reason
- [ ] Create incident report
- [ ] Plan fix deployment

---

## ✅ Final Sign-Off

### Development Team

- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Documentation complete
- [ ] No known critical bugs

**Signed:** _________________ Date: _________

### Operations Team

- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan tested

**Signed:** _________________ Date: _________

### Product Owner

- [ ] Features meet requirements
- [ ] User acceptance testing passed
- [ ] Training materials approved
- [ ] Ready for production

**Signed:** _________________ Date: _________

---

## 🎯 Success Criteria

Deployment is considered successful when:

- ✅ Application accessible to all users
- ✅ AI Assistant responding within 5 seconds
- ✅ Voice transcription working
- ✅ Image OCR functioning
- ✅ Tools executing correctly
- ✅ No critical errors in logs
- ✅ 95%+ uptime in first week
- ✅ Positive user feedback

---

## 📞 Emergency Contacts

**Technical Issues:**
- On-call Engineer: [Phone/Email]
- DevOps Lead: [Phone/Email]
- Database Admin: [Phone/Email]

**Business Issues:**
- Product Owner: [Phone/Email]
- Project Manager: [Phone/Email]

**Escalation:**
- CTO: [Phone/Email]

---

## 📚 Reference Documents

- [AI_ASSISTANT_PLAN.md](./AI_ASSISTANT_PLAN.md) - Original implementation plan
- [AI_ASSISTANT_IMPLEMENTATION_STATUS.md](./AI_ASSISTANT_IMPLEMENTATION_STATUS.md) - Implementation details
- [AI_ASSISTANT_USER_GUIDE.md](./AI_ASSISTANT_USER_GUIDE.md) - User documentation
- [AI_FINAL_SUMMARY.md](./AI_FINAL_SUMMARY.md) - Complete summary
- [AI_CHECKLIST.md](./AI_CHECKLIST.md) - Feature checklist

---

**Version:** 1.0  
**Last Updated:** February 5, 2025  
**Status:** Ready for Deployment ✅

🚀 **Good luck with your deployment!**