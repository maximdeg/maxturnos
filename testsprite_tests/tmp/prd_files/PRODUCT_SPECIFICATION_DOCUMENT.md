# Product Specification Document (PSD)
## TestSprite Testing for MaxTurnos Application

**Version:** 1.1.0  
**Date:** 2026-01-23  
**Last Updated:** 2026-01-23  
**Project:** MaxTurnos - Medical Appointment Booking System  
**Testing Tool:** TestSprite

**Changelog:**
- v1.1.0 (2026-01-23): Updated authentication documentation to reflect dual-table login system (`user_accounts` and `users`), added admin credentials, updated TestSprite configuration
- v1.0.0 (2025-01-27): Initial PSD creation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Testing Objectives](#testing-objectives)
4. [Application Architecture](#application-architecture)
5. [User Personas and Roles](#user-personas-and-roles)
6. [Test Scope](#test-scope)
7. [Functional Test Scenarios](#functional-test-scenarios)
8. [API Endpoints Testing](#api-endpoints-testing)
9. [Frontend Pages Testing](#frontend-pages-testing)
10. [User Flows](#user-flows)
11. [Test Data Requirements](#test-data-requirements)
12. [Test Environment](#test-environment)
13. [Success Criteria](#success-criteria)
14. [Non-Functional Testing](#non-functional-testing)
15. [Risk Assessment](#risk-assessment)
16. [Test Execution Plan](#test-execution-plan)

---

## Executive Summary

### Purpose
This Product Specification Document (PSD) defines the comprehensive testing strategy for the **MaxTurnos** application using TestSprite. MaxTurnos is a multi-provider medical appointment booking system that enables patients to book appointments online and providers to manage their schedules.

### Key Testing Focus Areas
- **Frontend Testing**: User interface interactions, form submissions, and dynamic content rendering
- **Backend API Testing**: Endpoint functionality, data validation, and business logic
- **End-to-End User Flows**: Complete user journeys from appointment booking to cancellation
- **Multi-Provider Support**: Dynamic routing and provider-specific functionality
- **Authentication & Authorization**: Provider registration, email verification, and session management

### Testing Approach
- **Automated Testing**: Using TestSprite for frontend and backend test automation
- **Test Coverage**: Critical user paths, API endpoints, and edge cases
- **Test Types**: Functional, integration, UI/UX, and regression testing

---

## Product Overview

### Application Description
MaxTurnos is a Next.js-based web application designed for healthcare providers to manage patient appointments. The system supports:

- **Multi-provider architecture** with dynamic routes (`/[username]/agendar-visita`)
- **Patient appointment booking** without requiring user registration
- **Provider management dashboard** for scheduling and appointment management
- **WhatsApp integration** for appointment confirmations and cancellations
- **Health insurance integration** (Obras Sociales - Argentine healthcare system)
- **Secure cancellation system** with token-based links

### Technology Stack
- **Framework**: Next.js 15.4.0 (App Router)
- **Frontend**: React 19.0.0, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Authentication**: JWT tokens, bcrypt password hashing
- **Email**: Nodemailer (Google SMTP)
- **Notifications**: WhatsApp API (Whapi)
- **UI Components**: Radix UI, Tailwind CSS
- **State Management**: TanStack Query (React Query), Redux Toolkit

### Key Features
1. ✅ Dynamic appointment booking form with multi-step process
2. ✅ Real-time availability checking (20-minute intervals)
3. ✅ Provider work schedule management
4. ✅ Unavailable dates/time frames blocking
5. ✅ Health insurance filtering by visit type
6. ✅ Secure appointment cancellation (12-hour minimum notice)
7. ✅ Email verification for providers
8. ✅ Provider profile management
9. ✅ Appointment calendar view
10. ✅ WhatsApp notifications

---

## Testing Objectives

### Primary Objectives
1. **Validate Core Functionality**: Ensure all critical features work as specified
2. **Verify User Experience**: Confirm intuitive and smooth user interactions
3. **Ensure Data Integrity**: Validate data persistence and retrieval accuracy
4. **Test Security**: Verify authentication, authorization, and data protection
5. **Validate Business Rules**: Ensure appointment scheduling logic is correct
6. **Test Integration Points**: Verify WhatsApp, email, and database integrations

### Secondary Objectives
1. **Performance Testing**: Validate response times and system performance
2. **Cross-browser Compatibility**: Ensure consistent behavior across browsers
3. **Mobile Responsiveness**: Verify mobile device compatibility
4. **Error Handling**: Validate proper error messages and recovery
5. **Edge Case Coverage**: Test boundary conditions and unusual scenarios

---

## Application Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Patient    │  │   Provider   │  │   Public     │     │
│  │   Booking    │  │   Dashboard  │  │   Pages      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Next.js API)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Appointments │  │   Auth       │  │   Provider    │     │
│  │   API        │  │   API        │  │   API        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │   WhatsApp   │  │   Email      │
│  Database    │  │   (Whapi)    │  │  (Nodemailer)│
└──────────────┘  └──────────────┘  └──────────────┘
```

### Key Routes Structure

**Frontend Routes:**
- `/` - Landing page
- `/[username]` - Provider public page
- `/[username]/agendar-visita` - Appointment booking form
- `/[username]/cita/[id]` - Appointment details page
- `/[username]/verificar-email` - Email verification page
- `/proveedor/login` - Provider login
- `/proveedor/register` - Provider registration
- `/proveedor/perfil` - Provider dashboard

**API Routes:**
- `/api/appointments/*` - Appointment management
- `/api/auth/*` - Authentication endpoints
- `/api/available-times/*` - Availability checking
- `/api/health-insurance` - Health insurance options
- `/api/provider/*` - Provider data endpoints
- `/api/proveedor/*` - Provider management endpoints

---

## User Personas and Roles

### 1. Patient/Client (No Registration Required)
**Profile:**
- No account needed
- Books appointments directly
- Provides: name, surname, phone number
- Receives WhatsApp confirmation
- Can cancel via secure link

**Key Actions:**
- Browse provider pages
- Book appointments
- View appointment details
- Cancel appointments

### 2. Healthcare Provider (Registration Required)
**Profile:**
- Must register and verify email
- Manages schedule and availability
- Views and manages appointments
- Configures profile settings

**Key Actions:**
- Register account
- Verify email
- Login/logout
- Manage work schedule
- Set unavailable dates/times
- View appointments calendar
- Update profile
- Change password

### 3. System Administrator
**Profile:**
- Full system access
- Stored in `users` table (not `user_accounts`)
- No email verification required
- Can login immediately after account creation
- Roles: `admin` or `super_admin`

**Key Actions:**
- Manage user accounts
- System configuration
- View system logs
- Access all provider endpoints with admin privileges

**Authentication:**
- Uses same `/api/auth/login` endpoint as providers
- Login searches `user_accounts` first, then `users` table
- Returns `user_type: "admin"` and `role` in response
- No email verification check for admin accounts

---

## Test Scope

### In Scope

#### Frontend Testing
- ✅ Appointment booking form (multi-step)
- ✅ Provider public pages
- ✅ Provider dashboard
- ✅ Authentication pages (login/register)
- ✅ Email verification flow
- ✅ Appointment details page
- ✅ Calendar and date selection
- ✅ Time slot selection
- ✅ Form validation
- ✅ Error handling and messages
- ✅ Responsive design

#### Backend API Testing
- ✅ Appointment creation endpoint
- ✅ Appointment retrieval endpoints
- ✅ Appointment cancellation endpoint
- ✅ Availability checking endpoints
- ✅ Authentication endpoints (register, login, verify-email)
- ✅ Provider management endpoints
- ✅ Work schedule endpoints
- ✅ Health insurance endpoint
- ✅ Data validation
- ✅ Error responses
- ✅ Rate limiting

#### Integration Testing
- ✅ Database operations
- ✅ WhatsApp notification sending
- ✅ Email sending (verification)
- ✅ Token generation and validation
- ✅ Session management

#### Business Logic Testing
- ✅ Appointment scheduling rules
- ✅ Availability calculation (20-minute intervals)
- ✅ Cancellation policy (12-hour minimum)
- ✅ Provider-specific routing
- ✅ Health insurance filtering

### Out of Scope
- ❌ Load/Stress testing (separate performance testing)
- ❌ Security penetration testing (separate security audit)
- ❌ Third-party service testing (WhatsApp API, Email service)
- ❌ Database migration testing
- ❌ Deployment pipeline testing

---

## Functional Test Scenarios

### 1. Patient Appointment Booking Flow

#### Test Case 1.1: Successful Appointment Booking
**Objective:** Verify complete appointment booking process

**Preconditions:**
- Provider exists with configured work schedule
- Provider has available time slots
- Test provider username: `testprovider`

**Steps:**
1. Navigate to `/[username]/agendar-visita`
2. Select visit type: "Consulta"
3. Select consult type: "Primera vez"
4. Select health insurance: "Particular"
5. Enter patient name: "Juan"
6. Enter patient surname: "Pérez"
7. Enter phone number: "3421234567"
8. Select date from calendar (available date)
9. Select time slot from available times
10. Submit form

**Expected Results:**
- Form submits successfully
- Success message displayed
- Appointment created in database
- WhatsApp confirmation sent
- Redirect to appointment details page

**Test Data:**
```json
{
  "visit_type": "Consulta",
  "consult_type": "Primera vez",
  "health_insurance": "Particular",
  "patient_name": "Juan",
  "patient_surname": "Pérez",
  "phone_number": "3421234567",
  "appointment_date": "2025-02-15",
  "appointment_time": "09:00"
}
```

#### Test Case 1.2: Appointment Booking with Practice Type
**Objective:** Verify booking with "Práctica" visit type

**Steps:**
1. Navigate to booking form
2. Select visit type: "Práctica"
3. Select practice type: "Criocirugía"
4. Select health insurance: "Práctica Particular"
5. Complete remaining form fields
6. Submit

**Expected Results:**
- Practice type options displayed correctly
- Health insurance filtered appropriately
- Appointment created successfully

#### Test Case 1.3: Form Validation - Missing Required Fields
**Objective:** Verify form validation prevents submission with missing data

**Steps:**
1. Navigate to booking form
2. Attempt to submit without filling required fields
3. Try submitting with partial data

**Expected Results:**
- Validation errors displayed
- Form does not submit
- Error messages are clear and specific

#### Test Case 1.4: Unavailable Date Selection
**Objective:** Verify unavailable dates are disabled in calendar

**Steps:**
1. Navigate to booking form
2. Check calendar for unavailable dates
3. Attempt to select unavailable date

**Expected Results:**
- Unavailable dates are disabled/grayed out
- Cannot select unavailable dates
- Only available dates are selectable

#### Test Case 1.5: Time Slot Availability
**Objective:** Verify only available time slots are shown

**Steps:**
1. Navigate to booking form
2. Select an available date
3. Check available time slots
4. Book an appointment for a time slot
5. Refresh and check same date/time

**Expected Results:**
- Only available time slots displayed
- Booked time slots no longer appear
- Time slots update dynamically

### 2. Provider Registration and Authentication

#### Test Case 2.1: Provider Registration
**Objective:** Verify provider can register successfully

**Steps:**
1. Navigate to `/proveedor/register`
2. Enter email: `testprovider@example.com`
3. Enter username: `testprovider`
4. Enter password: `SecurePass123!`
5. Enter full name: `Dr. Test Provider`
6. Submit registration form

**Expected Results:**
- Registration successful
- Email verification sent
- User account created with `email_verified = false`
- Success message displayed
- Redirect to email verification page

#### Test Case 2.2: Email Verification
**Objective:** Verify email verification process

**Preconditions:**
- Provider registered but email not verified
- Verification token received via email

**Steps:**
1. Click verification link from email
2. Or navigate to `/[username]/verificar-email?token={token}`

**Expected Results:**
- Email verified successfully
- `email_verified` set to `true`
- Success message displayed
- Provider can now login

#### Test Case 2.3: Provider Login
**Objective:** Verify provider can login after email verification

**Steps:**
1. Navigate to `/proveedor/login`
2. Enter email: `testprovider@example.com` (or username if supported)
3. Enter password: `SecurePass123!`
4. Submit login form

**Expected Results:**
- Login successful
- JWT token created
- Session established
- Redirect to provider dashboard
- Response includes `user.username` field

#### Test Case 2.3a: Administrator Login
**Objective:** Verify administrator can login without email verification

**Preconditions:**
- Administrator account exists in `users` table
- Account has `role: "admin"` or `role: "super_admin"`

**Steps:**
1. Navigate to `/proveedor/login` (or use API directly)
2. Enter email: `maxdegdev.test@gmail.com`
3. Enter password: `admin1234`
4. Submit login form

**Expected Results:**
- Login successful (no email verification required)
- JWT token created
- Response includes `user.role` and `user.user_type: "admin"`
- Session established
- Can access admin endpoints

#### Test Case 2.4: Login with Invalid Credentials
**Objective:** Verify error handling for invalid login

**Steps:**
1. Navigate to login page
2. Enter incorrect username/password
3. Submit form

**Expected Results:**
- Login fails
- Error message displayed
- No session created
- User remains on login page

#### Test Case 2.5: Duplicate Registration
**Objective:** Verify system prevents duplicate registrations

**Steps:**
1. Attempt to register with existing email
2. Attempt to register with existing username

**Expected Results:**
- Registration fails
- Error message: "Email/Username already exists"
- No duplicate account created

### 3. Appointment Cancellation

#### Test Case 3.1: Patient Cancellation via Secure Link
**Objective:** Verify patient can cancel appointment using secure token

**Preconditions:**
- Appointment exists
- Cancellation token available
- Appointment is more than 12 hours away

**Steps:**
1. Navigate to appointment cancellation link
2. Confirm cancellation

**Expected Results:**
- Cancellation successful
- Appointment status updated to "cancelled"
- WhatsApp cancellation message sent
- Success message displayed

#### Test Case 3.2: Cancellation Policy - 12 Hour Minimum
**Objective:** Verify cancellation cannot occur within 12 hours

**Preconditions:**
- Appointment exists
- Appointment is less than 12 hours away

**Steps:**
1. Attempt to cancel appointment via link

**Expected Results:**
- Cancellation blocked
- Error message: "Cannot cancel within 12 hours"
- Token expired/invalid
- Appointment remains scheduled

#### Test Case 3.3: Provider Cancellation
**Objective:** Verify provider can cancel appointments

**Preconditions:**
- Provider logged in
- Appointment exists for provider

**Steps:**
1. Navigate to provider dashboard
2. View appointments
3. Select appointment to cancel
4. Confirm cancellation

**Expected Results:**
- Cancellation successful
- Appointment status updated
- WhatsApp message sent to patient
- Appointment removed from active list

### 4. Provider Dashboard

#### Test Case 4.1: View Appointments Calendar
**Objective:** Verify provider can view appointments in calendar

**Steps:**
1. Login as provider
2. Navigate to `/proveedor/perfil`
3. View calendar tab

**Expected Results:**
- Calendar displayed
- Appointments shown on correct dates
- Appointment details visible on hover/click

#### Test Case 4.2: Manage Work Schedule
**Objective:** Verify provider can set work schedule

**Steps:**
1. Login as provider
2. Navigate to work schedule section
3. Select working days (e.g., Monday-Friday)
4. Set start time: `09:00`
5. Set end time: `18:00`
6. Save schedule

**Expected Results:**
- Work schedule saved
- Schedule reflected in availability calculation
- Available time slots updated accordingly

#### Test Case 4.3: Set Unavailable Dates
**Objective:** Verify provider can block specific dates

**Steps:**
1. Login as provider
2. Navigate to unavailable days section
3. Select date to block
4. Confirm unavailable day

**Expected Results:**
- Date marked as unavailable
- Date no longer appears in booking calendar
- Unavailable date saved in database

#### Test Case 4.4: Update Provider Profile
**Objective:** Verify provider can update profile information

**Steps:**
1. Login as provider
2. Navigate to profile settings
3. Update full name
4. Update WhatsApp phone number
5. Save changes

**Expected Results:**
- Profile updated successfully
- Changes reflected immediately
- Success message displayed

#### Test Case 4.5: Change Password
**Objective:** Verify provider can change password

**Steps:**
1. Login as provider
2. Navigate to password change section
3. Enter current password
4. Enter new password
5. Confirm new password
6. Save changes

**Expected Results:**
- Password changed successfully
- Provider can login with new password
- Old password no longer works

### 5. Availability and Scheduling Logic

#### Test Case 5.1: Available Times Calculation
**Objective:** Verify correct calculation of available time slots

**Preconditions:**
- Provider work schedule: Monday-Friday, 09:00-18:00
- No existing appointments
- No unavailable time frames

**Steps:**
1. Request available times for a Monday
2. Check returned time slots

**Expected Results:**
- Time slots generated in 20-minute intervals
- Slots start at 09:00, end at 17:40
- Format: `["09:00", "09:20", "09:40", ..., "17:40"]`

#### Test Case 5.2: Time Slot Filtering
**Objective:** Verify booked time slots are excluded

**Preconditions:**
- Appointment exists at 10:00
- Appointment exists at 14:20

**Steps:**
1. Request available times for same date
2. Check returned slots

**Expected Results:**
- 10:00 and 14:20 not in available slots
- Other slots still available
- Slots update dynamically

#### Test Case 5.3: Unavailable Time Frame Blocking
**Objective:** Verify blocked time frames are excluded

**Preconditions:**
- Unavailable time frame: 14:00-15:00

**Steps:**
1. Request available times
2. Check returned slots

**Expected Results:**
- Slots between 14:00-15:00 excluded
- Only available slots returned

### 6. Health Insurance Integration

#### Test Case 6.1: Health Insurance Options Loading
**Objective:** Verify health insurance options load correctly

**Steps:**
1. Navigate to booking form
2. Check health insurance dropdown

**Expected Results:**
- Health insurance options loaded
- Options include: "Particular", "Práctica Particular", and obras sociales
- Prices displayed correctly

#### Test Case 6.2: Health Insurance Filtering by Visit Type
**Objective:** Verify insurance options filtered by visit type

**Steps:**
1. Select visit type: "Consulta"
2. Check health insurance options
3. Change to visit type: "Práctica"
4. Check health insurance options again

**Expected Results:**
- Options filtered appropriately
- Invalid combinations prevented
- Correct options shown for each type

---

## API Endpoints Testing

### Authentication Endpoints

#### POST `/api/auth/register`
**Test Scenarios:**
- ✅ Valid registration data
- ✅ Duplicate email
- ✅ Duplicate username
- ✅ Invalid email format
- ✅ Weak password
- ✅ Missing required fields

**Expected Status Codes:**
- `200`: Registration successful
- `400`: Validation error
- `500`: Server error

#### GET `/api/auth/verify-email`
**Test Scenarios:**
- ✅ Valid verification token
- ✅ Invalid token
- ✅ Expired token
- ✅ Already verified email

**Expected Status Codes:**
- `200`: Email verified
- `400`: Invalid token
- `404`: Token not found

#### POST `/api/auth/login`
**Description:** Authenticates both providers (`user_accounts` table) and administrators (`users` table). The endpoint searches in `user_accounts` first, then in `users` if not found.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "email_verified": true,
    "username": "provider_username",  // For providers only
    "role": "super_admin",            // For admins only
    "user_type": "admin"              // For admins only
  }
}
```

**Test Scenarios:**
- ✅ Valid provider credentials (from `user_accounts`)
- ✅ Valid admin credentials (from `users`)
- ✅ Invalid email
- ✅ Invalid password
- ✅ Unverified email (providers only - returns 403)
- ✅ Missing credentials
- ✅ Admin login (no email verification required)

**Expected Status Codes:**
- `200`: Login successful
- `400`: Invalid request data
- `401`: Invalid credentials (user not found or wrong password)
- `403`: Email not verified (providers only)
- `500`: Server error

**Authentication Details:**
- **Type**: Bearer Token (JWT)
- **Token Field**: `response.token`
- **Header Format**: `Authorization: Bearer {token}`
- **Token Expiration**: 24 hours
- **Algorithm**: HS256
- **Protected Routes**: `/api/proveedor/*` (requires Bearer token)

### Appointment Endpoints

#### POST `/api/appointments/create`
**Test Scenarios:**
- ✅ Valid appointment data
- ✅ Missing required fields
- ✅ Invalid date format
- ✅ Invalid time format
- ✅ Time slot already booked
- ✅ Date outside work schedule
- ✅ Invalid provider username

**Expected Status Codes:**
- `201`: Appointment created
- `400`: Validation error
- `404`: Provider not found
- `409`: Time slot unavailable

#### GET `/api/appointments/[id]`
**Test Scenarios:**
- ✅ Valid appointment ID
- ✅ Invalid appointment ID
- ✅ With valid token
- ✅ Without token

**Expected Status Codes:**
- `200`: Appointment retrieved
- `404`: Appointment not found
- `401`: Unauthorized (if token required)

#### POST `/api/appointments/[id]/cancel`
**Test Scenarios:**
- ✅ Valid cancellation (12+ hours before)
- ✅ Cancellation within 12 hours
- ✅ Already cancelled appointment
- ✅ Invalid appointment ID
- ✅ Invalid cancellation token

**Expected Status Codes:**
- `200`: Cancellation successful
- `400`: Cannot cancel (too close)
- `404`: Appointment not found
- `410`: Already cancelled

#### GET `/api/appointments/date/[date]`
**Test Scenarios:**
- ✅ Valid date with appointments
- ✅ Valid date without appointments
- ✅ Invalid date format
- ✅ Future date

**Expected Status Codes:**
- `200`: Appointments retrieved
- `400`: Invalid date format

### Availability Endpoints

#### GET `/api/available-times/[date]`
**Test Scenarios:**
- ✅ Valid date with available slots
- ✅ Valid date without available slots
- ✅ Date outside work schedule
- ✅ Date with all slots booked
- ✅ Invalid date format
- ✅ Missing user_account_id parameter

**Expected Status Codes:**
- `200`: Available times retrieved
- `400`: Invalid date or missing parameter
- `404`: Provider not found

#### GET `/api/provider/[username]/work-schedule`
**Test Scenarios:**
- ✅ Valid provider username
- ✅ Invalid provider username
- ✅ Provider without work schedule

**Expected Status Codes:**
- `200`: Work schedule retrieved
- `404`: Provider not found

### Provider Management Endpoints

#### GET `/api/proveedor/appointments`
**Test Scenarios:**
- ✅ Authenticated provider
- ✅ Unauthenticated request
- ✅ Provider with appointments
- ✅ Provider without appointments

**Expected Status Codes:**
- `200`: Appointments retrieved
- `401`: Unauthorized

#### GET `/api/proveedor/calendar`
**Test Scenarios:**
- ✅ Authenticated provider
- ✅ Calendar data retrieval
- ✅ Date range filtering

**Expected Status Codes:**
- `200`: Calendar data retrieved
- `401`: Unauthorized

#### PUT `/api/proveedor/profile`
**Test Scenarios:**
- ✅ Valid profile update
- ✅ Invalid email format
- ✅ Duplicate email
- ✅ Invalid phone format
- ✅ Unauthenticated request

**Expected Status Codes:**
- `200`: Profile updated
- `400`: Validation error
- `401`: Unauthorized

#### PUT `/api/proveedor/profile/password`
**Test Scenarios:**
- ✅ Valid password change
- ✅ Incorrect current password
- ✅ Weak new password
- ✅ Same password as current
- ✅ Unauthenticated request

**Expected Status Codes:**
- `200`: Password changed
- `400`: Validation error
- `401`: Unauthorized

#### POST `/api/proveedor/work-schedule`
**Test Scenarios:**
- ✅ Valid work schedule
- ✅ Invalid time format
- ✅ Invalid day selection
- ✅ Overlapping schedules

**Expected Status Codes:**
- `200`: Schedule saved
- `400`: Validation error
- `401`: Unauthorized

#### POST `/api/proveedor/unavailable-days`
**Test Scenarios:**
- ✅ Valid unavailable date
- ✅ Invalid date format
- ✅ Past date
- ✅ Duplicate unavailable date

**Expected Status Codes:**
- `201`: Unavailable day created
- `400`: Validation error
- `401`: Unauthorized

### Health Insurance Endpoint

#### GET `/api/health-insurance`
**Test Scenarios:**
- ✅ Successful retrieval
- ✅ JSON structure validation
- ✅ All obras sociales included

**Expected Status Codes:**
- `200`: Health insurance options retrieved
- `500`: File read error

---

## Frontend Pages Testing

### Public Pages

#### Landing Page (`/`)
**Test Scenarios:**
- ✅ Page loads correctly
- ✅ Navigation links work
- ✅ Responsive design
- ✅ Content displays properly

#### Provider Public Page (`/[username]`)
**Test Scenarios:**
- ✅ Valid provider username displays page
- ✅ Invalid provider username shows 404
- ✅ Provider information displayed
- ✅ Booking link works
- ✅ Responsive layout

### Appointment Booking Flow

#### Booking Form (`/[username]/agendar-visita`)
**Test Scenarios:**
- ✅ Form loads for valid provider
- ✅ Multi-step form navigation
- ✅ Visit type selection
- ✅ Consult/Practice type selection
- ✅ Health insurance dropdown
- ✅ Patient information fields
- ✅ Calendar date selection
- ✅ Time slot selection
- ✅ Form validation
- ✅ Form submission
- ✅ Success/error messages
- ✅ Loading states
- ✅ Responsive design

**UI Elements to Test:**
- Visit type radio buttons
- Consult/Practice type select
- Health insurance select dropdown
- Patient name/surname inputs
- Phone number input
- Calendar component
- Time slot select
- Submit button
- Form progress indicator
- Error message displays

#### Appointment Details Page (`/[username]/cita/[id]`)
**Test Scenarios:**
- ✅ Valid appointment ID displays details
- ✅ Invalid appointment ID shows error
- ✅ Appointment information displayed correctly
- ✅ Cancellation button/link visible
- ✅ Cancellation flow works
- ✅ Responsive design

### Provider Authentication Pages

#### Registration Page (`/proveedor/register`)
**Test Scenarios:**
- ✅ Form loads correctly
- ✅ All input fields present
- ✅ Form validation
- ✅ Registration submission
- ✅ Success message
- ✅ Error handling
- ✅ Redirect after registration

**UI Elements to Test:**
- Email input
- Username input
- Password input
- Full name input
- Submit button
- Validation messages
- Loading state

#### Login Page (`/proveedor/login`)
**Test Scenarios:**
- ✅ Form loads correctly
- ✅ Login submission
- ✅ Success redirect
- ✅ Error messages
- ✅ Remember me functionality (if implemented)
- ✅ Forgot password link (if implemented)

**UI Elements to Test:**
- Username/email input
- Password input
- Submit button
- Error message display
- Loading state

#### Email Verification Page (`/[username]/verificar-email`)
**Test Scenarios:**
- ✅ Valid token verifies email
- ✅ Invalid token shows error
- ✅ Expired token shows error
- ✅ Already verified shows message
- ✅ Success message displayed

### Provider Dashboard

#### Provider Profile Page (`/proveedor/perfil`)
**Test Scenarios:**
- ✅ Requires authentication
- ✅ Dashboard loads correctly
- ✅ Tabs navigation works
- ✅ Appointments tab displays data
- ✅ Calendar tab displays calendar
- ✅ Profile tab displays form
- ✅ Work schedule section
- ✅ Unavailable days section
- ✅ Responsive design

**UI Components to Test:**
- Tab navigation
- Appointments list/table
- Calendar component
- Profile form
- Work schedule form
- Unavailable days form
- Save buttons
- Success/error messages

---

## User Flows

### Flow 1: Complete Patient Booking Journey
```
1. Patient visits provider page
   → GET /[username]
   
2. Clicks "Agendar Visita"
   → Navigate to /[username]/agendar-visita
   
3. Selects visit type
   → UI: Radio button selection
   
4. Selects consult/practice type
   → UI: Dropdown selection
   
5. Selects health insurance
   → API: GET /api/health-insurance
   → UI: Filtered dropdown
   
6. Enters patient information
   → UI: Form inputs
   
7. Selects date
   → API: GET /api/provider/[username]/work-schedule
   → UI: Calendar with available dates
   
8. Selects time slot
   → API: GET /api/available-times/[date]
   → UI: Time slot dropdown
   
9. Submits form
   → API: POST /api/appointments/create
   → Database: Create client + appointment
   → External: WhatsApp notification sent
   → UI: Success message + redirect
   
10. Views appointment details
    → GET /[username]/cita/[id]
    → API: GET /api/appointments/[id]
```

### Flow 2: Provider Registration and Setup
```
1. Provider visits registration page
   → GET /proveedor/register
   
2. Fills registration form
   → UI: Form inputs
   
3. Submits registration
   → API: POST /api/auth/register
   → Database: Create user_account (email_verified=false)
   → External: Email verification sent
   → UI: Success message
   
4. Receives verification email
   → External: Email with verification link
   
5. Clicks verification link
   → GET /api/auth/verify-email?token={token}
   → Database: Update email_verified=true
   → UI: Success message
   
6. Logs in
   → GET /proveedor/login
   → POST /api/auth/login
   → Database: Search in `user_accounts`, then `users` if not found
   → Database: Verify password with bcrypt
   → Database: Check email_verified (providers only)
   → Generate JWT token
   → UI: Redirect to dashboard
   
7. Sets work schedule
   → GET /proveedor/perfil
   → POST /api/proveedor/work-schedule
   → Database: Save work schedule
   
8. Views appointments
   → GET /api/proveedor/appointments
   → UI: Display appointments
```

### Flow 3: Appointment Cancellation
```
1. Patient receives WhatsApp confirmation
   → External: WhatsApp message with cancellation link
   
2. Clicks cancellation link
   → GET /[username]/cita/[id]?token={cancellation_token}
   → API: GET /api/appointments/[id]?token={token}
   
3. Views appointment details
   → UI: Appointment information displayed
   
4. Clicks cancel button
   → API: POST /api/appointments/[id]/cancel
   → Database: Update appointment status
   → External: WhatsApp cancellation message
   → UI: Success message
```

### Flow 4: Provider Managing Availability
```
1. Provider logs in
   → POST /api/auth/login
   
2. Navigates to profile
   → GET /proveedor/perfil
   
3. Sets unavailable date
   → POST /api/proveedor/unavailable-days
   → Database: Create unavailable_day record
   
4. Sets unavailable time frame
   → POST /api/proveedor/unavailable-time-frames
   → Database: Create unavailable_time_frame record
   
5. Verifies availability updated
   → GET /api/available-times/[date]
   → Verify blocked times excluded
```

---

## Test Data Requirements

### Test Providers
```json
{
  "providers": [
    {
      "username": "testprovider",
      "email": "testprovider@example.com",
      "password": "SecurePass123!",
      "full_name": "Dr. Test Provider",
      "email_verified": true,
      "work_schedule": {
        "monday": { "start": "09:00", "end": "18:00", "working": true },
        "tuesday": { "start": "09:00", "end": "18:00", "working": true },
        "wednesday": { "start": "09:00", "end": "18:00", "working": true },
        "thursday": { "start": "09:00", "end": "18:00", "working": true },
        "friday": { "start": "09:00", "end": "18:00", "working": true },
        "saturday": { "start": null, "end": null, "working": false },
        "sunday": { "start": null, "end": null, "working": false }
      }
    },
    {
      "username": "testprovider2",
      "email": "testprovider2@example.com",
      "password": "SecurePass123!",
      "full_name": "Dr. Test Provider 2",
      "email_verified": true
    }
  ]
}
```

### Test Administrators
```json
{
  "administrators": [
    {
      "email": "maxim.degtiarev.dev@gmail.com",
      "password": "SuperAdmin2024!",
      "full_name": "Maxim Degtiarev",
      "role": "super_admin",
      "table": "users",
      "note": "Super admin account - no email verification required"
    },
    {
      "email": "maxdegdev.test@gmail.com",
      "password": "admin1234",
      "full_name": "Test Admin",
      "role": "admin",
      "table": "users",
      "note": "Standard admin account for testing"
    }
  ]
}
```

**Important Notes:**
- Administrators are stored in the `users` table (not `user_accounts`)
- Administrators do NOT require email verification
- Administrators can login immediately after creation
- Provider accounts require email verification before login

### Test Patients/Appointments
```json
{
  "appointments": [
    {
      "patient_name": "Juan",
      "patient_surname": "Pérez",
      "phone_number": "3421234567",
      "visit_type": "Consulta",
      "consult_type": "Primera vez",
      "health_insurance": "Particular",
      "appointment_date": "2025-02-15",
      "appointment_time": "09:00",
      "status": "scheduled"
    },
    {
      "patient_name": "María",
      "patient_surname": "González",
      "phone_number": "3427654321",
      "visit_type": "Práctica",
      "practice_type": "Criocirugía",
      "health_insurance": "Práctica Particular",
      "appointment_date": "2025-02-15",
      "appointment_time": "10:00",
      "status": "scheduled"
    }
  ]
}
```

### Test Dates
- **Available dates**: Future dates within work schedule
- **Unavailable dates**: Past dates, weekends (if not working), holidays
- **Edge cases**: Today's date, dates exactly 12 hours from now

### Test Health Insurance Data
- Load from `data/obras-sociales.json`
- Include: "Particular", "Práctica Particular", and obras sociales entries

---

## Test Environment

### Environment Configuration

#### Development Environment
- **URL**: `http://localhost:3000`
- **Database**: PostgreSQL (local or test instance)
- **Node Version**: >= 18.18.0 (recommended >= 20.9.0)
- **TestSprite Configuration**: See `testsprite_tests/tmp/config.json`

#### Test Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maxturnos_test

# Authentication
JWT_SECRET=test_jwt_secret_key
JWT_EXPIRES_IN=24h

# Email (Test Mode)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=test@example.com
SMTP_PASS=test_password
EMAIL_FROM=test@example.com

# WhatsApp (Test Mode)
WHATSAPP_API_URL=https://api.whapi.cloud
WHATSAPP_API_KEY=test_api_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### TestSprite Configuration

#### Backend Configuration
```json
{
  "status": "init",
  "type": "backend",
  "scope": "codebase",
  "localEndpoint": "http://localhost:3000/",
  "loginUser": "maxdegdev.test@gmail.com",
  "loginPassword": "admin1234",
  "executionArgs": {
    "projectName": "maxturnos-app",
    "projectPath": "c:\\Users\\Maxim\\work\\Maraxo app\\maxturnos-app",
    "testIds": [],
    "additionalInstruction": "",
    "envs": {
      "API_KEY": "your-api-key-here"
    }
  },
  "proxy": "http://proxy-url:port"
}
```

#### Frontend Configuration
```json
{
  "status": "init",
  "scope": "codebase",
  "type": "frontend",
  "localEndpoint": "http://localhost:3000/",
  "serverPort": 64887
}
```

#### Authentication Configuration for TestSprite

**When TestSprite asks: "Select how your backend server authenticates incoming requests"**

**Select:** `Bearer Token (JWT)` or `Authorization Header`

**Configuration Details:**
- **Login Endpoint**: `POST http://localhost:3000/api/auth/login`
- **Request Body**: 
  ```json
  {
    "email": "maxdegdev.test@gmail.com",
    "password": "admin1234"
  }
  ```
- **Token Field**: `response.token` (from JSON response)
- **Header Format**: `Authorization: Bearer {token}`
- **Protected Routes**: All routes starting with `/api/proveedor/*`
- **Token Expiration**: 24 hours

**Test Credentials:**
- **Provider Account**: 
  - Email: `testprovider@example.com` (must be verified)
  - Password: `SecurePass123!`
- **Admin Account**:
  - Email: `maxdegdev.test@gmail.com`
  - Password: `admin1234`
- **Super Admin Account**:
  - Email: `maxim.degtiarev.dev@gmail.com`
  - Password: `SuperAdmin2024!`

### Database Setup
1. Create test database
2. Run migration scripts:
   ```bash
   node scripts/setup-database.js
   ```
3. Create test administrator account:
   ```bash
   node scripts/create-super-admin.js
   ```
   This creates a super admin account:
   - Email: `maxim.degtiarev.dev@gmail.com`
   - Password: `SuperAdmin2024!`
   - Role: `super_admin`
4. Seed test data (providers, work schedules)
5. Clean database between test runs (if needed)

### Authentication System Overview

The application uses a **dual-table authentication system**:

1. **Provider Accounts** (`user_accounts` table):
   - Used for healthcare providers
   - Require email verification before login
   - Have `username` field
   - Stored in `user_accounts` table
   - Registration via `/api/auth/register`

2. **Administrator Accounts** (`users` table):
   - Used for system administrators
   - Do NOT require email verification
   - Have `role` field (`admin` or `super_admin`)
   - Stored in `users` table
   - Created via `scripts/create-super-admin.js`

**Login Process:**
The `/api/auth/login` endpoint:
1. First searches in `user_accounts` table (providers)
2. If not found, searches in `users` table (administrators)
3. Verifies password with bcrypt
4. For providers: checks `email_verified` status
5. For administrators: skips email verification check
6. Generates JWT token with user information
7. Returns token and user data (including `user_type` and `role` for admins)

### Prerequisites
- ✅ Next.js application running on `localhost:3000`
- ✅ PostgreSQL database accessible
- ✅ Test data seeded
- ✅ Test administrator account created (`node scripts/create-super-admin.js`)
- ✅ TestSprite installed and configured
- ✅ Environment variables set (see `.env.local`)
- ✅ JWT_SECRET configured (minimum 32 characters)
- ✅ Database tables created (`user_accounts` and `users`)

### Quick Start for TestSprite

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Verify database connection:**
   ```bash
   node scripts/test-login.js
   ```

3. **Create test admin (if needed):**
   ```bash
   node scripts/create-super-admin.js
   ```

4. **Test authentication manually:**
   ```bash
   node scripts/test-admin-login.js
   ```

5. **Configure TestSprite:**
   - Use credentials from `testsprite_tests/tmp/config.json`
   - Select "Bearer Token (JWT)" authentication method
   - Login endpoint: `POST /api/auth/login`
   - Token field: `response.token`

---

## Success Criteria

### Functional Success Criteria
1. ✅ **All critical user flows complete successfully**
   - Patient booking: 100% success rate
   - Provider registration: 100% success rate
   - Appointment cancellation: 100% success rate (when allowed)

2. ✅ **API endpoints return correct status codes**
   - Success endpoints: 200/201
   - Error endpoints: 400/401/404/500 as appropriate
   - No unexpected 500 errors

3. ✅ **Data integrity maintained**
   - Appointments created correctly
   - Availability calculated accurately
   - No data corruption

4. ✅ **Business rules enforced**
   - 12-hour cancellation policy enforced
   - Work schedule respected
   - Unavailable dates/times blocked

5. ✅ **Form validation works**
   - Required fields validated
   - Invalid data rejected
   - Clear error messages displayed

### Quality Success Criteria
1. ✅ **Test Coverage**
   - All critical paths tested
   - Edge cases covered
   - Error scenarios tested

2. ✅ **Test Execution**
   - All tests pass consistently
   - No flaky tests
   - Tests complete in reasonable time

3. ✅ **Documentation**
   - Test results documented
   - Issues logged with details
   - Test reports generated

---

## Non-Functional Testing

### Performance Testing
- **Page Load Times**: < 2 seconds for initial load
- **API Response Times**: < 500ms for most endpoints
- **Form Submission**: < 1 second for booking submission
- **Calendar Rendering**: < 1 second for date selection

### Usability Testing
- **Form Navigation**: Intuitive multi-step flow
- **Error Messages**: Clear and actionable
- **Loading States**: Visible feedback during operations
- **Mobile Responsiveness**: Functional on mobile devices

### Accessibility Testing
- **Keyboard Navigation**: All functions accessible via keyboard
- **Screen Reader**: Compatible with screen readers
- **Color Contrast**: Meets WCAG AA standards
- **Form Labels**: All inputs properly labeled

### Browser Compatibility
- **Chrome**: Latest version
- **Firefox**: Latest version
- **Safari**: Latest version
- **Edge**: Latest version

---

## Risk Assessment

### High Risk Areas
1. **Appointment Double-Booking**
   - Risk: Race condition in availability checking
   - Mitigation: Database constraints, transaction handling
   - Test: Concurrent booking attempts

2. **Email Verification Bypass**
   - Risk: Unverified providers accessing system
   - Mitigation: Middleware checks, email verification required
   - Test: Attempt to access without verification

3. **Cancellation Token Security**
   - Risk: Token guessing or brute force
   - Mitigation: Strong token generation, expiration
   - Test: Invalid token attempts

4. **Availability Calculation Errors**
   - Risk: Incorrect time slot generation
   - Mitigation: Thorough testing of calculation logic
   - Test: Various work schedule configurations

### Medium Risk Areas
1. **Form Validation Bypass**
   - Risk: Invalid data submitted via API
   - Mitigation: Server-side validation
   - Test: Direct API calls with invalid data

2. **Session Management**
   - Risk: Session hijacking or expiration issues
   - Mitigation: Secure JWT implementation
   - Test: Session expiration, token refresh

3. **WhatsApp Integration Failures**
   - Risk: Notifications not sent
   - Mitigation: Error handling, retry logic
   - Test: API failures, network issues

### Low Risk Areas
1. **UI Styling Issues**
   - Risk: Visual inconsistencies
   - Mitigation: Component library usage
   - Test: Visual regression testing

2. **Minor Form Field Issues**
   - Risk: Input formatting problems
   - Mitigation: Input validation
   - Test: Various input formats

---

## Test Execution Plan

### Phase 1: Setup and Preparation
**Duration**: 1-2 hours
- ✅ Set up test environment
- ✅ Configure TestSprite
- ✅ Seed test data
- ✅ Verify application is running
- ✅ Verify database connectivity

### Phase 2: API Testing
**Duration**: 4-6 hours
- ✅ Test authentication endpoints
- ✅ Test appointment endpoints
- ✅ Test availability endpoints
- ✅ Test provider management endpoints
- ✅ Test error scenarios
- ✅ Document API test results

### Phase 3: Frontend Testing
**Duration**: 6-8 hours
- ✅ Test public pages
- ✅ Test booking form flow
- ✅ Test provider authentication pages
- ✅ Test provider dashboard
- ✅ Test form validation
- ✅ Test error handling
- ✅ Document frontend test results

### Phase 4: Integration Testing
**Duration**: 2-3 hours
- ✅ Test complete user flows
- ✅ Test database integration
- ✅ Test email integration (mock)
- ✅ Test WhatsApp integration (mock)
- ✅ Document integration test results

### Phase 5: Regression Testing
**Duration**: 2-3 hours
- ✅ Re-run critical test cases
- ✅ Verify fixes don't break existing functionality
- ✅ Test edge cases
- ✅ Document regression test results

### Phase 6: Reporting and Documentation
**Duration**: 1-2 hours
- ✅ Compile test results
- ✅ Document issues found
- ✅ Create test report
- ✅ Update test documentation

**Total Estimated Duration**: 16-24 hours

---

## Test Execution Checklist

### Pre-Testing Checklist
- [ ] Test environment configured
- [ ] Test data prepared
- [ ] TestSprite configured
- [ ] Application running
- [ ] Database accessible
- [ ] Test accounts created
- [ ] Test scripts ready

### During Testing Checklist
- [ ] Execute test cases systematically
- [ ] Document test results
- [ ] Log issues immediately
- [ ] Take screenshots of failures
- [ ] Verify expected vs actual results
- [ ] Test edge cases
- [ ] Verify error handling

### Post-Testing Checklist
- [ ] All test results documented
- [ ] Issues logged and prioritized
- [ ] Test report generated
- [ ] Test data cleaned up (if needed)
- [ ] Test environment restored
- [ ] Stakeholders notified

---

## Test Reporting

### Test Report Structure
1. **Executive Summary**
   - Total tests executed
   - Pass/fail statistics
   - Critical issues summary

2. **Test Results by Category**
   - API test results
   - Frontend test results
   - Integration test results

3. **Issues Found**
   - Critical issues
   - High priority issues
   - Medium priority issues
   - Low priority issues

4. **Recommendations**
   - Areas for improvement
   - Additional testing needed
   - Risk mitigation suggestions

### Test Metrics
- **Test Coverage**: Percentage of features tested
- **Pass Rate**: Percentage of tests passing
- **Defect Density**: Issues found per feature
- **Test Execution Time**: Time taken for test suite

---

## Appendix

### A. Test Data Templates

#### Provider Registration Template
```json
{
  "email": "{{provider_email}}",
  "username": "{{provider_username}}",
  "password": "SecurePass123!",
  "full_name": "{{provider_name}}"
}
```

#### Appointment Booking Template
```json
{
  "visit_type": "{{visit_type}}",
  "consult_type": "{{consult_type}}",
  "health_insurance": "{{health_insurance}}",
  "patient_name": "{{patient_name}}",
  "patient_surname": "{{patient_surname}}",
  "phone_number": "{{phone_number}}",
  "appointment_date": "{{appointment_date}}",
  "appointment_time": "{{appointment_time}}",
  "user_account_id": "{{user_account_id}}"
}
```

### B. TestSprite Commands

#### Bootstrap TestSprite
```bash
# Frontend testing
testsprite bootstrap --type frontend --localPort 3000 --projectPath /path/to/project

# Backend testing
testsprite bootstrap --type backend --localPort 3000 --projectPath /path/to/project
```

#### Generate Test Plan
```bash
# Frontend test plan
testsprite generate-frontend-test-plan --projectPath /path/to/project --needLogin true

# Backend test plan
testsprite generate-backend-test-plan --projectPath /path/to/project
```

#### Execute Tests
```bash
testsprite generate-code-and-execute \
  --projectName maxturnos-app \
  --projectPath /path/to/project \
  --testIds [] \
  --additionalInstruction ""
```

### C. Reference Documentation
- Application Replication Guide: `APPLICATION_REPLICATION_GUIDE.md`
- Implementation Checklist: `IMPLEMENTATION_CHECKLIST.md`
- TestSprite Authentication Guide: `TESTSprite_AUTHENTICATION_GUIDE.md`
- Super Admin Credentials: `SUPER_ADMIN_CREDENTIALS.md`
- Backend Test Diagnosis: `BACKEND_TEST_DIAGNOSIS.md`
- TestSprite Documentation: [TestSprite Docs]
- Next.js Documentation: [Next.js Docs]

### D. Troubleshooting Common Issues

#### Authentication Issues

**Problem: Login returns 401 (Unauthorized)**
- **Solution**: 
  - Verify user exists in database (`user_accounts` or `users` table)
  - Check password is correct
  - For providers: ensure `email_verified = true`
  - Verify JWT_SECRET is configured in `.env.local`

**Problem: Login returns 403 (Email not verified)**
- **Solution**: 
  - This only applies to provider accounts (`user_accounts`)
  - Use `/api/auth/verify-email?token={token}` to verify email
  - Or use an admin account (no verification required)

**Problem: Token not working for protected routes**
- **Solution**:
  - Verify token format: `Authorization: Bearer {token}` (note the space)
  - Check token hasn't expired (24 hours)
  - Ensure route requires authentication (`/api/proveedor/*`)

**Problem: User not found during login**
- **Solution**:
  - Verify user exists in correct table:
    - Providers: `user_accounts` table
    - Admins: `users` table
  - Check email spelling (case-sensitive)
  - Run `node scripts/test-login.js` to verify user exists

#### TestSprite Configuration Issues

**Problem: TestSprite cannot authenticate**
- **Solution**:
  - Verify `localEndpoint` is correct: `http://localhost:3000/`
  - Check server is running: `npm run dev`
  - Verify credentials in `testsprite_tests/tmp/config.json`
  - Select correct authentication method: "Bearer Token (JWT)"
  - Verify login endpoint: `POST /api/auth/login`

**Problem: Tests fail with 500 errors**
- **Solution**:
  - Check server logs for detailed error messages
  - Verify database connection
  - Check environment variables are set correctly
  - Verify JWT_SECRET is configured (minimum 32 characters)
  - Check database tables exist (`user_accounts`, `users`)

#### Database Issues

**Problem: Cannot connect to database**
- **Solution**:
  - Verify PostgreSQL is running
  - Check connection string in `.env.local`
  - For AWS RDS: verify SSL configuration (`POSTGRESQL_SSL_MODE`)
  - Check firewall/network settings

**Problem: Tables don't exist**
- **Solution**:
  - Run `node scripts/setup-database.js`
  - Verify scripts executed successfully
  - Check database name matches `.env.local` configuration

### E. Contact Information
- **Project Repository**: [Repository URL]
- **TestSprite Configuration**: `testsprite_tests/tmp/config.json`
- **Application URL**: `http://localhost:3000`
- **Test Credentials File**: `SUPER_ADMIN_CREDENTIALS.md`
- **Authentication Guide**: `TESTSprite_AUTHENTICATION_GUIDE.md`

---

## Document Control

**Version History:**
- **v1.1.0** (2026-01-23): Updated authentication system documentation, added admin credentials and TestSprite configuration details
- **v1.0.0** (2025-01-27): Initial PSD creation

**Review Schedule:**
- Review after major feature additions
- Update when API changes occur
- Update when new test scenarios identified

**Approval:**
- [ ] Technical Lead
- [ ] QA Lead
- [ ] Product Owner

---

**End of Product Specification Document**
