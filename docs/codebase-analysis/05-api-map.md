# 05 — API Map

Backend base path: `/api` (each controller's `@Controller('api/...')` prefix).
Frontend caller column is based on direct reads of `frontend/src/lib/api.ts`,
`frontend/src/services/tripService.ts`, and `frontend/src/hooks/useBusTracking.ts`,
cross-referenced with literal endpoint-path greps across the frontend source tree.
"Frontend Next.js API routes" (`frontend/src/app/api/*`) are excluded as callers —
that tree is a disconnected legacy mock backend (see `03-frontend-architecture.md`)
and is structurally unable to call the real backend through the normal client.

Legend for the **Status** column: **Used** = a confirmed live caller exists;
**Backend-only** = no caller found anywhere in `frontend/src` outside the dead
`app/api/*` tree; **Stubbed-frontend** = a frontend API function exists but never
actually calls this backend route (returns a hardcoded value instead);
**Needs-verification** = a caller reference exists but could not be fully confirmed
as reachable from live UI.

## Authentication (`api/Authentication`) — all `@Public()`

| Method | Endpoint | Auth | Frontend caller | Backend handler | Service | Status |
|---|---|---|---|---|---|---|
| POST | /Authentication/login | Public | `authAPI.login` (`lib/api.ts:334-341`) | `AuthenticationController.login` | `AuthenticationService.login` | Used |
| POST | /Authentication/registration-student | Public | `authAPI.registerStudent` (`lib/api.ts:305-317`) | `.registerStudent` | `.registerStudent` | Used |
| POST | /Authentication/registration-staff | Public | `authAPI.registerStaff` (`lib/api.ts:319-330`) | `.registerStaff` | `.registerStaff` | Used — **Critical risk: public, unauthenticated, can create an Admin account with a hardcoded default password `'DefaultPass123!'`** (see `14-risks-observations.md`) |
| POST | /Authentication/verification | Public | `authAPI.verifyEmail` (`lib/api.ts:344-350`) | `.verifyEmail` | `.verifyEmail` | Used |
| POST | /Authentication/forgot-password | Public | `authAPI.forgotPassword` (`lib/api.ts:356-365`) | `.forgotPassword` | `.forgotPassword` | Used |
| POST | /Authentication/reset-password | Public | `authAPI.resetPassword` (`lib/api.ts:369-378`) | `.resetPassword` | `.resetPassword` | Used |

## Users (`api/Users`) — no `@Roles()` on any route

| Method | Endpoint | Auth | Frontend caller | Backend handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Users | Authenticated (any role) | `userAPI.getAll` (`lib/api.ts:447`) | `getAll` | `getAll`/`getByEmail` | Used — no role restriction, see 14 |
| GET | /Users/profile | Authenticated | `userAPI.getProfile` (`lib/api.ts:497-504`) | `getProfile` | `getProfile` | Used |
| GET | /Users/by-role/:role | Authenticated | `userAPI.getByRole` (`lib/api.ts:455`) | `getByRole` | `getByRole` | Used |
| GET | /Users/students-data | Authenticated | (`lib/api.ts:1302-1304`) | `getStudentsData` | `getStudentsData` | Used |
| GET | /Users/students-data/:id | Authenticated | (`lib/api.ts:1309-1311`) | `getStudentDataById` | `getStudentDataById` | Used |
| GET | /Users/:id | Authenticated | `userAPI.getById` (`lib/api.ts:463`) | `getById` | `getById` | Used — no role restriction, any user can fetch any other user's record |
| POST | /Users/change-password | Authenticated | (`lib/api.ts:490`) | `changePassword` | `changePassword` | Used |
| PUT | /Users/profile | Authenticated | (`lib/api.ts:528`) | `updateProfile` | `updateProfile` | Used |
| PUT | /Users/driver-profile | Authenticated | (`lib/api.ts:541`) | `updateDriverProfile` | `updateProfile` | Used |
| PUT | /Users/movement-manager-profile | Authenticated | (`lib/api.ts:553`) | `updateMovementManagerProfile` | `updateProfile` | Used |
| PUT | /Users/admin-profile | Authenticated | (`lib/api.ts:565`) | `updateAdminProfile` | `updateProfile` | Used |
| PUT | /Users/student-profile | Authenticated | (`lib/api.ts:581`) | `updateStudentProfile` | `updateProfile` | Used |
| PUT | /Users/update-profile-picture | Authenticated | (`lib/api.ts:610`) | `updateProfilePicture` (Multer) | `updateProfilePicture` | Used |
| DELETE | /Users/:id | Authenticated | (`lib/api.ts:510-516`) | `deleteUser` | `deleteUser` | Used — **no role restriction: any authenticated user can delete any other user's account**, see 14 |
| PATCH | /Users/:id | Authenticated | (`lib/api.ts:472`) | `updateUser` | `updateUser` | Used — no role restriction |

## Buses (`api/Buses`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Buses | Authenticated | `busAPI.getAll` (`lib/api.ts:662`) | `getAll` | `getAll` | Used |
| POST | /Buses | Authenticated | (`lib/api.ts:673`) | `create` | `create` | Used — no role restriction |
| GET | /Buses/:id | Authenticated | (`lib/api.ts:669`) | `getById` | `getById` | Used |
| PUT | /Buses/:id | Authenticated | (`lib/api.ts:680`) | `update` | `update` | Used — no role restriction |
| DELETE | /Buses/:id | Authenticated | (`lib/api.ts:687`) | `delete` | `delete` | Used — no role restriction |

## Trip (`api/Trip`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Trip | Authenticated | `tripAPI.getAll`, `tripService.getAll` | `getAll` | `getAll` | Used |
| GET | /Trip/my-trips | Authenticated | `tripAPI.getMyTrips`/`getDriverTrips` (`lib/api.ts`) | `getMyTrips` | `getMyTrips` | Used |
| GET | /Trip/upcoming | Authenticated | none found | `getUpcoming` | `getUpcoming` | **Possibly-unused** |
| GET | /Trip/completed | Authenticated | `tripService.getCompleted` (`services/tripService.ts:147`) | `getCompleted` | `getCompleted` | Used |
| GET | /Trip/search | Authenticated | none found | `search` | `search` | **Possibly-unused** |
| GET | /Trip/by-date/:date | Authenticated | `tripAPI.getByDate`, `tripService` | `getByDate` | `getByDate` | Used |
| GET | /Trip/by-driver/:driverId | Authenticated | `tripAPI.getByDriver` | `getByDriver` | `getByDriver` | Used |
| GET | /Trip/by-bus/:busId | Authenticated | `tripAPI.getByBus` | `getByBus` | `getByBus` | Used |
| GET | /Trip/status/:status | Authenticated | none found | `getByStatus` | `getByStatus` | **Possibly-unused** |
| GET | /Trip/:id | Authenticated | `tripAPI.getById`, `tripService.getById` | `getById` | `getById` | Used |
| POST | /Trip | Authenticated | `tripAPI.create` | `create` | `create` | Used — no role restriction |
| POST | /Trip/renew/:id | Authenticated | `tripService.renew` (`tripService.ts:155`) | `renew` | `renew` | Used |
| PUT | /Trip/:id | Authenticated | `tripAPI.update` | `update` | `update` | Used — no role restriction |
| PUT | /Trip/:id/status | Authenticated | none found | `updateStatus` | `updateStatus` | **Possibly-unused** — needs-verification, likely called from an admin trip page not covered by the researched sample |
| PUT | /Trip/:id/driver | Authenticated | none found | `updateDriver` | `updateDriver` | **Possibly-unused** |
| PUT | /Trip/:id/bus | Authenticated | none found | `updateBus` | `updateBus` | **Possibly-unused** |
| PUT | /Trip/:id/conductor | Authenticated | none found | `updateConductor` | `updateConductor` | **Possibly-unused** |
| DELETE | /Trip/:id | Authenticated | `tripAPI.delete`, `tripService.remove` | `delete` | `delete` | Used — no role restriction |

## TripBooking (`api/TripBooking`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| POST | /TripBooking | Authenticated | `tripAPI.createBooking`, `tripBookingAPI` (`lib/api.ts:1130-1132`) | `create` | `create` | Used |
| POST | /TripBooking/search | Authenticated | (`lib/api.ts:1165-1167`) | `search` | `search` | Used |
| GET | /TripBooking/by-trip/:tripId | Authenticated | (`lib/api.ts:1174-1176`) | `getByTrip` | `getByTrip` | Used |
| GET | /TripBooking/by-student/:studentId | Authenticated | (`lib/api.ts:1180-1182`) | `getByStudent` | `getByStudent` | Used |
| GET | /TripBooking/by-date/:date | Authenticated | (`lib/api.ts:1186-1188`) | `getByDate` | `getByDate` | Used |
| GET | /TripBooking/check-eligibility | Authenticated | (`lib/api.ts:1192-1197`) | `checkEligibility` | `checkEligibility` | Used |
| GET | /TripBooking/has-booked/:tripId | Authenticated | (`lib/api.ts:1201-1203`) | `hasBooked` | `hasBooked` | Used |
| GET | /TripBooking/:id | Authenticated | (`lib/api.ts:1137-1139`) | `getById` | `getById` | Used |
| PUT | /TripBooking/update-trip-pickup/:id | Authenticated | (`lib/api.ts:1155-1160`) | `updatePickupLocation` | `updatePickupLocation` | Used |
| PATCH | /TripBooking/:bookId/cancel | Authenticated | (`lib/api.ts:1149-1151`, PATCH via cancel wrapper) | `cancel` | `cancel` | Used |
| DELETE | /TripBooking/:id | Authenticated | (`lib/api.ts:1143-1145`) | `delete` | `delete` | Used — no role restriction |

## Bookings (`api/Bookings`) — legacy/parallel surface, no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Bookings | Authenticated | `bookingAPI` (`lib/api.ts:1210-1217`, marked "legacy" in source comments) | `getAll` | direct Model access | Used, legacy — bypasses `TripBookingService` |
| GET | /Bookings/:id | Authenticated | (`lib/api.ts:1211`) | `getById` | direct Model access | Used |
| POST | /Bookings | Authenticated | (`lib/api.ts:1213`) | `create` | direct Model access | Used — does not update `Trip.bookedSeats` the way `TripBookingService.create` does; a data-consistency risk if both write paths are live simultaneously |
| PATCH | /Bookings/:id | Authenticated | (`lib/api.ts:1222-1227`) | `update` | direct Model access | Used |
| DELETE | /Bookings/:id | Authenticated | (`lib/api.ts:1227`) | `delete` | direct Model access | Used — no role restriction |

## Payment (`api/Payment`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Payment | Authenticated | `paymentAPI.getAll` | `getAll` | `getAll` | Used — no role restriction |
| GET | /Payment/my-payments | Authenticated | (`lib/api.ts`) | `getMyPayments` | `getMyPayments` | Used |
| GET | /Payment/pending | Authenticated | (`lib/api.ts`) | `getPending` | `getPending` | Used |
| GET | /Payment/statistics | Authenticated | (`lib/api.ts`) | `getStatistics` | `getStatistics` | Used |
| GET | /Payment/by-status/:status | Authenticated | (`lib/api.ts`) | `getByStatus` | `getByStatus` | Used |
| GET | /Payment/by-student/:studentId | Authenticated | (`lib/api.ts`) | `getByStudent` | `getByStudent` | Used |
| GET | /Payment/by-subscription-plan/:planId | Authenticated | (`lib/api.ts`) | `getBySubscriptionPlan` | `getBySubscriptionPlan` | Used |
| GET | /Payment/:id | Authenticated | (`lib/api.ts`) | `getById` | `getById` | Used |
| POST | /Payment | Authenticated | (`lib/api.ts`) | `create` | `create` | Used |
| PUT | /Payment/:id/review | Authenticated | (`lib/api.ts`) | `review` | `review` (auto-creates/extends `StudentSubscription` on Accept) | Used — **no role restriction: any authenticated user can approve/reject payments**, see 14 (High) |
| DELETE | /Payment/:id | Authenticated | (`lib/api.ts`) | `delete` | `delete` | Used — no role restriction |

## Notifications (`api/Notifications`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Notifications | Authenticated | `notificationAPI` (`lib/api.ts:1005-1007`) | `getAll` | `getAll` | Used |
| GET | /Notifications/unread | Authenticated | (`lib/api.ts`) | `getUnread` | `getUnread` | Used |
| GET | /Notifications/unread-count | Authenticated | (`lib/api.ts:1000`) | `getUnreadCount` | `getUnreadCount` | Used |
| GET | /Notifications/admin/all | Authenticated | (`lib/api.ts:1044-1045`) | `getAllAdmin` | `getAllAdmin` | Used — no role restriction |
| GET | /Notifications/:id | Authenticated | (`lib/api.ts:1002-1003`) | `getById` | `getById` | Used |
| POST | /Notifications | Authenticated | (`lib/api.ts`) | `create` | `create` | Used |
| POST | /Notifications/broadcast | Authenticated | (`lib/api.ts:1018-1020`) | `broadcast` | `broadcast` (insertMany per user) | Used — no role restriction: any authenticated user can broadcast to all users |
| PUT | /Notifications/:id/mark-read | Authenticated | (`lib/api.ts:1012-1014`) | `markRead` | `markRead` | Used |
| PUT | /Notifications/mark-all-read | Authenticated | (`lib/api.ts:1031-1033`) | `markAllRead` | `markAllRead` | Used |
| DELETE | /Notifications/clear-all | Authenticated | (`lib/api.ts:1037-1039`) | `clearAll` | `clearAll` | Used |
| DELETE | /Notifications/admin/:id | Authenticated | (`lib/api.ts:1047-1049`) | `deleteAdmin` | `deleteAdmin` | Used — no role restriction |
| DELETE | /Notifications/:id | Authenticated | (`lib/api.ts:1025-1027`) | `delete` | `delete` | Used |

## SubscriptionPlan (`api/SubscriptionPlan`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /SubscriptionPlan | Authenticated | `subscriptionPlansAPI` (`lib/api.ts:1061-1063`) | `getAll` | `getAll` | Used |
| GET | /SubscriptionPlan/active | Authenticated | (`lib/api.ts:1066-1068`) | `getActive` | `getActive` | Used |
| GET | /SubscriptionPlan/by-price-range | Authenticated | (`lib/api.ts:1106-1112`) | `getByPriceRange` | `getByPriceRange` | Used |
| GET | /SubscriptionPlan/by-duration | Authenticated | (`lib/api.ts:1116-1122`) | `getByDuration` | `getByDuration` | Used |
| GET | /SubscriptionPlan/:id | Authenticated | (`lib/api.ts:1071-1073`) | `getById` | `getById` | Used |
| POST | /SubscriptionPlan | Authenticated | (`lib/api.ts:1076-1078`) | `create` | `create` | Used — no role restriction |
| PUT | /SubscriptionPlan/:id | Authenticated | (`lib/api.ts:1082-1087`) | `update` | `update` | Used — no role restriction |
| PUT | /SubscriptionPlan/:id/activate | Authenticated | (`lib/api.ts:1091-1093`) | `activate` | `activate` | Used |
| PUT | /SubscriptionPlan/:id/deactivate | Authenticated | (`lib/api.ts:1096-1098`) | `deactivate` | `deactivate` | Used |
| DELETE | /SubscriptionPlan/:id | Authenticated | (`lib/api.ts:1101-1103`) | `delete` | `delete` | Used — no role restriction |

## StudentSubscription (`api/StudentSubscription`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /StudentSubscription/my-active-subscription | Authenticated | (`lib/api.ts:1368-1370`) | `getMyActive` | `getMyActive` | Used |
| GET | /StudentSubscription/my-subscriptions | Authenticated | (`lib/api.ts:1374-1376`) | `getMySubscriptions` | `getMySubscriptions` | Used |
| GET | /StudentSubscription/expiring-soon | Authenticated | (`lib/api.ts:1404-1406`) | `getExpiringSoon` | `getExpiringSoon` | Used |
| GET | /StudentSubscription/expired | Authenticated | (`lib/api.ts:1410-1412`) | `getExpired` | `getExpired` | Used |
| GET | /StudentSubscription/by-student/:studentId | Authenticated | (`lib/api.ts:1386-1388`) | `getByStudent` | `getByStudent` | Used |
| GET | /StudentSubscription/by-plan/:planId | Authenticated | (`lib/api.ts:1392-1394`) | `getByPlan` | `getByPlan` | Used |
| GET | /StudentSubscription/by-status/:status | Authenticated | (`lib/api.ts:1398-1400`) | `getByStatus` | `getByStatus` | Used |
| GET | /StudentSubscription/:id | Authenticated | (`lib/api.ts:1380-1382`) | `getById` | `getById` | Used |
| PUT | /StudentSubscription/:id/activate | Authenticated | (`lib/api.ts:1416-1418`) | `activate` | `activate` | Used |
| PUT | /StudentSubscription/:id/suspend | Authenticated | (`lib/api.ts:1422-1424`) | `suspend` | `suspend` | Used |

## Routes (`api/Routes`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Routes | Authenticated | `routeAPI` (`lib/api.ts:1340`) | `getAll` | `getAll` | Used |
| GET | /Routes/:id | Authenticated | (`lib/api.ts:1343`) | `getById` | `getById` | Used |
| POST | /Routes | Authenticated | (`lib/api.ts:1347`) | `create` | `create` | Used — no role restriction |
| PUT | /Routes/:id | Authenticated | (`lib/api.ts:1354`) | `update` | `update` | Used — no role restriction |
| DELETE | /Routes/:id | Authenticated | (`lib/api.ts:1361`) | `delete` | `delete` | Used — no role restriction |

## TripRoutes (`api/TripRoutes`) — duplicate of Routes

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /TripRoutes | Authenticated | none found | wraps `RoutesService.getAll` (ignores query params) | `RoutesService` | **Possibly-unused** |
| GET | /TripRoutes/:id | Authenticated | none found | wraps `RoutesService.getById` | `RoutesService` | **Possibly-unused** |
| POST | /TripRoutes | Authenticated | none found | wraps `RoutesService.create` | `RoutesService` | **Possibly-unused** |
| PUT | /TripRoutes/:id | Authenticated | none found | wraps `RoutesService.update` | `RoutesService` | **Possibly-unused** |
| DELETE | /TripRoutes/:id | Authenticated | none found | wraps `RoutesService.delete` | `RoutesService` | **Possibly-unused** |

## Attendance (`api/Attendance`) — no `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Attendance | Authenticated | `attendanceAPI` (`lib/api.ts:1234-1235`) | `getAll` | `getAll` | Used |
| GET | /Attendance/:id | Authenticated | (`lib/api.ts:1235`) | `getById` | `getById` | Used |
| POST | /Attendance | Authenticated | (`lib/api.ts:1237`) | `create` | `create` | Used |
| PATCH | /Attendance/:id | Authenticated | (`lib/api.ts:1241`) | `update` | `update` | Used |
| DELETE | /Attendance/:id | Authenticated | (`lib/api.ts:1246-1251`) | `delete` | `delete` | Used — no role restriction |

## StudentDashboard (`api/StudentDashboard`) — no `@Roles()`, no ownership check

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /StudentDashboard/:studentId/stats | Authenticated | `studentDashboardAPI` (`lib/api.ts:1328-1330`) | `getStats` | `getStats` | Used — any authenticated user can view any student's stats by ID |
| GET | /StudentDashboard/:studentId/recent-trips | Authenticated | (`lib/api.ts:1332`) | `getRecentTrips` | `getRecentTrips` | Used |
| GET | /StudentDashboard/:studentId/upcoming-trips | Authenticated | (`lib/api.ts:1334`) | `getUpcomingTrips` | `getUpcomingTrips` | Used |
| GET | /StudentDashboard/:studentId/payments | Authenticated | (`lib/api.ts`) | `getPayments` | `getPayments` | Used |

## Settings (`api/Settings`)

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Settings | Authenticated | `settingsAPI.get` (**stubbed** — never calls network, `lib/api.ts:1259-1266`) | `getSettings` | `getSettings` | **Stubbed-frontend / Backend-only in practice** — the real endpoint is never reached from the UI |
| GET | /Settings/maintenance-mode | Public | `settingsAPI.getMaintenanceMode` (**stubbed** — always returns `{maintenanceMode:false}`, `lib/api.ts:1271-1273`) | `getMaintenanceMode` | `getMaintenanceMode` | **Stubbed-frontend** — the login-time maintenance-mode gate in `useAuth.ts` is effectively dead code; see `14-risks-observations.md` |
| PUT | /Settings | Authenticated | `settingsAPI.update` (**stubbed** — no-ops, `lib/api.ts:1267-1270`) | `updateSettings` | `updateSettings` | **Stubbed-frontend** — the admin settings UI cannot actually persist changes through this client function as written; needs-verification whether the admin settings page uses a different, non-stubbed call path |

## Forms (`api/Forms`) — `@Public()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Forms | Public | `formsAPI` (`lib/api.ts:1056`) | `getForms` | static lookup lists | Used |

## BusTracking (`api/BusTracking`) — the one module with consistent `@Roles()`

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| POST | /BusTracking/location | `@Roles('Driver')` | `useDriverTracking` (`hooks/useBusTracking.ts:81`) | `updateLocation` | `updateLocation` (+ gateway emit) | Used |
| GET | /BusTracking/location/:busId | `@Roles('Admin','MovementManager','Driver')` | `busTrackingAPI.getLocation` (`hooks/useBusTracking.ts:174`) | `getLocation` | `getLocationByBusId` | Used |
| GET | /BusTracking/locations | `@Roles('Admin','MovementManager')` | `busTrackingAPI.getAllLocations` (`hooks/useBusTracking.ts:177`) | `getAllLocations` | `getAllLocations` | Used |
| GET | /BusTracking/locations/all | `@Roles('Admin')` | `busTrackingAPI.getAllLocationsIncludingInactive` (`hooks/useBusTracking.ts:180`) | `getAllLocationsIncludingInactive` | `getAllLocationsIncludingInactive` | Used |
| POST | /BusTracking/stop/:busId | `@Roles('Driver')` | `useDriverTracking.stopTracking` (`hooks/useBusTracking.ts:145`) | `stopTracking` | `stopTracking` (+ gateway emit; ownership-checked) | Used |

Plus the Socket.IO `/tracking` namespace (`bus-location-update`,
`bus-tracking-stopped` events) consumed by `useBusTrackingSocket`
(`hooks/useBusTracking.ts:21-69`) and `frontend/src/components/maps/*`.

## Voting (`api/Voting`) — writes `@Roles('Admin')`, reads open

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| GET | /Voting | Authenticated | `votingAPI` (`lib/api.ts:1433`) | `getAll` | `getAll` | Used |
| GET | /Voting/active | Authenticated | (`lib/api.ts:1437`) | `getActive` | `getActive` | Used |
| GET | /Voting/:id | Authenticated | (`lib/api.ts:1441`) | `getById` | `getById` | Used |
| GET | /Voting/:id/results | Authenticated | (`lib/api.ts:1445`) | `getResults` | `getSurveyResults` | Used |
| GET | /Voting/:id/results/:dateKey | Authenticated | (`lib/api.ts:1449`) | `getResultsByDate` | `getSurveyResults` | Used |
| GET | /Voting/:id/has-voted | Authenticated | (`lib/api.ts:1453`) | `hasVoted` | `hasVoted` | Used |
| POST | /Voting | `@Roles('Admin')` | (`lib/api.ts:1457`) | `create` | `create` | Used |
| PUT | /Voting/:id | `@Roles('Admin')` | (`lib/api.ts:1460`) | `update` | `update` | Used |
| PUT | /Voting/:id/toggle-active | `@Roles('Admin')` | (`lib/api.ts:1463`) | `toggleActive` | `toggleActive` | Used |
| DELETE | /Voting/:id | `@Roles('Admin')` | (`lib/api.ts:1466`) | `delete` | `delete` | Used |
| POST | /Voting/submit | Authenticated | (`lib/api.ts:1469`) | `submitVote` | `submitVote` | Used |

## Admin/System (`api/Admin/System`) — `@Roles('Admin')` class-level

| Method | Endpoint | Auth | Frontend caller | Handler | Service | Status |
|---|---|---|---|---|---|---|
| POST | /Admin/System/purge | `@Roles('Admin')`, exact confirmation phrase + password re-verification | `adminSystemAPI.purgeDatabase` (`lib/api.ts:1286-1298`) | `purge` | `purgeDatabase` | Used — never invoked during development per commit message |

## Summary of API-map findings

- **Backend-only / possibly-unused, confirmed by grep**: `Trip/upcoming`,
  `Trip/search`, `Trip/status/:status`, `Trip/:id/status`, `Trip/:id/driver`,
  `Trip/:id/bus`, `Trip/:id/conductor`, and the entire `TripRoutes` module. These
  may still be called from a code path this analysis didn't sample (e.g. a
  server action or a dynamically-constructed URL) — flagged
  needs-verification rather than asserted dead.
- **Stubbed-frontend (most important finding in this document)**: `settingsAPI`
  in `frontend/src/lib/api.ts` (`get`, `update`, `getMaintenanceMode`) never
  calls the network — it's a hardcoded local object. This means:
  1. The backend `Settings` module's `GET`/`PUT /api/Settings` and the public
     `GET /api/Settings/maintenance-mode` are live and correctly guarded, but
     effectively unreachable from the current frontend.
  2. `useAuth.login()`'s maintenance-mode login block
     (`frontend/src/hooks/useAuth.ts:116-127`) always sees
     `maintenanceMode: false`, so it can never actually block a login — the
     feature is silently non-functional.
  3. Any admin-facing "system settings" UI backed by `settingsAPI` cannot
     persist real changes through this client function as written.
- **Widespread missing `@Roles()` guards**: the large majority of endpoints
  above are marked "Authenticated (any role)" rather than role-restricted, even
  where the operation is clearly admin-only in intent (delete a user, review a
  payment, broadcast a notification, delete a bus/route/trip, change settings).
  See `14-risks-observations.md` for the consolidated, severity-ranked list.
- **Two write paths onto `tripbookings`**: `TripBooking` (validated,
  seat-count-aware) and `Bookings` (legacy, direct model access, no seat-count
  sync) both remain live and callable from the frontend.
