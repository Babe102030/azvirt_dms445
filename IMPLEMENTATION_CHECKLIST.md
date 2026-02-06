# Geolocation Check-In System: Implementation Checklist

## Phase 1: Database Setup ✓

### Schema Migration
- [x] Add `projectSites` table to `drizzle/schema.ts`
- [x] Add `checkInRecords` table to `drizzle/schema.ts`
- [x] Add TypeScript type exports to schema
- [ ] Run `npm run db:generate` to create migration file
- [ ] Review generated SQL in `drizzle/migrations/`
- [ ] Run `npm run db:push` to apply migration to database
- [ ] Verify tables exist: `\dt projectSites; \dt checkInRecords;`
- [ ] Verify foreign keys are created correctly
- [ ] Verify default values are set properly
- [ ] Test cascade delete behavior (optional, careful!)

### Database Performance
- [ ] Create indexes on foreign keys (may be automatic)
- [ ] Create index on `checkInRecords.createdAt` for time-based queries
- [ ] Test query performance with EXPLAIN ANALYZE
- [ ] Document any slow queries for optimization

### Data Integrity
- [ ] Test NOT NULL constraints
- [ ] Test FK constraints (try to insert orphaned records)
- [ ] Test default values (check radiusMeters=50, isActive=true)
- [ ] Test cascade deletes (delete project → verify sites deleted)
- [ ] Test restrict delete (try to delete site with records → verify fails)

---

## Phase 2: Backend Implementation

### API Endpoint Setup
- [ ] Create `/app/api/check-in/route.ts` (or tRPC router)
- [ ] Import types from `@/drizzle/schema`
- [ ] Set up POST route handler
- [ ] Add request body logging (for debugging)

### Authentication & Authorization
- [ ] Verify JWT token is present and valid
- [ ] Extract user ID from token
- [ ] Fetch employee record for authenticated user
- [ ] Verify user owns the shift they're checking into
- [ ] Return 401 if authentication fails
- [ ] Return 403 if not authorized for shift

### Input Validation
- [ ] Import Zod schemas from `/shared/schemas/geolocation.ts`
- [ ] Validate request body with Zod
- [ ] Check latitude is between -90 and 90
- [ ] Check longitude is between -180 and 180
- [ ] Check accuracy is a positive number
- [ ] Return 400 with detailed error if validation fails
- [ ] Log validation errors for debugging

### Business Logic
- [ ] Fetch shift record from database
- [ ] Verify shift exists and is active
- [ ] Check if shift time window is valid (not before start, not too late after end)
- [ ] Fetch project site geofence data
- [ ] Verify site exists and is active
- [ ] Reject check-ins with poor GPS accuracy (> 50m threshold)
- [ ] Calculate distance from site center (Haversine formula)
- [ ] Determine if within geofence (distance <= radius)
- [ ] Handle edge cases (exactly on boundary, off by 1 meter, etc.)

### Data Persistence
- [ ] Create database transaction (if using Drizzle transactions)
- [ ] Insert check-in record with all fields populated
- [ ] Include ipAddress from request context
- [ ] Include userAgent from request headers
- [ ] Use current timestamp for createdAt
- [ ] Return inserted record ID and relevant data
- [ ] Handle database constraint violations gracefully

### Audit Logging
- [ ] Log to `complianceAuditTrail` table
- [ ] Record action: "check_in"
- [ ] Record entity type: "shift" or "check_in"
- [ ] Record entity ID: check-in record ID
- [ ] Record who performed the action (user ID)
- [ ] Include timestamp

### Error Handling
- [ ] Handle 400 Bad Request (invalid input)
- [ ] Handle 401 Unauthorized (no token)
- [ ] Handle 403 Forbidden (not authorized)
- [ ] Handle 404 Not Found (shift/site doesn't exist)
- [ ] Handle 409 Conflict (already checked in for this shift)
- [ ] Handle 500 Internal Server Error (database error)
- [ ] Return descriptive error messages
- [ ] Log errors for monitoring

### Response Format
- [ ] Return 200 OK on success
- [ ] Include check-in record ID in response
- [ ] Include timestamp in ISO 8601 format
- [ ] Include geofence validation result
- [ ] Include distance from site center
- [ ] Include GPS accuracy used
- [ ] Optional: include next expected check-in time (check-out)

### Rate Limiting
- [ ] Add rate limiting middleware
- [ ] Limit to 10 check-ins per employee per day
- [ ] Limit to 100 check-ins system-wide per minute
- [ ] Return 429 Too Many Requests if exceeded
- [ ] Log rate limit violations

### Testing
- [ ] Write unit tests for authentication flow
- [ ] Write unit tests for input validation
- [ ] Write unit tests for authorization checks
- [ ] Write unit tests for geofence calculation
- [ ] Write unit tests for database operations
- [ ] Write integration tests (full request → response)
- [ ] Test successful check-in within geofence
- [ ] Test check-in outside geofence (but still valid)
- [ ] Test poor GPS accuracy rejection
- [ ] Test missing shift (404)
- [ ] Test unauthorized user (403)
- [ ] Test invalid coordinates (400)
- [ ] Test duplicate check-in attempt (409)
- [ ] Achieve >80% code coverage

---

## Phase 3: Frontend Implementation

### Component Integration
- [ ] Review existing GeolocationCheckIn component in `client/src/components/`
- [ ] Enhanced version matches existing interface
- [ ] Import component into timesheet/shift page
- [ ] Pass required props (shiftId, projectSiteId)
- [ ] Handle success callback (update UI, show toast)
- [ ] Handle error callback (show error message)

### Geolocation Hook
- [ ] Review/create `useGeolocationCheckIn` hook in `client/src/hooks/`
- [ ] Request browser geolocation permission
- [ ] Handle permission denied gracefully
- [ ] Handle timeout (too long to get location)
- [ ] Handle position unavailable
- [ ] Watch position for real-time updates (optional)
- [ ] Return current position with accuracy

### UI Components
- [ ] Display current GPS coordinates
- [ ] Display GPS accuracy in meters
- [ ] Show status icon (green = good, yellow = poor, red = no signal)
- [ ] Display loading spinner while requesting location
- [ ] Display "Permission Denied" message if user rejects
- [ ] Show geofence status: "Within" / "Outside geofence"
- [ ] Display distance from site center (if available)
- [ ] [Check In] button - enabled only when location is good
- [ ] Disable button while submitting to API
- [ ] Optional: Show map preview of site (if have API key)

### API Integration
- [ ] Import API client from appropriate place
- [ ] Construct request payload (shiftId, latitude, longitude, accuracy)
- [ ] POST to `/api/check-in` endpoint
- [ ] Handle successful response (200 OK)
- [ ] Display success toast: "Check-in successful"
- [ ] Show check-in timestamp in UI
- [ ] Update shift status in timesheet view
- [ ] Handle error responses (400, 401, 403, 404, 409, 500)
- [ ] Display specific error message for each error type
- [ ] Retry logic (optional, for transient errors)

### Error Messages
- [ ] "Location permission denied - please enable in browser settings"
- [ ] "Unable to get your location - please check GPS"
- [ ] "Location accuracy too poor (XX meters) - try again"
- [ ] "You are outside the job site geofence"
- [ ] "Check-in failed: Not assigned to this shift"
- [ ] "Check-in failed: Already checked in"
- [ ] "Check-in failed: Shift not found"
- [ ] "Check-in failed: Server error - try again"

### Accessibility
- [ ] Component is keyboard accessible
- [ ] ARIA labels for all interactive elements
- [ ] Screen reader friendly error messages
- [ ] Color not sole indicator of status (use icons too)
- [ ] Sufficient contrast ratio (WCAG AA minimum)

### Mobile Responsiveness
- [ ] Component works on small screens
- [ ] Buttons are touch-friendly (min 44px height)
- [ ] Text is readable without zoom
- [ ] Map preview (if included) scales properly
- [ ] No horizontal scrolling on mobile

### Performance
- [ ] Debounce/throttle position updates if watching
- [ ] Don't make API calls too frequently
- [ ] Lazy load map component if included
- [ ] Component unmounts cleanly (cancel geolocation watches)
- [ ] No memory leaks

### Testing
- [ ] Write component unit tests
- [ ] Mock geolocation API
- [ ] Test successful check-in flow
- [ ] Test permission denied flow
- [ ] Test poor accuracy rejection
- [ ] Test API error handling
- [ ] Test loading states
- [ ] Test offline scenarios (optional)
- [ ] Manual testing on real device
- [ ] Manual testing on iOS and Android
- [ ] Test over HTTPS only (browser requirement)

---

## Phase 4: Project Sites Management

### Admin Panel (Backend)
- [ ] Create tRPC router or API routes for CRUD operations
- [ ] GET `/api/project-sites` - list all sites (with pagination)
- [ ] GET `/api/project-sites/:id` - get single site details
- [ ] POST `/api/project-sites` - create new site
- [ ] PATCH `/api/project-sites/:id` - update site
- [ ] DELETE `/api/project-sites/:id` - deactivate/delete site
- [ ] Verify user has admin role
- [ ] Validate input (required fields, coordinate bounds, radius)
- [ ] Log all CRUD operations to audit trail

### Admin Panel (Frontend)
- [ ] Create page at `/app/admin/project-sites`
- [ ] List all project sites in a table
- [ ] Show: name, project, location, radius, active status
- [ ] Add [Create New Site] button
- [ ] Add form to create new site
  - [ ] Project selector dropdown
  - [ ] Site name input
  - [ ] Description textarea
  - [ ] Latitude/longitude inputs (or map picker)
  - [ ] Radius slider (10-1000m)
  - [ ] Address, city, state, zip inputs
  - [ ] Active/inactive toggle
- [ ] Add edit functionality for existing sites
- [ ] Add delete/deactivate functionality
- [ ] Show confirmation before deleting
- [ ] Display map preview of geofence (optional)
- [ ] Export site list to CSV/Excel (optional)
- [ ] Bulk import sites from CSV (optional)

### Map Integration (Optional)
- [ ] Get Google Maps API key
- [ ] Store API key securely (environment variable)
- [ ] Use `ProjectSiteMap` component or similar
- [ ] Display site location on map
- [ ] Show circle representing geofence radius
- [ ] Display markers for recent check-ins (optional)
- [ ] Allow user to click on map to set coordinates

### Testing
- [ ] Test CRUD operations
- [ ] Test validation (invalid coordinates, negative radius)
- [ ] Test authorization (only admins can modify)
- [ ] Test audit logging
- [ ] Test with multiple projects
- [ ] Test geofence overlap scenarios
- [ ] Test deactivating site (check-ins still visible)

---

## Phase 5: Reporting & Analytics

### Check-In Dashboard
- [ ] Create page at `/app/reports/check-ins`
- [ ] Show total check-ins today/this week/this month
- [ ] Show check-in success rate (%)
- [ ] Show average GPS accuracy (meters)
- [ ] Show out-of-geofence incidents count
- [ ] Filter by date range
- [ ] Filter by employee/shift/site
- [ ] Export report to PDF/Excel

### Check-In History Table
- [ ] List all check-ins (paginated)
- [ ] Columns: Employee, Shift, Site, Time, Accuracy, Within Geofence, Distance
- [ ] Sort by any column
- [ ] Filter by employee/site/date
- [ ] Click to view details

### Employee Check-In Stats
- [ ] Show per-employee statistics
- [ ] Total check-ins this month
- [ ] Average GPS accuracy
- [ ] Out-of-geofence incidents
- [ ] Trend chart (check-ins over time)
- [ ] Compliance score (100% = all on-time, within geofence)

### Geofence Analytics
- [ ] Per-site statistics
- [ ] Total check-ins at each site
- [ ] Average distance from center
- [ ] Peak check-in times
- [ ] Out-of-geofence rate
- [ ] Suggest radius adjustments if needed

### Anomaly Detection (Optional)
- [ ] Flag impossible travel (teleportation between sites)
- [ ] Flag unusual times (check-in at 3 AM outside shift hours)
- [ ] Flag patterns (always on edge of geofence)
- [ ] Alert managers to investigate

### Testing
- [ ] Test filtering works correctly
- [ ] Test sorting works correctly
- [ ] Test pagination
- [ ] Test report export formatting
- [ ] Test with large datasets (performance)
- [ ] Test charts render correctly
- [ ] Test accessibility of tables and charts

---

## Phase 6: Security & Compliance

### HTTPS & Transport Security
- [ ] Ensure entire application runs on HTTPS
- [ ] Configure HSTS headers
- [ ] Test with Chrome DevTools (check for mixed content)
- [ ] Test on real mobile device over HTTPS

### Data Encryption
- [ ] Consider encrypting latitude/longitude at rest
- [ ] Use PostgreSQL pgcrypto extension if needed
- [ ] Encrypt in database, decrypt when needed
- [ ] Document encryption/decryption key management

### Access Control
- [ ] Employees can see only their own check-ins
- [ ] Managers can see their team's check-ins
- [ ] Admins can see all check-ins
- [ ] Implement row-level security in database (optional)
- [ ] Document access control rules

### Data Retention
- [ ] Implement automatic cleanup job
- [ ] Delete records older than 90 days (configurable)
- [ ] Run cleanup monthly (or per policy)
- [ ] Document retention policy
- [ ] Allow employees to request data deletion (GDPR)

### Audit Logging
- [ ] All check-ins logged to complianceAuditTrail
- [ ] All admin actions logged
- [ ] IP addresses logged
- [ ] User agents logged
- [ ] Timestamps in UTC
- [ ] Cannot be deleted/modified

### Privacy Compliance
- [ ] GDPR: Implement right to deletion
- [ ] GDPR: Implement data export feature
- [ ] CCPA: Document data collection practices
- [ ] CCPA: Implement opt-out mechanism
- [ ] Create privacy policy addendum for geolocation
- [ ] Get employee consent before collecting location
- [ ] Document legitimate business purpose
- [ ] Implement data minimization (collect only what needed)

### Security Testing
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Authentication bypass testing
- [ ] Authorization bypass testing
- [ ] Rate limit bypass testing
- [ ] Penetration testing (recommended)
- [ ] Security audit by third party (optional)

---

## Phase 7: Testing & QA

### Unit Tests
- [ ] Geolocation utilities (Haversine distance calculation)
- [ ] Coordinate validation (bounds checking)
- [ ] Geofence validation logic
- [ ] Input validation (Zod schemas)
- [ ] API request handlers
- [ ] Database operations
- [ ] Target: >80% code coverage

### Integration Tests
- [ ] Full check-in flow: geolocation → API → database
- [ ] Authentication flow
- [ ] Authorization flow
- [ ] Error scenarios (bad input, unauthorized, etc.)
- [ ] Database transaction rollback on error
- [ ] Audit logging

### End-to-End Tests
- [ ] Complete user journey: open app → check in → verify
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Cross-device testing (iPhone, Android, desktop)
- [ ] Use Playwright or Cypress for E2E tests

### Manual Testing
- [ ] Test on real iPhone with real GPS
- [ ] Test on real Android with real GPS
- [ ] Test various geofence distances (50m, 100m, 200m)
- [ ] Test at geofence boundary (edge cases)
- [ ] Test with poor GPS signal (high accuracy value)
- [ ] Test with no GPS signal (permission denied)
- [ ] Test with timeout (no location after 30 seconds)
- [ ] Test on different networks (4G, WiFi, 5G)
- [ ] Test with VPN enabled (may affect geolocation)
- [ ] Test during airplane mode (no location)
- [ ] Test in areas with poor connectivity

### Performance Testing
- [ ] Load test: 100+ simultaneous check-ins
- [ ] Stress test: 1000+ check-ins in one minute
- [ ] Database query performance
- [ ] API response time < 500ms target
- [ ] Component render time < 100ms
- [ ] No memory leaks after 100 check-ins

### Accessibility Testing
- [ ] Use aXe or similar tool
- [ ] Test with screen reader (NVDA, JAWS)
- [ ] Test keyboard navigation only
- [ ] Test with reduced motion enabled
- [ ] Test with high contrast mode
- [ ] Test color contrast ratios

### Browser/Device Matrix
- [ ] Chrome (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] iPhone 12+ (iOS 15+)
- [ ] Android 11+ devices
- [ ] Tablet testing (iPad, Samsung Tab)
- [ ] Older devices (iPhone 8, Android 10) - best effort

---

## Phase 8: Deployment & Monitoring

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Test with staging database
- [ ] Verify all endpoints work
- [ ] Verify all UI renders correctly
- [ ] Test with real users (beta testers)
- [ ] Collect feedback and iterate

### Production Deployment
- [ ] Create deployment checklist
- [ ] Backup production database before deployment
- [ ] Run database migrations in production
- [ ] Deploy API code to production
- [ ] Deploy frontend code to production
- [ ] Run smoke tests in production
- [ ] Monitor error logs for 1 hour after deployment
- [ ] Have rollback plan ready

### Monitoring & Observability
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Set up performance monitoring (New Relic, DataDog)
- [ ] Set up uptime monitoring
- [ ] Set up database monitoring
- [ ] Create dashboards for key metrics
- [ ] Set up alerts for errors/failures
- [ ] Log all check-in attempts (success and failure)
- [ ] Track check-in success rate
- [ ] Track average GPS accuracy
- [ ] Track out-of-geofence incidents
- [ ] Monitor API response times

### Analytics
- [ ] Track adoption (% of employees using)
- [ ] Track usage patterns (peak times, popular sites)
- [ ] Track accuracy improvements over time
- [ ] Track false positives (false out-of-geofence)
- [ ] Identify issues early (e.g., misconfigured sites)

### Documentation
- [ ] Create user guide for employees
- [ ] Create admin guide for site management
- [ ] Create troubleshooting guide
- [ ] Document known issues and workarounds
- [ ] Document API for third-party integrations
- [ ] Create architecture documentation
- [ ] Document database schema
- [ ] Document deployment process
- [ ] Document rollback procedure

### Support
- [ ] Create FAQ document
- [ ] Create support email/ticket system
- [ ] Train support team on geolocation features
- [ ] Create escalation process for issues
- [ ] Monitor support tickets

---

## Phase 9: Optimization & Future Improvements

### Performance Optimization
- [ ] Review slow database queries
- [ ] Add caching where appropriate
- [ ] Compress API responses
- [ ] Lazy load components
- [ ] Optimize images/assets
- [ ] Implement service worker (offline support)

### Feature Enhancements
- [ ] Multiple check-ins per shift (breaks)
- [ ] Automatic check-out at end of shift
- [ ] Geofence override with manager approval
- [ ] Offline check-in queuing (store locally, sync when online)
- [ ] Background tracking (native mobile app)
- [ ] Real-time location sharing (manager view)
- [ ] Heat maps of check-in patterns
- [ ] Anomaly detection & alerts

### UX Improvements
- [ ] Simplify check-in flow (one-tap?)
- [ ] Add haptic feedback on mobile
- [ ] Improve error messages (more user-friendly)
- [ ] Add tutorial/onboarding
- [ ] Dark mode support
- [ ] Localization (multiple languages)

### Data Quality
- [ ] Implement geofence polygon support (not just circles)
- [ ] Support multiple geofence definitions (time-based)
- [ ] Automated site radius suggestions (based on historical data)
- [ ] Timezone-aware timestamps
- [ ] Export check-in data for analysis

---

## Sign-Off & Launch

### Pre-Launch Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] User training completed
- [ ] Support team trained
- [ ] Backup and recovery plan in place
- [ ] Rollback plan ready
- [ ] Monitoring and alerts configured
- [ ] Legal review (compliance, privacy)
- [ ] Management approval obtained

### Launch
- [ ] Deploy to production (during low-traffic time)
- [ ] Monitor closely for first 24 hours
- [ ] Be ready to rollback if issues
- [ ] Communicate with users (email, in-app notification)
- [ ] Collect early feedback

### Post-Launch
- [ ] Monitor success rate for 1 week
- [ ] Fix any critical issues immediately
- [ ] Schedule retro meeting
- [ ] Document lessons learned
- [ ] Plan future improvements

---

## Document Control

| Item | Details |
|------|---------|
| Created | 2024-01-15 |
| Last Updated | 2024-01-15 |
| Status | DRAFT - Ready to use |
| Owner | Development Team |
| Related Docs | DRIZZLE_MIGRATION_GUIDE.md, GEOLOCATION_SCHEMA_SUMMARY.md, SCHEMA_ARCHITECTURE.md |

---

## Notes

- This is a comprehensive checklist for the complete implementation
- Not all items are critical for MVP (minimum viable product)
- Prioritize Phase 1-3 for initial launch
- Phase 4-9 can be done incrementally after launch
- Adjust timeline based on team capacity
- Review and update this checklist as you progress