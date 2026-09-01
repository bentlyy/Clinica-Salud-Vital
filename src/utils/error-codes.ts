/**
 * Centralized error code catalog.
 * Every unique error in the system has a machine-readable code here.
 * Frontend maps these codes → i18n translations per locale.
 *
 * Convention: MODULE_ACTION
 */

// ── Auth ──────────────────────────────────────────────────────────
export const E = {
  // Registration / Login
  AUTH_EMAIL_REQUIRED:          'AUTH_EMAIL_REQUIRED',
  AUTH_PASSWORD_REQUIRED:       'AUTH_PASSWORD_REQUIRED',
  AUTH_INVALID_EMAIL_FORMAT:    'AUTH_INVALID_EMAIL_FORMAT',
  AUTH_INVALID_CREDENTIALS:     'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_ALREADY_EXISTS:    'AUTH_EMAIL_ALREADY_EXISTS',
  AUTH_RUT_ALREADY_EXISTS:      'AUTH_RUT_ALREADY_EXISTS',
  AUTH_USER_CREATION_FAILED:    'AUTH_USER_CREATION_FAILED',
  AUTH_USER_NOT_FOUND:          'AUTH_USER_NOT_FOUND',
  AUTH_USER_INACTIVE:           'AUTH_USER_INACTIVE',
  AUTH_USER_LOCKED:             'AUTH_USER_LOCKED',
  AUTH_INVALID_RUT:             'AUTH_INVALID_RUT',

  // Password
  AUTH_PASSWORD_TOO_SHORT:      'AUTH_PASSWORD_TOO_SHORT',
  AUTH_PASSWORD_NO_UPPERCASE:   'AUTH_PASSWORD_NO_UPPERCASE',
  AUTH_PASSWORD_NO_LOWERCASE:   'AUTH_PASSWORD_NO_LOWERCASE',
  AUTH_PASSWORD_NO_NUMBER:      'AUTH_PASSWORD_NO_NUMBER',
  AUTH_PASSWORD_NO_SPECIAL:     'AUTH_PASSWORD_NO_SPECIAL',
  AUTH_PASSWORD_SAME_AS_CURRENT:'AUTH_PASSWORD_SAME_AS_CURRENT',
  AUTH_CURRENT_PASSWORD_WRONG:  'AUTH_CURRENT_PASSWORD_WRONG',

  // Token / Session
  AUTH_TOKEN_REQUIRED:          'AUTH_TOKEN_REQUIRED',
  AUTH_TOKEN_INVALID_EXPIRED:   'AUTH_TOKEN_INVALID_EXPIRED',
  AUTH_REFRESH_REQUIRED:        'AUTH_REFRESH_REQUIRED',
  AUTH_REFRESH_INVALID:         'AUTH_REFRESH_INVALID',
  AUTH_AUTHENTICATION_REQUIRED: 'AUTH_AUTHENTICATION_REQUIRED',

  // 2FA
  AUTH_2FA_NOT_INITIALIZED:     'AUTH_2FA_NOT_INITIALIZED',
  AUTH_2FA_INVALID_TOKEN:       'AUTH_2FA_INVALID_TOKEN',
  AUTH_2FA_PASSWORD_REQUIRED:   'AUTH_2FA_PASSWORD_REQUIRED',
  AUTH_2FA_TOTP_REQUIRED:       'AUTH_2FA_TOTP_REQUIRED',
  AUTH_2FA_REQUIRED:            'AUTH_2FA_REQUIRED',

  // Password reset
  AUTH_RESET_TOKEN_INVALID:     'AUTH_RESET_TOKEN_INVALID',
  AUTH_RESET_EMAIL_MISMATCH:    'AUTH_RESET_EMAIL_MISMATCH',
  AUTH_ADMIN_NOT_FOUND:         'AUTH_ADMIN_NOT_FOUND',

  // ── Booking ─────────────────────────────────────────────────────
  BOOKING_MISSING_FIELDS:       'BOOKING_MISSING_FIELDS',
  BOOKING_INVALID_DATE:         'BOOKING_INVALID_DATE',
  BOOKING_INVALID_TIME:         'BOOKING_INVALID_TIME',
  BOOKING_INVALID_DURATION:     'BOOKING_INVALID_DURATION',
  BOOKING_DURATION_NOT_MULTIPLE:'BOOKING_DURATION_NOT_MULTIPLE',
  BOOKING_PAST_DATE:            'BOOKING_PAST_DATE',
  BOOKING_DOCTOR_NOT_FOUND:     'BOOKING_DOCTOR_NOT_FOUND',
  BOOKING_USER_NOT_FOUND:       'BOOKING_USER_NOT_FOUND',
  BOOKING_SLOT_EXCEEDS_DOCTOR:  'BOOKING_SLOT_EXCEEDS_DOCTOR',
  BOOKING_USER_BLOCKED:         'BOOKING_USER_BLOCKED',
  BOOKING_SLOT_ALREADY_BOOKED:  'BOOKING_SLOT_ALREADY_BOOKED',
  BOOKING_INVALID_DOCTOR_USER:  'BOOKING_INVALID_DOCTOR_USER',
  BOOKING_INVALID_ID:           'BOOKING_INVALID_ID',
  BOOKING_NOT_FOUND:            'BOOKING_NOT_FOUND',
  BOOKING_UNAUTHORIZED:         'BOOKING_UNAUTHORIZED',
  BOOKING_ALREADY_CANCELLED:    'BOOKING_ALREADY_CANCELLED',
  BOOKING_SERIES_INVALID_FREQUENCY: 'BOOKING_SERIES_INVALID_FREQUENCY',
  BOOKING_SERIES_INVALID_OCCURRENCES: 'BOOKING_SERIES_INVALID_OCCURRENCES',
  BOOKING_SERIES_NOT_FOUND:     'BOOKING_SERIES_NOT_FOUND',
  BOOKING_SERIES_UNAUTHORIZED:  'BOOKING_SERIES_UNAUTHORIZED',

  // ── Availability ────────────────────────────────────────────────
  AVAILABILITY_MISSING_FIELDS:  'AVAILABILITY_MISSING_FIELDS',
  AVAILABILITY_INVALID_DAY:     'AVAILABILITY_INVALID_DAY',
  AVAILABILITY_INVALID_TIME:    'AVAILABILITY_INVALID_TIME',
  AVAILABILITY_TIME_BEFORE_END: 'AVAILABILITY_TIME_BEFORE_END',
  AVAILABILITY_OVERLAP:         'AVAILABILITY_OVERLAP',
  AVAILABILITY_INVALID_ID:      'AVAILABILITY_INVALID_ID',
  AVAILABILITY_NOT_FOUND:       'AVAILABILITY_NOT_FOUND',
  AVAILABILITY_DOCTOR_NOT_FOUND:'AVAILABILITY_DOCTOR_NOT_FOUND',

  // ── Clinical Record ─────────────────────────────────────────────
  CLINICAL_RECORD_NOT_FOUND:    'CLINICAL_RECORD_NOT_FOUND',
  CLINICAL_RECORD_DUPLICATE:    'CLINICAL_RECORD_DUPLICATE',
  CLINICAL_RECORD_PATIENT_NOT_FOUND:'CLINICAL_RECORD_PATIENT_NOT_FOUND',
  CLINICAL_RECORD_BOOKING_NOT_FOUND:'CLINICAL_RECORD_BOOKING_NOT_FOUND',
  CLINICAL_RECORD_EXAMS_NOT_FOUND:'CLINICAL_RECORD_EXAMS_NOT_FOUND',
  CLINICAL_RECORD_OWN_ONLY:     'CLINICAL_RECORD_OWN_ONLY',
  CLINICAL_RECORD_COMPLETED:    'CLINICAL_RECORD_COMPLETED',
  CLINICAL_RECORD_NO_FIELDS:    'CLINICAL_RECORD_NO_FIELDS',
  CLINICAL_RECORD_CONFLICT:     'CLINICAL_RECORD_CONFLICT',
  CLINICAL_RECORD_DELETE_FAILED:'CLINICAL_RECORD_DELETE_FAILED',

  // ── Prescription ────────────────────────────────────────────────
  PRESCRIPTION_NOT_FOUND:       'PRESCRIPTION_NOT_FOUND',
  PRESCRIPTION_DUPLICATE:       'PRESCRIPTION_DUPLICATE',
  PRESCRIPTION_UNAUTHORIZED:    'PRESCRIPTION_UNAUTHORIZED',
  PRESCRIPTION_OWN_ONLY:        'PRESCRIPTION_OWN_ONLY',

  // ── Laboratory ──────────────────────────────────────────────────
  LAB_TEST_NAME_REQUIRED:       'LAB_TEST_NAME_REQUIRED',
  LAB_TEST_NO_FIELDS:           'LAB_TEST_NO_FIELDS',
  LAB_TEST_NOT_FOUND:           'LAB_TEST_NOT_FOUND',
  LAB_REQUEST_NOT_FOUND:        'LAB_REQUEST_NOT_FOUND',
  LAB_REQUEST_ITEM_NOT_FOUND:   'LAB_REQUEST_ITEM_NOT_FOUND',
  LAB_REQUEST_NUMBER_FAILED:    'LAB_REQUEST_NUMBER_FAILED',
  LAB_TESTS_NOT_FOUND:          'LAB_TESTS_NOT_FOUND',
  LAB_INVALID_TYPE:             'LAB_INVALID_TYPE',
  LAB_ACCESS_DENIED:            'LAB_ACCESS_DENIED',
  LAB_ITEM_INVALID_STATUS:      'LAB_ITEM_INVALID_STATUS',
  LAB_ITEM_MUST_TECH_FIRST:     'LAB_ITEM_MUST_TECH_FIRST',
  LAB_ITEM_MUST_DOCTOR_FIRST:   'LAB_ITEM_MUST_DOCTOR_FIRST',
  LAB_ITEM_NOT_FOUND:           'LAB_ITEM_NOT_FOUND',
  LAB_AREA_NOT_FOUND:           'LAB_AREA_NOT_FOUND',
  LAB_SAMPLE_NOT_FOUND:         'LAB_SAMPLE_NOT_FOUND',
  LAB_EQUIPMENT_NOT_FOUND:      'LAB_EQUIPMENT_NOT_FOUND',
  LAB_REAGENT_NOT_FOUND:        'LAB_REAGENT_NOT_FOUND',
  LAB_NOTIFICATION_NOT_FOUND:   'LAB_NOTIFICATION_NOT_FOUND',

  // ── Doctor ──────────────────────────────────────────────────────
  DOCTOR_MISSING_FIELDS:        'DOCTOR_MISSING_FIELDS',
  DOCTOR_INVALID_EMAIL:         'DOCTOR_INVALID_EMAIL',
  DOCTOR_INVALID_RUT:           'DOCTOR_INVALID_RUT',
  DOCTOR_RUT_EXISTS:            'DOCTOR_RUT_EXISTS',
  DOCTOR_EMAIL_EXISTS:          'DOCTOR_EMAIL_EXISTS',
  DOCTOR_USER_EXISTS:           'DOCTOR_USER_EXISTS',
  DOCTOR_USER_NOT_FOUND:        'DOCTOR_USER_NOT_FOUND',
  DOCTOR_USER_MUST_BE_DOCTOR:   'DOCTOR_USER_MUST_BE_DOCTOR',
  DOCTOR_ALREADY_EXISTS:        'DOCTOR_ALREADY_EXISTS',
  DOCTOR_EMAIL_REQUIRED:        'DOCTOR_EMAIL_REQUIRED',
  DOCTOR_SPECIALTY_REQUIRED:    'DOCTOR_SPECIALTY_REQUIRED',
  DOCTOR_INVITE_INVALID:        'DOCTOR_INVITE_INVALID',
  DOCTOR_NOT_FOUND_TENANT:      'DOCTOR_NOT_FOUND_TENANT',
  DOCTOR_PROFILE_NOT_FOUND:     'DOCTOR_PROFILE_NOT_FOUND',

  // ── Billing ─────────────────────────────────────────────────────
  BILLING_IDEMPOTENCY_DUPLICATE:'BILLING_IDEMPOTENCY_DUPLICATE',
  BILLING_INVOICE_EXISTS:       'BILLING_INVOICE_EXISTS',
  BILLING_INVOICE_NUMBER_FAILED:'BILLING_INVOICE_NUMBER_FAILED',
  BILLING_INVOICE_NOT_FOUND:    'BILLING_INVOICE_NOT_FOUND',
  BILLING_INVALID_ID:           'BILLING_INVALID_ID',
  BILLING_ACCESS_DENIED:        'BILLING_ACCESS_DENIED',
  BILLING_PATIENT_NOT_FOUND:    'BILLING_PATIENT_NOT_FOUND',
  BILLING_DOCTOR_NOT_FOUND:     'BILLING_DOCTOR_NOT_FOUND',
  BILLING_BOOKING_INVALID:      'BILLING_BOOKING_INVALID',

  // ── Guest ───────────────────────────────────────────────────────
  GUEST_TENANT_REQUIRED:        'GUEST_TENANT_REQUIRED',
  GUEST_MISSING_FIELDS:         'GUEST_MISSING_FIELDS',
  GUEST_INVALID_RUT:            'GUEST_INVALID_RUT',
  GUEST_INVALID_DATE:           'GUEST_INVALID_DATE',
  GUEST_INVALID_TIME:           'GUEST_INVALID_TIME',
  GUEST_RUT_BLOCKED:            'GUEST_RUT_BLOCKED',
  GUEST_DOCTOR_NOT_FOUND:       'GUEST_DOCTOR_NOT_FOUND',
  GUEST_SLOT_BOOKED:            'GUEST_SLOT_BOOKED',
  GUEST_CONFIRM_TOKEN_REQUIRED: 'GUEST_CONFIRM_TOKEN_REQUIRED',
  GUEST_AUTH_OR_RUT_REQUIRED:   'GUEST_AUTH_OR_RUT_REQUIRED',
  GUEST_BOOKING_NOT_FOUND:      'GUEST_BOOKING_NOT_FOUND',
  GUEST_RUT_REQUIRED:           'GUEST_RUT_REQUIRED',

  // ── Reports ─────────────────────────────────────────────────────
  REPORT_INVALID_TYPE:          'REPORT_INVALID_TYPE',
  REPORT_NOT_FOUND:             'REPORT_NOT_FOUND',
  REPORT_MISSING_PARAMS:        'REPORT_MISSING_PARAMS',
  REPORT_INVALID_ID:            'REPORT_INVALID_ID',

  // ── Super-Admin ─────────────────────────────────────────────────
  SA_TENANT_NOT_FOUND:          'SA_TENANT_NOT_FOUND',
  SA_TENANT_DELETED:            'SA_TENANT_DELETED',
  SA_UNKNOWN_FIELD:             'SA_UNKNOWN_FIELD',
  SA_NO_FIELDS:                 'SA_NO_FIELDS',
  SA_USER_NOT_FOUND:            'SA_USER_NOT_FOUND',

  // ── SaaS ────────────────────────────────────────────────────────
  SAAS_PLAN_NOT_FOUND:          'SAAS_PLAN_NOT_FOUND',
  SAAS_PLAN_BY_ID_NOT_FOUND:    'SAAS_PLAN_BY_ID_NOT_FOUND',
  SAAS_SUBSCRIPTION_EXISTS:     'SAAS_SUBSCRIPTION_EXISTS',
  SAAS_NO_SUBSCRIPTION:         'SAAS_NO_SUBSCRIPTION',
  SAAS_ALREADY_ON_PLAN:         'SAAS_ALREADY_ON_PLAN',
  SAAS_NO_ACTIVE_SUBSCRIPTION:  'SAAS_NO_ACTIVE_SUBSCRIPTION',
  SAAS_TENANT_NOT_FOUND:        'SAAS_TENANT_NOT_FOUND',
  SAAS_DOMAIN_EXISTS:           'SAAS_DOMAIN_EXISTS',
  SAAS_CAPTCHA_FAILED:          'SAAS_CAPTCHA_FAILED',
  SAAS_NO_FIELDS:               'SAAS_NO_FIELDS',
  SAAS_PLAN_REQUIRED:           'SAAS_PLAN_REQUIRED',
  SAAS_UNKNOWN_FIELD:           'SAAS_UNKNOWN_FIELD',

  // ── Specialties ─────────────────────────────────────────────────
  SPECIALTY_NAME_REQUIRED:      'SPECIALTY_NAME_REQUIRED',
  SPECIALTY_NOT_FOUND:          'SPECIALTY_NOT_FOUND',
  SPECIALTY_NO_FIELDS:          'SPECIALTY_NO_FIELDS',

  // ── Medical History ─────────────────────────────────────────────
  MEDICAL_HISTORY_NOT_FOUND:    'MEDICAL_HISTORY_NOT_FOUND',

  // ── CIE-10 ──────────────────────────────────────────────────────
  CIE10_NOT_FOUND:              'CIE10_NOT_FOUND',

  // ── Clinical Templates ─────────────────────────────────────────
  TEMPLATE_NOT_FOUND:           'TEMPLATE_NOT_FOUND',
  TEMPLATE_UNAUTHORIZED:        'TEMPLATE_UNAUTHORIZED',

  // ── Validation ──────────────────────────────────────────────────
  VALIDATION_FAILED:            'VALIDATION_FAILED',

  // ── Tenant ──────────────────────────────────────────────────────
  TENANT_NOT_FOUND:             'TENANT_NOT_FOUND',
  TENANT_MISSING:               'TENANT_MISSING',

  // ── Access ──────────────────────────────────────────────────────
  ACCESS_DENIED:                'ACCESS_DENIED',

  // ── Crypto ──────────────────────────────────────────────────────
  CRYPTO_ENCRYPTION_KEY_MISSING:'CRYPTO_ENCRYPTION_KEY_MISSING',
  CRYPTO_INVALID_FORMAT:        'CRYPTO_INVALID_FORMAT',
  CRYPTO_HMAC_SECRET_MISSING:   'CRYPTO_HMAC_SECRET_MISSING',
  CRYPTO_HMAC_SECRET_TOO_SHORT: 'CRYPTO_HMAC_SECRET_TOO_SHORT',
  CRYPTO_JWT_SECRET_MISSING:    'CRYPTO_JWT_SECRET_MISSING',

  // ── Email ───────────────────────────────────────────────────────
  EMAIL_SEND_FAILED:            'EMAIL_SEND_FAILED',
} as const;

export type ErrorCode = (typeof E)[keyof typeof E];

/**
 * Human-readable default messages per code.
 * English is the canonical API language. Frontend translates via i18n.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth
  [E.AUTH_EMAIL_REQUIRED]:          'Email and password are required',
  [E.AUTH_PASSWORD_REQUIRED]:       'Password is required',
  [E.AUTH_INVALID_EMAIL_FORMAT]:    'Invalid email format',
  [E.AUTH_INVALID_CREDENTIALS]:     'Invalid credentials',
  [E.AUTH_EMAIL_ALREADY_EXISTS]:    'Email or RUT already registered',
  [E.AUTH_RUT_ALREADY_EXISTS]:      'Email or RUT already registered',
  [E.AUTH_USER_CREATION_FAILED]:    'Error creating user',
  [E.AUTH_USER_NOT_FOUND]:          'User not found',
  [E.AUTH_USER_INACTIVE]:           'Account is deactivated. Contact an administrator.',
  [E.AUTH_USER_LOCKED]:             'Account is temporarily locked due to too many failed attempts. Try again later.',
  [E.AUTH_INVALID_RUT]:             'Invalid RUT',

  [E.AUTH_PASSWORD_TOO_SHORT]:      'Password must be at least 8 characters',
  [E.AUTH_PASSWORD_NO_UPPERCASE]:   'Password must contain at least one uppercase letter',
  [E.AUTH_PASSWORD_NO_LOWERCASE]:   'Password must contain at least one lowercase letter',
  [E.AUTH_PASSWORD_NO_NUMBER]:      'Password must contain at least one number',
  [E.AUTH_PASSWORD_NO_SPECIAL]:     'Password must contain at least one special character',
  [E.AUTH_PASSWORD_SAME_AS_CURRENT]:'New password must be different from current password',
  [E.AUTH_CURRENT_PASSWORD_WRONG]:  'Current password is incorrect',

  [E.AUTH_TOKEN_REQUIRED]:          'Token is required',
  [E.AUTH_TOKEN_INVALID_EXPIRED]:   'Invalid or expired token',
  [E.AUTH_REFRESH_REQUIRED]:        'Refresh token required',
  [E.AUTH_REFRESH_INVALID]:         'Invalid or expired refresh token',
  [E.AUTH_AUTHENTICATION_REQUIRED]: 'Authentication required',

  [E.AUTH_2FA_NOT_INITIALIZED]:     '2FA not initialized',
  [E.AUTH_2FA_INVALID_TOKEN]:       'Invalid 2FA token',
  [E.AUTH_2FA_PASSWORD_REQUIRED]:   'Password is required to disable 2FA',
  [E.AUTH_2FA_TOTP_REQUIRED]:       'TOTP code required to disable 2FA. Enter the code from your authenticator app.',
  [E.AUTH_2FA_REQUIRED]:            '2FA token required',

  [E.AUTH_RESET_TOKEN_INVALID]:     'Invalid or expired reset token',
  [E.AUTH_RESET_EMAIL_MISMATCH]:    'Email does not match reset token',
  [E.AUTH_ADMIN_NOT_FOUND]:         'Admin user not found',

  // Booking
  [E.BOOKING_MISSING_FIELDS]:       'Missing required fields',
  [E.BOOKING_INVALID_DATE]:         'Invalid date format, use YYYY-MM-DD',
  [E.BOOKING_INVALID_TIME]:         'Invalid time format, use HH:MM',
  [E.BOOKING_INVALID_DURATION]:     'Duration must be between 1 and 480 minutes',
  [E.BOOKING_DURATION_NOT_MULTIPLE]:'Duration must be a multiple of 5 minutes',
  [E.BOOKING_PAST_DATE]:            'Cannot book appointments in the past',
  [E.BOOKING_DOCTOR_NOT_FOUND]:     'Doctor not found',
  [E.BOOKING_USER_NOT_FOUND]:       'User not found',
  [E.BOOKING_SLOT_EXCEEDS_DOCTOR]:  'Duration cannot exceed doctor slot duration',
  [E.BOOKING_USER_BLOCKED]:         'Your account is blocked due to unconfirmed appointments. Please wait before booking again.',
  [E.BOOKING_SLOT_ALREADY_BOOKED]:  'This time slot is already booked',
  [E.BOOKING_INVALID_DOCTOR_USER]:  'Invalid doctor or user',
  [E.BOOKING_INVALID_ID]:           'Invalid booking id',
  [E.BOOKING_NOT_FOUND]:            'Booking not found or unauthorized',
  [E.BOOKING_UNAUTHORIZED]:         'Booking not found or unauthorized',
  [E.BOOKING_ALREADY_CANCELLED]:    'Cannot reschedule a cancelled booking',
  [E.BOOKING_SERIES_INVALID_FREQUENCY]: 'Frequency must be daily, weekly or monthly',
  [E.BOOKING_SERIES_INVALID_OCCURRENCES]: 'Occurrences must be between 1 and 52',
  [E.BOOKING_SERIES_NOT_FOUND]:     'Booking series not found',
  [E.BOOKING_SERIES_UNAUTHORIZED]:  'Not authorized to manage this booking series',
  // Availability
  [E.AVAILABILITY_MISSING_FIELDS]:  'Missing required fields',
  [E.AVAILABILITY_INVALID_DAY]:     'day_of_week must be an integer between 0 and 6',
  [E.AVAILABILITY_INVALID_TIME]:    'Invalid time format, use HH:MM',
  [E.AVAILABILITY_TIME_BEFORE_END]: 'Invalid time range: start_time must be before end_time',
  [E.AVAILABILITY_OVERLAP]:         'Time range overlaps with existing availability',
  [E.AVAILABILITY_INVALID_ID]:      'Invalid id',
  [E.AVAILABILITY_NOT_FOUND]:       'Availability not found or unauthorized',
  [E.AVAILABILITY_DOCTOR_NOT_FOUND]:'Doctor profile not found',

  // Clinical Record
  [E.CLINICAL_RECORD_NOT_FOUND]:    'Clinical record not found',
  [E.CLINICAL_RECORD_DUPLICATE]:    'A clinical record already exists for this booking',
  [E.CLINICAL_RECORD_PATIENT_NOT_FOUND]:'Patient not found',
  [E.CLINICAL_RECORD_BOOKING_NOT_FOUND]:'Booking not found',
  [E.CLINICAL_RECORD_EXAMS_NOT_FOUND]:'Exams not found or inactive',
  [E.CLINICAL_RECORD_OWN_ONLY]:     'You can only update your own records',
  [E.CLINICAL_RECORD_COMPLETED]:    'Cannot update a completed record',
  [E.CLINICAL_RECORD_NO_FIELDS]:    'No fields to update',
  [E.CLINICAL_RECORD_CONFLICT]:     'Record was modified by another user. Reload and try again.',
  [E.CLINICAL_RECORD_DELETE_FAILED]:'Clinical record not found or cannot be deleted',

  // Prescription
  [E.PRESCRIPTION_NOT_FOUND]:       'Prescription not found',
  [E.PRESCRIPTION_DUPLICATE]:       'This medication was already prescribed in this clinical record',
  [E.PRESCRIPTION_UNAUTHORIZED]:    'Prescription not found or unauthorized',
  [E.PRESCRIPTION_OWN_ONLY]:        'You can only add prescriptions to your own records',

  // Laboratory
  [E.LAB_TEST_NAME_REQUIRED]:       'Test name is required',
  [E.LAB_TEST_NO_FIELDS]:           'No fields to update',
  [E.LAB_TEST_NOT_FOUND]:           'Lab test not found',
  [E.LAB_REQUEST_NOT_FOUND]:        'Lab request not found',
  [E.LAB_REQUEST_ITEM_NOT_FOUND]:   'Lab request item not found',
  [E.LAB_REQUEST_NUMBER_FAILED]:    'Could not generate unique request number',
  [E.LAB_TESTS_NOT_FOUND]:          'Lab tests not found or inactive',
  [E.LAB_INVALID_TYPE]:             'lab_type must be "internal" or "external"',
  [E.LAB_ACCESS_DENIED]:            'Access denied',
  [E.LAB_ITEM_INVALID_STATUS]:      'Item not found or invalid status for tech validation',
  [E.LAB_ITEM_MUST_TECH_FIRST]:     'Item not found or must be validated by tech first',
  [E.LAB_ITEM_MUST_DOCTOR_FIRST]:   'Item not found or must be validated by doctor first',
  [E.LAB_ITEM_NOT_FOUND]:           'Item not found',
  [E.LAB_AREA_NOT_FOUND]:           'Area not found',
  [E.LAB_SAMPLE_NOT_FOUND]:         'Sample not found',
  [E.LAB_EQUIPMENT_NOT_FOUND]:      'Equipment not found',
  [E.LAB_REAGENT_NOT_FOUND]:        'Reagent not found',
  [E.LAB_NOTIFICATION_NOT_FOUND]:   'Notification not found',

  // Doctor
  [E.DOCTOR_MISSING_FIELDS]:        'Name, specialty, and email are required',
  [E.DOCTOR_INVALID_EMAIL]:         'Invalid email',
  [E.DOCTOR_INVALID_RUT]:           'Invalid RUT',
  [E.DOCTOR_RUT_EXISTS]:            'RUT already registered',
  [E.DOCTOR_EMAIL_EXISTS]:          'Email already registered',
  [E.DOCTOR_USER_EXISTS]:           'Doctor or user already exists',
  [E.DOCTOR_USER_NOT_FOUND]:        'User not found',
  [E.DOCTOR_USER_MUST_BE_DOCTOR]:   'User must have role doctor',
  [E.DOCTOR_ALREADY_EXISTS]:        'Doctor already exists for this user or email',
  [E.DOCTOR_EMAIL_REQUIRED]:        'Email is required',
  [E.DOCTOR_SPECIALTY_REQUIRED]:    'Specialty is required for doctors',
  [E.DOCTOR_INVITE_INVALID]:        'Invalid or expired invitation token',
  [E.DOCTOR_NOT_FOUND_TENANT]:      'User not found in this tenant',
  [E.DOCTOR_PROFILE_NOT_FOUND]:     'Doctor profile not found',

  // Billing
  [E.BILLING_IDEMPOTENCY_DUPLICATE]:'This request was already processed (duplicate idempotency key)',
  [E.BILLING_INVOICE_EXISTS]:       'An invoice already exists for this booking',
  [E.BILLING_INVOICE_NUMBER_FAILED]:'Failed to generate unique invoice number after retries',
  [E.BILLING_INVOICE_NOT_FOUND]:    'Invoice not found',
  [E.BILLING_INVALID_ID]:           'Invalid invoice ID',
  [E.BILLING_ACCESS_DENIED]:        'Access denied',
  [E.BILLING_PATIENT_NOT_FOUND]:    'Patient not found',
  [E.BILLING_DOCTOR_NOT_FOUND]:     'Doctor not found',
  [E.BILLING_BOOKING_INVALID]:      'Booking is not valid for this invoice',

  // Guest
  [E.GUEST_TENANT_REQUIRED]:        'Tenant ID is required',
  [E.GUEST_MISSING_FIELDS]:         'Missing required fields',
  [E.GUEST_INVALID_RUT]:            'Invalid RUT',
  [E.GUEST_INVALID_DATE]:           'Invalid date format',
  [E.GUEST_INVALID_TIME]:           'Invalid time format',
  [E.GUEST_RUT_BLOCKED]:            'Your RUT is blocked due to missed appointments.',
  [E.GUEST_DOCTOR_NOT_FOUND]:       'Doctor not found',
  [E.GUEST_SLOT_BOOKED]:            'This time slot is already booked',
  [E.GUEST_CONFIRM_TOKEN_REQUIRED]: 'Confirmation token required to cancel guest booking',
  [E.GUEST_AUTH_OR_RUT_REQUIRED]:   'Authentication or RUT required to cancel',
  [E.GUEST_BOOKING_NOT_FOUND]:      'Booking not found',
  [E.GUEST_RUT_REQUIRED]:           'RUT is required to cancel as guest',

  // Reports
  [E.REPORT_INVALID_TYPE]:          'Invalid report type',
  [E.REPORT_NOT_FOUND]:             'Report not found',
  [E.REPORT_MISSING_PARAMS]:        'type, date_from, and date_to are required',
  [E.REPORT_INVALID_ID]:            'Invalid report ID',

  // Super-Admin
  [E.SA_TENANT_NOT_FOUND]:          'Tenant not found',
  [E.SA_TENANT_DELETED]:            'Tenant not found or already deleted',
  [E.SA_UNKNOWN_FIELD]:             'Unknown field',
  [E.SA_NO_FIELDS]:                 'No fields to update',
  [E.SA_USER_NOT_FOUND]:            'User not found',

  // SaaS
  [E.SAAS_PLAN_NOT_FOUND]:          'Plan not found',
  [E.SAAS_PLAN_BY_ID_NOT_FOUND]:    'Plan not found',
  [E.SAAS_SUBSCRIPTION_EXISTS]:     'Tenant already has an active subscription. Change plan instead.',
  [E.SAAS_NO_SUBSCRIPTION]:         'No active subscription found. Create one first.',
  [E.SAAS_ALREADY_ON_PLAN]:         'Already on this plan.',
  [E.SAAS_NO_ACTIVE_SUBSCRIPTION]:  'No active subscription to cancel.',
  [E.SAAS_TENANT_NOT_FOUND]:        'Tenant not found',
  [E.SAAS_DOMAIN_EXISTS]:           'Tenant with this domain already exists',
  [E.SAAS_CAPTCHA_FAILED]:          'CAPTCHA verification failed',
  [E.SAAS_NO_FIELDS]:               'No valid fields to update',
  [E.SAAS_PLAN_REQUIRED]:           'plan_code is required',
  [E.SAAS_UNKNOWN_FIELD]:           'Unknown field',

  // Specialties
  [E.SPECIALTY_NAME_REQUIRED]:      'Name is required',
  [E.SPECIALTY_NOT_FOUND]:          'Specialty not found',
  [E.SPECIALTY_NO_FIELDS]:          'No fields to update',

  // Medical History
  [E.MEDICAL_HISTORY_NOT_FOUND]:    'Medical history entry not found',

  // CIE-10
  [E.CIE10_NOT_FOUND]:              'CIE-10 entry not found',

  // Clinical Templates
  [E.TEMPLATE_NOT_FOUND]:           'Clinical template not found',
  [E.TEMPLATE_UNAUTHORIZED]:        'Clinical template not found or unauthorized',

  // Validation
  [E.VALIDATION_FAILED]:            'Validation failed',

  // Tenant
  [E.TENANT_NOT_FOUND]:             'Tenant not found',
  [E.TENANT_MISSING]:               'Missing tenant_id',

  // Access
  [E.ACCESS_DENIED]:                'Access denied',

  // Crypto
  [E.CRYPTO_ENCRYPTION_KEY_MISSING]:'ENCRYPTION_KEY environment variable must be set separately from JWT_SECRET',
  [E.CRYPTO_INVALID_FORMAT]:        'Invalid encrypted format',
  [E.CRYPTO_HMAC_SECRET_MISSING]:   'AUDIT_HMAC_SECRET environment variable is required for audit log integrity',
  [E.CRYPTO_HMAC_SECRET_TOO_SHORT]: 'AUDIT_HMAC_SECRET must be at least 32 characters',
  [E.CRYPTO_JWT_SECRET_MISSING]:    'JWT_SECRET environment variable is required',

  // Email
  [E.EMAIL_SEND_FAILED]:            'Email send failed',
};
