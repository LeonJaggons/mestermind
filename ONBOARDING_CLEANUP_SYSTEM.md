# Onboarding Cleanup System

This document describes the comprehensive cleanup system implemented for handling abandoned pro onboarding flows in Mestermind.

## Overview

The onboarding cleanup system ensures that when users interrupt or abandon the pro onboarding process, all traces of their data are removed from:
- Database (onboarding drafts)
- Local storage (draft IDs and form data)
- Firebase Storage (uploaded images/logos)

## Components

### 1. Database Cleanup

#### API Endpoints (`/api/app/routes/cleanup.py`)
- `POST /cleanup/onboarding/abandoned?days_old=7` - Clean up drafts older than specified days
- `POST /cleanup/onboarding/by-email/{email}` - Clean up all drafts for specific email
- `GET /cleanup/onboarding/stats` - Get statistics about onboarding drafts

#### Database Model (`OnboardingDraft`)
- Stores draft data during onboarding process
- Includes email, phone, form data, current step, and submission status
- Automatically cleaned up when user signs out or abandons process

### 2. Client-Side Cleanup (`/client/src/lib/onboardingCleanup.ts`)

#### Functions
- `cleanupOnboardingLocalStorage()` - Remove draft IDs and form data from localStorage
- `cleanupOnboardingStorage(draftId)` - Delete uploaded files from Firebase Storage
- `cleanupOnboardingServer(options)` - Call server cleanup APIs
- `cleanupOnboardingData(options)` - Comprehensive cleanup function
- `setupOnboardingCleanupOnUnload()` - Set up cleanup on page unload

#### Cleanup Triggers
- User signs out (`/client/src/lib/auth.ts`)
- User navigates away from onboarding page
- Browser/tab is closed
- Session expires

### 3. Server-Side Cleanup Script (`/api/scripts/cleanup_abandoned_onboarding.py`)

#### Features
- Clean up abandoned drafts older than specified days (default: 7)
- Clean up drafts for specific email addresses
- Dry-run mode for previewing changes
- Detailed statistics and logging
- Confirmation prompts for destructive operations

#### Usage
```bash
# Show statistics
python scripts/cleanup_abandoned_onboarding.py --stats

# Dry run cleanup (preview changes)
python scripts/cleanup_abandoned_onboarding.py --dry-run --days=7

# Clean up abandoned drafts older than 7 days
python scripts/cleanup_abandoned_onboarding.py --days=7

# Clean up drafts for specific email
python scripts/cleanup_abandoned_onboarding.py --email=user@example.com
```

## Cleanup Triggers

### 1. User Sign Out
When a user signs out, the system automatically:
- Cleans up all onboarding drafts for their email
- Removes localStorage data
- Deletes uploaded files from Firebase Storage

### 2. Session Expiry
When a user's session expires:
- Auth state change triggers cleanup
- All traces are removed from client and server

### 3. Page Navigation
When user navigates away from onboarding:
- `beforeunload` event triggers cleanup
- Uses `navigator.sendBeacon` for reliable cleanup

### 4. Scheduled Cleanup
- Server-side script can be run via cron job
- Cleans up abandoned drafts older than 7 days
- Prevents database bloat from abandoned flows

## Data Cleaned Up

### Database
- `onboarding_drafts` table entries
- All draft data including form responses, uploaded file references

### Local Storage
- `onboarding_draft_id` - Current draft ID
- Any keys starting with `onboarding_` - Form data and state

### Firebase Storage
- `mesters/{draftId}/logo` - Uploaded business logos
- `mesters/{draftId}/profile-image` - Profile images
- `mesters/{draftId}/business-photo` - Business photos

## Implementation Details

### Client-Side Integration

The cleanup system is integrated into the onboarding flow:

```typescript
// In /client/src/pages/pro/onboarding.tsx
import { 
  cleanupOnboardingData, 
  setupOnboardingCleanupOnUnload,
  isInOnboardingFlow,
  getCurrentOnboardingDraftId 
} from '@/lib/onboardingCleanup';

// Set up cleanup on page unload
useEffect(() => {
  const cleanup = setupOnboardingCleanupOnUnload();
  return cleanup;
}, []);

// Clean up on auth state change (sign out)
useEffect(() => {
  const unsub = subscribeToAuthChanges((u) => {
    if (!u && isInOnboardingFlow()) {
      const draftId = getCurrentOnboardingDraftId();
      if (draftId) {
        cleanupOnboardingData({ 
          draftId, 
          cleanupStorage: true 
        });
      }
    }
  });
  return () => { if (unsub) unsub(); };
}, []);
```

### Server-Side Integration

The cleanup endpoints are integrated into the main API:

```python
# In /api/app/__init__.py
from app.routes.cleanup import router as cleanup_router
app.include_router(cleanup_router)
```

## Monitoring and Statistics

### API Statistics Endpoint
```bash
GET /cleanup/onboarding/stats
```

Returns:
```json
{
  "total_drafts": 20,
  "submitted_drafts": 4,
  "abandoned_drafts": 16,
  "abandoned_over_7_days": 6,
  "abandoned_over_30_days": 0,
  "submission_rate": 20.0
}
```

### Script Statistics
```bash
python scripts/cleanup_abandoned_onboarding.py --stats
```

## Best Practices

### 1. Graceful Degradation
- Cleanup failures don't block user actions
- Errors are logged but don't interrupt user flow
- Best-effort cleanup approach

### 2. Privacy Compliance
- All user data is completely removed
- No traces left in logs or analytics
- GDPR/privacy compliant cleanup

### 3. Performance
- Cleanup operations are asynchronous
- Use `sendBeacon` for reliable page unload cleanup
- Background tasks for server-side cleanup

### 4. Monitoring
- Regular statistics monitoring
- Alert on high abandonment rates
- Track cleanup success rates

## Testing

### Manual Testing
1. Start onboarding process
2. Upload files, fill forms
3. Sign out or close browser
4. Verify data is cleaned up

### Automated Testing
```bash
# Test cleanup script
python scripts/cleanup_abandoned_onboarding.py --dry-run

# Test API endpoints
curl -X GET http://localhost:8000/cleanup/onboarding/stats
```

## Maintenance

### Scheduled Cleanup
Set up a cron job to run cleanup regularly:

```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /path/to/mestermind/api && source venv/bin/activate && python scripts/cleanup_abandoned_onboarding.py --days=7
```

### Monitoring
- Monitor submission rates
- Track cleanup success
- Alert on high abandonment rates
- Regular database size monitoring

## Security Considerations

- Cleanup operations require no authentication (data is already abandoned)
- All cleanup operations are logged
- No sensitive data is retained after cleanup
- Firebase Storage cleanup includes proper error handling

## Future Enhancements

1. **Analytics Integration**: Track abandonment patterns
2. **Retry Logic**: Retry failed cleanup operations
3. **Batch Cleanup**: Optimize for large-scale cleanup
4. **User Notification**: Notify users of incomplete onboarding
5. **Recovery Options**: Allow users to resume abandoned flows

