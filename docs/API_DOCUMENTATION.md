# API Documentation

Complete API reference for YNM Safety Price Engine & CRM System.

## Authentication APIs

### POST /api/auth/login
User login endpoint.

**Request Body:**
```json
{
  "userId": "Admin",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "Admin",
    "department": "Sales",
    "isAdmin": true
  }
}
```

### POST /api/auth/change-password
Password reset endpoint.

**Request Body:**
```json
{
  "userId": "Admin",
  "resetCode": "YNMSafety@reset",
  "newPassword": "NewPassword@123",
  "captcha": "captcha_value"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Accounts APIs

### GET /api/accounts
List all accounts with filters.

**Query Parameters:**
- `employee` - Filter by assigned employee
- `isAdmin` - Boolean (true/false)
- `stage` - Filter by company stage
- `tag` - Filter by company tag
- `search` - Search by account name
- `sortBy` - Sort by 'last_activity' or 'name'

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "account_name": "Company Name",
      "company_stage": "Enterprise",
      "company_tag": "Customer",
      "engagement_score": 45.5,
      ...
    }
  ]
}
```

### POST /api/accounts
Create new account.

**Request Body:**
```json
{
  "accountName": "Company Name",
  "companyStage": "Enterprise",
  "companyTag": "Customer",
  "contactPerson": "John Doe",
  "phone": "+91 1234567890",
  "email": "contact@company.com",
  "assignedEmployee": "Employee1"
}
```

### GET /api/accounts/[id]
Get account details.

### PUT /api/accounts/[id]
Update account.

### DELETE /api/accounts/[id]
Delete account (admin only).

### GET /api/accounts/[id]/contacts
Get contacts for an account.

### POST /api/accounts/[id]/contacts
Create contact for an account.

**Request Body:**
```json
{
  "name": "Contact Name",
  "designation": "Manager",
  "phone": "+91 1234567890",
  "email": "contact@email.com",
  "call_status": "Connected",
  "follow_up_date": "2024-12-25T10:00:00Z"
}
```

### GET /api/accounts/[id]/activities
Get activities for an account.

### POST /api/accounts/[id]/activities
Create activity for an account.

**Request Body:**
```json
{
  "contact_id": 1,
  "employee_id": "Employee1",
  "activity_type": "call",
  "description": "Called contact",
  "metadata": {
    "call_status": "Connected"
  }
}
```

## Contacts APIs

### GET /api/contacts/[id]
Get contact details.

### PUT /api/contacts/[id]
Update contact.

### DELETE /api/contacts/[id]
Delete contact.

## CRM APIs

### GET /api/crm/customers
List customers with filters.

**Query Parameters:**
- `employee` - Filter by sales employee
- `isAdmin` - Boolean
- `city` - Filter by city
- `category` - Filter by category
- `active` - Filter by active status

### POST /api/crm/customers
Create customer.

### GET /api/crm/customers/[id]
Get customer details.

### PUT /api/crm/customers/[id]
Update customer.

### GET /api/crm/leads
List leads with filters.

### POST /api/crm/leads
Create lead.

### GET /api/crm/tasks
List tasks with filters.

**Query Parameters:**
- `employee` - Filter by assigned employee
- `status` - Filter by status
- `type` - Filter by task type
- `dueDate` - Filter by due date (today, overdue, upcoming)

### POST /api/crm/tasks
Create task.

### GET /api/crm/dashboard
Get dashboard data.

**Query Parameters:**
- `employee` - Employee username
- `isAdmin` - Boolean

**Response (Admin):**
```json
{
  "data": {
    "totalCustomers": 100,
    "totalLeads": 50,
    "totalQuotations": 200,
    "conversionRate": "15.50",
    "productBreakdown": {
      "mbcb": { "count": 100, "value": 5000000 },
      "signages": { "count": 50, "value": 2000000 },
      "paint": { "count": 50, "value": 1000000 }
    },
    "topEmployees": [...],
    "tasksDueToday": 5
  }
}
```

## Notifications APIs

### GET /api/notifications
List notifications for a user.

**Query Parameters:**
- `userId` - User ID
- `unreadOnly` - Boolean (true/false)

### POST /api/notifications
Create notification.

### PUT /api/notifications/[id]
Update notification (mark as seen/completed/snoozed).

**Request Body:**
```json
{
  "is_seen": true,
  "is_completed": false,
  "is_snoozed": true,
  "snooze_until": "2024-12-25T12:00:00Z"
}
```

## Quotation APIs

### GET /api/quotes
List all quotations.

**Query Parameters:**
- `limit` - Limit results
- `product_type` - Filter by type (mbcb, signages, paint)

### POST /api/quotes
Create quotation.

**Request Body:**
```json
{
  "section": "W-Beam",
  "place_of_supply": "Telangana",
  "customer_name": "Customer Name",
  "date": "2024-12-25",
  "final_total_cost": 100000,
  "created_by": "Employee1"
}
```

### POST /api/quotes/update-status
Update quotation status.

**Request Body:**
```json
{
  "quoteId": 1,
  "section": "mbcb",
  "status": "sent"
}
```

### POST /api/quotes/update-comments
Update quotation comments.

**Request Body:**
```json
{
  "quoteId": 1,
  "section": "mbcb",
  "comments": "Follow up required"
}
```

### GET /api/quotations/status-summary
Get quotation status summary for charts.

**Query Parameters:**
- `employee` - Filter by employee
- `isAdmin` - Boolean
- `accountId` - Filter by account

**Response:**
```json
{
  "data": [
    { "name": "Drafted", "value": 10 },
    { "name": "Sent", "value": 20 },
    { "name": "Closed Won", "value": 5 }
  ]
}
```

## Metadata APIs

### GET /api/meta/[type]
Get metadata (customers, places, purposes).

**Query Parameters:**
- `employee` - Filter customers by employee
- `isAdmin` - Boolean

### POST /api/meta/[type]
Create metadata entry.

**Request Body:**
```json
{
  "value": "New Customer Name",
  "salesEmployee": "Employee1"
}
```

## Error Responses

All APIs return errors in this format:

```json
{
  "error": "Error message here"
}
```

Status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

