# SUB-11 — Flujos

## F1. Checkout y activación de suscripción

```
POST /api/saas/checkout { plan_code }          (admin|superadmin)
   |
   v
getPlanByCode(plan_code)  -> NotFound si no existe
   |
   +-- ¿MERCADOPAGO_ACCESS_TOKEN configurado? --
   |                                             |
   |  SÍ                                        NO (MVP/stub)
   |   |                                          |
   |   v                                          v
   |  createCheckoutPreference(...)            createSubscription(tenant, plan)
   |   -> POST /checkout/preferences          -> INSERT subscriptions
   |   -> { init_point }                         status = 'active'
   |   |                                          + INSERT subscription_invoices
   |   v                                          status = 'paid', paid_at = NOW()
   |  201 { url, preferenceId,                   (SIN pago)              [FND-H1]
   |        mode:'mercadopago' }                  |
   |   |                                          v
   |   v                                      201 { subscription, url:'/saas/success...' }
   |  (suscripción se activa luego vía webhook)
   |
   +--> Webhook: POST /api/saas/webhook/mercadopago
          fetchPayment(id)  (re-consulta, no confía en el payload)
             status == 'approved' ?
               -> handleMercadoPagoPaymentApproved
                    findSubscriptionByMpPaymentId -> ¿ya conciliado? skip (idempotente)
                    activateSubscriptionForPayment:
                       UPDATE/INSERT subscriptions status='active'
                       INSERT subscription_invoices 'paid' (si price>0)
```

## F2. Onboarding público de tenant

```
POST /api/saas/onboard    (público, onboardLimiter 3/hora/ip, validateZod)
   |
   v
verifyCaptchaOnboard(captcha_token)
   - sin RECAPTCHA_SECRET_KEY            -> true (dev)
   - == test-key de Google               -> true (warn, modo prueba)
   - sin token                            -> false (403)
   - siteverify (5s timeout)              -> data.success
   |
   v
onboardTenant(...)  [superAdminPool, BEGIN]
   - SELECT tenants WHERE id=domain FOR UPDATE -> EXISTS? BadRequest
   - INSERT tenants (currency/country resueltos por SUPPORTED_COUNTRIES)
   - bcrypt.hash(adminPassword, 12)
   - INSERT users role='admin' password_changed=true
   - si planCode:
        try { INSERT subscriptions 'active' + INSERT subscription_invoices
              (status 'paid' si price=0, else paid_at NULL) }
        catch -> logger.warn (SILENCIOSO)                     [FND-H9]
   - insertOnboarding(profile)  -> tenant_onboarding
   - insertOnboardingDocuments() -> onboarding_documents
   COMMIT
   |
   v
tenantService.loadFromDB()  (recarga caché de tenants)
201 { tenantId, subscription, message }
```

## F3. Cambio de plan y cancelación

```
POST /api/saas/change-plan { plan_code }        POST /api/saas/cancel
   [superAdminPool, BEGIN]                          [superAdminPool, BEGIN]
   SELECT sub FOR UPDATE (active|trialing)          UPDATE subscriptions
     - no existe -> BadRequest                         SET status='canceled', canceled_at=NOW()
     - igual plan -> BadRequest                        WHERE active|trialing|past_due
   UPDATE subscriptions SET plan_id=new                 - 0 filas -> BadRequest
   INSERT subscription_invoices                         COMMIT
     status='paid', paid_at=NOW()  (SIN cobro)   [FND-H2]
   COMMIT
```

## F4. Job de gracia / past_due (cron)

```
handlePastDueSubscriptions()   [superAdminPool — cross-tenant]        [FND-H3]
   SELECT subscriptions WHERE status = 'past_due'
      |
      for each:
        graceEnd = current_period_end + 7 días
        now > graceEnd ?  -> UPDATE plan_id=free, status='canceled'  (downgrade)
                        :  -> log "past_due, grace ends ..."
   *
   NOTA: ningún código del repo escribe status='past_due'
         (createSubscription=active/trialing, changePlan no cambia status,
          cancel=canceled, webhook=active, onboard='active')
         -> el bucle de gracia es inalcanzable en el flujo actual.
```

## F5. Facturas locales (billing) con idempotencia

```
POST /api/billing  (admin|superadmin|doctor)  header Idempotency-Key opcional
   |
   v
createInvoice(body, tenantId, key)
   - si key: checkIdempotencyKey(key, tenant)
       cache en memoria (Map, TTL 5min)  -> duplicado? BadRequest   [FND-H5]
       readPool: invoices WHERE payment_reference=key AND tenant -> duplicado? BadRequest
       marca la key en cache ANTES de crear
   [pool, BEGIN]
   - pg_advisory_xact_lock(hashtext('create_invoice:'||booking_id||0 || tenant))
   - valida patient/doctor/booking pertenezcan al tenant (fail-closed)
   - total = amount + tax - discount
   - si booking: una factura por booking
   - INSERT invoices (invoice_number INV-year-random, retry 3 sobre 23505)
   - INSERT invoice_items (si vienen)
   COMMIT
201 invoice

PATCH /api/billing/:id/status { status, payment_data }   (admin|superadmin)
   - Zod valida enum ['pending','paid','cancelled','refunded','overdue']
   - UPDATE invoices SET status, payment_data   (sin transición ni paid_at) [FND-H6]

GET /api/billing/stats   (admin|superadmin|doctor)  -> agrega TODO el tenant [FND-H10]
```

## F6. Resolución de features y límites

```
GET /api/saas/features (cualquier autenticado)
   |
   getTenantFeatures(tenant)
      for key in 9 featureKeys:  checkFeatureAccess(key, tenant)   -> 9 queries [FND-H13]
          COALESCE(
            tenant_features.enabled,
            plans.features->>key (plan de la suscripción activa/trialing),
            'false')

GET /api/saas/limits (admin|superadmin)
   checkLimits(tenant, 'doctors'|'patients'|'storage')
      plan = getTenantPlan(tenant)  (o 'free' si no hay suscripción)
      SUM(tenant_usage.metric_value) del mes actual  < límite del plan
```

## F7. Conversión de moneda

```
GET /api/currencies/rates (público)
   getRates() -> { base:'USD', rates: cachedRates, updatedAt }

refreshRates()  (boot + cron):  open.er-api.com/v6/latest/USD
   ok -> cachedRates = pickSupported(rates)
   falla -> conserva cachedRates (o FALLBACK_RATES estáticas)  [FND-H12]

convertFromUsd(usd, currency):
   rate = rates[currency] || cachedRates[currency] || 1
   round(usd * rate, getDecimals(currency))
```
