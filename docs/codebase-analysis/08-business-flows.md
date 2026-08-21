# 08 — Business Flows

Six real, traced end-to-end workflows. Login and the admin purge are diagrammed in
full in `07-authentication-authorization.md`; they are summarized again here for
completeness alongside four more domain flows.

## 1. Login (summary — full trace in doc 07)

Browser → `useAuth.login()` → `authAPI.login()` → `POST /api/Authentication/login`
(`@Public()`) → `AuthenticationService.login()` (credential check, email-verified
check, suspended check) → JWT signed with `{sub, email, role, numericId}` → stored
in `localStorage` + a `user` cookie → `middleware.ts` and `dashboard/layout.tsx`
redirect based on the cookie's `role`. See `07-authentication-authorization.md`
for the full sequence diagram and the confirmed finding that the maintenance-mode
login gate is non-functional (`settingsAPI` is a stub).

## 2. Student trip booking

```mermaid
sequenceDiagram
    participant S as Student (Browser)
    participant FE as BookingModal / book-trip page
    participant API as tripAPI.createBooking / tripBookingAPI
    participant BE as TripBookingController
    participant SVC as TripBookingService
    participant DB as MongoDB

    S->>FE: select trip, pickup stop
    FE->>API: check-eligibility, has-booked (pre-checks)
    API->>BE: GET /api/TripBooking/check-eligibility
    BE->>SVC: checkEligibility(tripId, studentId)
    SVC->>DB: findOne({tripId, studentId, status != Cancelled})
    DB-->>SVC: existing booking or null
    SVC-->>FE: eligible: true/false
    S->>FE: confirm booking
    FE->>API: createBooking(dto)
    API->>BE: POST /api/TripBooking
    BE->>SVC: create(dto)
    SVC->>DB: findOne trip by numericId
    alt trip not found
        SVC-->>FE: 404 NotFoundException
    else found
        SVC->>DB: bookingModel.create(dto)
        SVC->>DB: tripModel.findByIdAndUpdate($inc bookedSeats +1)
        Note over SVC,DB: NOT wrapped in a transaction — two separate writes
        SVC-->>FE: 200 {success:true}
    end
```

Key files: `frontend/src/components/booking/BookingModal.tsx`,
`frontend/src/app/dashboard/student/book-trip/page.tsx`,
`backend/src/modules/trip-booking/trip-booking.controller.ts`,
`backend/src/modules/trip-booking/trip-booking.service.ts:48-56`.

**Confirmed risk**: `TripBookingService.create()` does two sequential writes
(insert the booking, then `$inc` the trip's `bookedSeats`) with no Mongoose
transaction — under concurrent bookings near a trip's capacity limit, this is a
potential race condition (double-booking the last seat), though there is no
capacity check against `bookedSeats` visible in `create()` at all — capacity
enforcement, if any, appears to live only in the frontend UI. This is flagged as
a likely-issue in `14-risks-observations.md`, pending a full read of any
capacity-check logic in the booking page component that might mitigate it
client-side (not a substitute for server-side enforcement).

Cancellation (`TripBookingService.cancel()`, `trip-booking.service.ts:72-84`)
mirrors this: sets `status:'Cancelled'`, decrements `bookedSeats`, again without
a transaction.

**Second write path**: the `Bookings` module
(`backend/src/modules/bookings/bookings.controller.ts`) can also create/delete
documents in the same `tripbookings` collection via direct Mongoose model access,
entirely bypassing `TripBookingService` — so seat-count and eligibility logic can
be skipped if a caller uses this path instead. See `05-api-map.md`.

## 3. Live bus tracking

```mermaid
sequenceDiagram
    participant D as Driver (mobile browser)
    participant GEO as navigator.geolocation
    participant HOOK as useDriverTracking()
    participant REST as POST /api/BusTracking/location
    participant GW as BusTrackingGateway (/tracking)
    participant WATCH as Admin/MovementManager (Live map)

    D->>HOOK: start tracking
    HOOK->>GEO: watchPosition() + 7s interval fallback
    GEO-->>HOOK: {lat, lng, speed}
    HOOK->>REST: POST location {busId, latitude, longitude, speed} (@Roles Driver)
    REST->>REST: BusTrackingService.updateLocation() — upsert BusLocation by busId
    REST->>GW: emitLocationUpdate(payload)
    GW->>WATCH: socket.io broadcast "bus-location-update" (all connected clients)
    WATCH->>WATCH: MapboxMap plots marker from payload

    D->>HOOK: stop tracking
    HOOK->>REST: POST /api/BusTracking/stop/:busId (@Roles Driver)
    REST->>REST: verify location.driverId === requesting driver, else 403
    REST->>GW: emitTrackingStopped(payload)
    GW->>WATCH: socket.io broadcast "bus-tracking-stopped"
```

Key files: `frontend/src/hooks/useBusTracking.ts:71-170`,
`backend/src/modules/bus-tracking/bus-tracking.controller.ts`,
`backend/src/modules/bus-tracking/bus-tracking.service.ts`,
`backend/src/modules/bus-tracking/bus-tracking.gateway.ts`,
`frontend/src/components/maps/MapboxMap.tsx`.

**Confirmed risk**: the Socket.IO gateway has no handshake authentication
(`cors: {origin: '*', credentials: true}`) and broadcasts to **all** connected
clients with no room/target filtering — any client that can reach the
`/tracking` namespace (not just authorized Admin/MovementManager/Driver users)
receives every bus's live location. The REST endpoints that write the location
data are role-guarded; the socket that broadcasts it is not.

## 4. Payment submission and review (subscription activation)

```mermaid
sequenceDiagram
    participant St as Student
    participant Ad as Admin
    participant FE1 as Student payment UI
    participant FE2 as Admin payment review UI
    participant BE as PaymentController
    participant SVC as PaymentService
    participant DB as MongoDB (payments, studentsubscriptions)

    St->>FE1: submit payment (offline bank transfer reference, or "Online" label)
    FE1->>BE: POST /api/Payment {studentId, subscriptionPlanId, amount, paymentMethod, paymentReferenceCode}
    BE->>SVC: create(dto, userId)
    SVC->>DB: payments.create({status:'Pending', ...})
    SVC-->>FE1: 200 created (Pending)

    Ad->>FE2: open pending payments list
    FE2->>BE: GET /api/Payment/pending
    Ad->>FE2: review payment (Accept/Reject)
    FE2->>BE: PUT /api/Payment/:id/review {status, reviewNotes}
    BE->>SVC: review(id, dto, adminId)
    SVC->>DB: payments.findByIdAndUpdate({status, adminReviewedById, reviewedAt, reviewNotes})
    alt status == 'Accepted'
        SVC->>DB: studentsubscriptions — create new or extend existing active subscription
        Note over SVC,DB: real cross-module business logic triggered by a status change
    end
    SVC-->>FE2: 200 updated
```

Key files: `backend/src/modules/payment/payment.controller.ts`,
`backend/src/modules/payment/payment.service.ts` (`review()` around lines
90-138), `backend/src/modules/payment/payment.schema.ts`.

**Confirmed risk**: `PUT /api/Payment/:id/review` has **no `@Roles()` guard** —
any authenticated user (including a Student) can call it directly against the
API, approving their own or another student's payment and triggering the
subscription-activation side effect. This is one of the highest-severity
findings in the codebase (financial/business-logic bypass) — see
`14-risks-observations.md`.

## 5. Admin database purge (summary — full trace in doc 07)

Admin types the confirmation phrase and re-enters their password in a modal on
`frontend/src/app/dashboard/admin/settings/page.tsx` →
`adminSystemAPI.purgeDatabase()` → `POST /api/Admin/System/purge`
(`@Roles('Admin')` class-level) → `AdminSystemService.purgeDatabase()` re-fetches
the admin, checks the exact confirmation phrase, bcrypt-verifies the password,
then runs a transactional (or logged non-atomic fallback) `deleteMany({})` across
12 business collections plus all users except the acting admin, preserving
`settings`. See `07-authentication-authorization.md` for the full sequence
diagram and defense-in-depth breakdown.

## 6. Profile picture upload

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Profile page
    participant BE as UsersController
    participant MULTER as Multer FileInterceptor
    participant DISK as backend/uploads/
    participant DB as MongoDB (users)

    U->>FE: select image file
    FE->>BE: PUT /api/Users/update-profile-picture (multipart/form-data, field "profilePicture")
    BE->>MULTER: FileInterceptor fileFilter — mimetype in {jpeg,png,webp,gif}?
    alt rejected mimetype
        MULTER-->>FE: 400 BadRequestException
    else size > 5MB
        MULTER-->>FE: 400 (MulterError LIMIT_FILE_SIZE, mapped by AllExceptionsFilter)
    else accepted
        MULTER->>DISK: write file with Multer's auto-generated random filename
        BE->>BE: fileUrl = "/uploads/" + file.filename
        BE->>DB: UsersService.updateProfilePicture(userId, fileUrl) — stores URL string only
        DB-->>BE: updated user
        BE-->>FE: 200 {profilePictureUrl}
        FE->>U: render <img src="{BACKEND_ORIGIN}/uploads/...">
    end
```

Key files: `backend/src/modules/users/users.controller.ts:98-120`,
`backend/src/modules/users/users.module.ts` (`MulterModule.register({dest:
'./uploads'})`), `backend/src/main.ts:46-56` (static serving at `/uploads/`
prefix).

**Confirmed characteristics**: validation is by MIME type only (no magic-byte/
content sniffing), 5MB limit, random filenames avoid path-traversal/overwrite
risk, but **no old-file cleanup** on re-upload — orphaned files accumulate in
`backend/uploads/` (and, in production, the persistent
`/var/lib/elrenad/uploads` symlink target) indefinitely. See
`10-file-uploads` coverage in `04-backend-architecture.md` and the risk entry in
`14-risks-observations.md`.
