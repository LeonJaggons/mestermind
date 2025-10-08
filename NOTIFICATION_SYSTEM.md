# Notification System Implementation

## Overview

The notification system sends real-time alerts to professionals when new requests are posted that match their services. It includes:

- **In-app notifications** with badge counts
- **Email notifications** with detailed job information
- **SMS notifications** (optional, framework in place)
- **User preferences** for notification channels
- **Audit logging** for debugging delivery issues

---

## Architecture

```
Customer submits request (DRAFT → OPEN)
    ↓
NotificationService.notify_new_request()
    ↓
├─→ Find matching professionals (by service)
├─→ Create in-app notification records
├─→ Queue background email sending
├─→ Queue background SMS sending (optional)
└─→ Log all notification attempts
```

---

## Database Schema

### Tables Created

1. **`notifications`** - In-app notifications
   - Links to users/mesters, requests, offers, messages
   - Tracks read status and timestamps
   - Includes action URLs for navigation

2. **`notification_preferences`** - User preferences
   - Per-notification-type channel preferences
   - Quiet hours configuration
   - One-to-one with users/mesters

3. **`notification_logs`** - Audit trail
   - Tracks email/SMS delivery status
   - Provider message IDs
   - Error messages for debugging

### Indexes
- Optimized for fetching unread notifications
- Composite indexes for recipient + read status + timestamp

---

## Backend Setup

### 1. Run Migration

```bash
cd api
alembic upgrade head
```

This creates the notification tables and enum types.

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Email configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@mestermind.hu
FROM_NAME=Mestermind

# Optional: SMS configuration (Twilio - not yet implemented)
# TWILIO_ACCOUNT_SID=your_account_sid
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_FROM_NUMBER=+36123456789
```

**For Development**: If `SENDGRID_API_KEY` is not set, emails will be logged to console instead of sent.

### 3. Test the API

Start the API server:

```bash
cd api
./start.sh
```

Visit: http://localhost:8000/docs#/notifications

You'll see these endpoints:
- `GET /notifications` - List notifications
- `POST /notifications/{id}/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/{id}` - Delete notification
- `GET /notifications/preferences` - Get preferences
- `PATCH /notifications/preferences` - Update preferences

---

## How It Works

### Triggering Notifications

Notifications are automatically sent when a request status changes to **OPEN**:

```python
# In api/app/routes/requests.py (PATCH /{request_id})

if old_status != "OPEN" and new_status == "OPEN":
    notification_service = NotificationService(db)
    background_tasks.add_task(
        notification_service.notify_new_request,
        request_id=req.id,
        background_tasks=background_tasks
    )
```

### Matching Algorithm

The system finds professionals who:
1. **Offer the requested service** (`mester_services.service_id` matches)
2. **Have active service listings** (`is_active = true`)
3. **Are active professionals** (`mesters.is_active = true`)

**TODO**: Add geographic filtering based on `mester_coverage_areas` and request postal code.

### Notification Content

**In-app notification**:
- Title: "New [Service Name] lead in [Postal Code/area]"
- Body: Brief job details + timeline
- Action URL: `/pro/requests/{request_id}`

**Email notification** (HTML formatted):
- Subject: Same as title
- Body includes:
  - Service name and location
  - Customer name (if provided)
  - Timeline and other answers
  - Message from customer
  - Call-to-action button to view request
  - Tip about responding quickly
  - Link to update notification preferences

---

## Frontend Integration

### 1. Add NotificationBell to Header

```tsx
// In your Header component
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext'; // Or however you manage auth

export function Header() {
  const { user, token } = useAuth();

  return (
    <header>
      {/* ... other header content ... */}
      
      {user && token && (
        <NotificationBell token={token} />
      )}
    </header>
  );
}
```

### 2. Usage

The `NotificationBell` component:
- Shows a bell icon with unread badge count
- Polls for new notifications every 30 seconds
- Opens a dropdown with recent notifications
- Marks notifications as read when clicked
- Navigates to the action URL (e.g., request detail page)

### 3. Customization

You can customize the component styling by editing:
- `/client/src/components/NotificationBell.tsx`

Default styles use Tailwind CSS classes.

---

## API Usage Examples

### Get Unread Notifications

```typescript
import { getNotifications } from '@/lib/api';

const data = await getNotifications(token, { is_read: false });
console.log(data.items); // Array of notifications
console.log(data.unread_count); // Total unread count
```

### Mark as Read

```typescript
import { markNotificationRead } from '@/lib/api';

await markNotificationRead(notificationId, token);
```

### Get Preferences

```typescript
import { getNotificationPreferences } from '@/lib/api';

const prefs = await getNotificationPreferences(token);
console.log(prefs.preferences);
// {
//   new_request: { email: true, in_app: true, sms: false },
//   new_offer: { email: true, in_app: true, sms: false },
//   ...
// }
```

### Update Preferences

```typescript
import { updateNotificationPreferences } from '@/lib/api';

await updateNotificationPreferences(token, {
  preferences: {
    new_request: { email: false, in_app: true, sms: false },
    new_offer: { email: true, in_app: true, sms: true },
    new_message: { email: true, in_app: true, sms: false },
  },
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00"
});
```

---

## Email Service Configuration

### SendGrid Setup

1. **Sign up** at https://sendgrid.com
2. **Create an API Key**:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Enable "Mail Send" permission
   - Copy the key

3. **Verify sender domain**:
   - Go to Settings > Sender Authentication
   - Verify your domain (mestermind.hu)
   - Or use single sender verification for testing

4. **Add to `.env`**:
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   FROM_EMAIL=noreply@mestermind.hu
   FROM_NAME=Mestermind
   ```

### Email Template Customization

Edit the HTML template in:
- `api/app/services/notifications.py`
- Method: `_send_email_notification()`

The template includes:
- Responsive design
- Call-to-action button
- Customer details
- Job answers summary
- Unsubscribe link

---

## Testing

### 1. Test Notification Creation

```bash
# Create a request
curl -X POST http://localhost:8000/requests/ \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "your-service-uuid",
    "question_set_id": "your-question-set-uuid",
    "postal_code": "1066",
    "contact_email": "customer@example.com",
    "answers": {}
  }'

# Update status to OPEN (triggers notifications)
curl -X PATCH http://localhost:8000/requests/{request_id} \
  -H "Content-Type: application/json" \
  -d '{"status": "OPEN"}'
```

### 2. Check Logs

```bash
# In development, emails are logged to console
tail -f api/logs/app.log

# Look for:
# [DEV MODE] Would send email to...
# Or: Email sent successfully to...
```

### 3. Check Database

```sql
-- Check created notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check notification logs
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;

-- Check unread count for a mester
SELECT COUNT(*) FROM notifications 
WHERE mester_id = 'your-mester-uuid' AND is_read = false;
```

---

## Notification Types

Currently implemented:
- `NEW_REQUEST` - New job request matching professional's services

Future types (framework in place):
- `NEW_OFFER` - Professional sent you a quote
- `NEW_MESSAGE` - New message in conversation
- `BOOKING_CONFIRMED` - Job booking confirmed
- `REVIEW_REMINDER` - Reminder to leave a review
- `PAYMENT_RECEIVED` - Payment successfully processed

To add a new notification type:
1. Add to `NotificationType` enum in `api/app/models/database.py`
2. Add to default preferences in `NotificationService._get_default_preferences()`
3. Create a new `notify_*` method in `NotificationService`
4. Call it from the appropriate route/event

---

## Performance Considerations

### Scalability

**Current implementation**:
- Synchronous database writes for in-app notifications
- Background tasks for email/SMS (non-blocking)
- Simple matching algorithm (service ID only)

**For high scale** (1000+ mesters):
- Add Redis for caching mester-service mappings
- Use message queue (Celery + RabbitMQ) instead of FastAPI BackgroundTasks
- Batch email sending with SendGrid batch API
- Add geographic filtering to reduce notification volume

### Polling

The frontend polls every 30 seconds. For real-time updates:
- Implement WebSocket connections
- Use Server-Sent Events (SSE)
- Integrate with Firebase Cloud Messaging for push notifications

---

## Troubleshooting

### Notifications not appearing

1. **Check request status**:
   ```sql
   SELECT id, status FROM requests WHERE id = 'your-request-id';
   ```
   Must be `OPEN` to trigger notifications.

2. **Check matching mesters**:
   ```sql
   SELECT m.id, m.full_name, ms.service_id 
   FROM mesters m
   JOIN mester_services ms ON m.id = ms.mester_id
   WHERE ms.service_id = 'your-service-id' 
   AND ms.is_active = true 
   AND m.is_active = true;
   ```

3. **Check notification preferences**:
   ```sql
   SELECT * FROM notification_preferences 
   WHERE mester_id = 'your-mester-id';
   ```

### Emails not sending

1. **Check environment variables**:
   ```bash
   echo $SENDGRID_API_KEY
   ```

2. **Check notification logs**:
   ```sql
   SELECT * FROM notification_logs 
   WHERE status = 'failed' 
   ORDER BY sent_at DESC;
   ```

3. **Test SendGrid API key**:
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "personalizations": [{"to": [{"email": "test@example.com"}]}],
       "from": {"email": "noreply@mestermind.hu"},
       "subject": "Test",
       "content": [{"type": "text/plain", "value": "Test"}]
     }'
   ```

---

## Future Enhancements

### Short-term
- [ ] Add geographic filtering to matching algorithm
- [ ] Implement quiet hours logic (timezone-aware)
- [ ] Add professional response rate tracking
- [ ] Create notification settings page UI

### Medium-term
- [ ] WebSocket support for real-time notifications
- [ ] SMS integration (Twilio)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Email digest (daily summary of leads)

### Long-term
- [ ] ML-based notification relevance scoring
- [ ] A/B testing for notification copy
- [ ] Notification analytics dashboard
- [ ] Multi-language notification templates

---

## Files Modified/Created

### Backend
- ✅ `api/app/models/database.py` - Added notification models
- ✅ `api/app/models/schemas.py` - Added notification schemas
- ✅ `api/app/services/notifications.py` - Notification service (NEW)
- ✅ `api/app/services/email.py` - Email service (NEW)
- ✅ `api/app/routes/notifications.py` - Notification routes (NEW)
- ✅ `api/app/routes/__init__.py` - Export notifications router
- ✅ `api/app/__init__.py` - Include notifications router
- ✅ `api/app/routes/requests.py` - Trigger notifications on status change
- ✅ `api/migrations/versions/20251007_add_notifications.py` - Migration (NEW)

### Frontend
- ✅ `client/src/lib/api.ts` - Notification API functions
- ✅ `client/src/components/NotificationBell.tsx` - Notification UI (NEW)

---

## Support

For questions or issues:
1. Check this documentation
2. Review the code comments
3. Check application logs
4. Open an issue on GitHub

---

**Status**: ✅ Fully implemented and ready for testing

**Last Updated**: 2025-10-07
