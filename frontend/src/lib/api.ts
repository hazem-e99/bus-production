/* eslint-disable @typescript-eslint/no-explicit-any */
import { getApiConfig } from "./config";
import {
  LoginDTO,
  VerificationDTO,
  StudentRegistrationDTO,
  ResetPasswordDTO,
  ForgotPasswordDTO,
  StaffRegistrationDTO,
} from "@/types/auth";
import { Bus, BusApiResponse, BusRequest, BusListParams } from "@/types/bus";
import {
  CreateTripDTO,
  TripResponse,
  Trip,
  TripViewModel,
  UpdateTripDTO,
} from "@/types/trip";
import {
  SubscriptionPlanViewModel,
  CreateSubscriptionPlanDTO,
  UpdateSubscriptionPlanDTO,
  SubscriptionPlanViewModelApiResponse,
  SubscriptionPlanViewModelIEnumerableApiResponse,
  BooleanApiResponse,
  StudentSubscriptionViewModel,
  StudentSubscriptionViewModelApiResponse,
  StudentSubscriptionViewModelIEnumerableApiResponse,
  SubscriptionStatus,
  SuspendSubscriptionDTO,
  PaymentViewModel,
  PaymentViewModelApiResponse,
  PaymentViewModelIEnumerableApiResponse,
  PaymentStatus,
  CreatePaymentDTO,
  ReviewPaymentDTO,
  PaymentStatisticsViewModel,
} from "@/types/subscription";
import {
  TripBookingViewModel,
  CreateTripBookingDTO,
  ChangePickupTripBookingDTO,
  TripBookingSearchDTO,
  TripBookingViewModelApiResponse,
  TripBookingViewModelIEnumerableApiResponse,
  BookingStatus,
} from "@/types/tripBooking";
import {
  NotificationViewModel,
  NotificationViewModelApiResponse,
  NotificationViewModelIEnumerableApiResponse,
  CreateNotificationDTO,
  BroadcastNotificationDTO,
  Int32ApiResponse,
} from "@/types/notification";

const apiConfig = getApiConfig();

// Generic API functions
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  let url = apiConfig.buildUrl(endpoint);
  console.log("🌐 Making request to:", url);
  console.log("📋 Request options:", options);
  console.log("📤 Request body:", options?.body);

  // Prevent GET/HEAD requests from having a body. Convert JSON body to query params if provided.
  if (
    options &&
    options.method &&
    /^(GET|HEAD)$/i.test(options.method) &&
    options.body
  ) {
    try {
      const raw = typeof options.body === "string" ? options.body : "";
      const obj = raw ? JSON.parse(raw) : {};
      const params = new URLSearchParams();
      Object.entries(obj || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        params.append(key, String(value));
      });
      const hasQuery = url.includes("?");
      const qs = params.toString();
      if (qs) {
        url = `${url}${hasQuery ? "&" : "?"}${qs}`;
      }
    } catch (e: unknown) {
      console.warn("Failed to convert GET body to query params:", e);
    } finally {
      // Remove body to satisfy fetch constraints for GET/HEAD
      delete (options as RequestInit & { body?: BodyInit | null }).body;
    }
  }

  try {
    // Inject Authorization header from stored user token for global endpoints
    const authHeaders: Record<string, string> = {};
    try {
      const isLocalApi =
        typeof url === "string" &&
        (url.startsWith("/api/") || url.startsWith("/api"));
      // Always try to get token for all APIs
      if (true) {
        // Prefer token from localStorage (client) or cookie (server)
        let token: string | undefined;
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem("user");
          if (raw) {
            const parsed = JSON.parse(raw);
            token = parsed?.token || parsed?.accessToken;
          }
        } else {
          // Best-effort cookie parse for server-side calls
          const cookie =
            (options as RequestInit & { headers?: { cookie?: string } })
              ?.headers?.cookie || "";
          const match = /user=([^;]+)/.exec(cookie);
          if (match) {
            try {
              const parsed = JSON.parse(decodeURIComponent(match[1]));
              token = parsed?.token || parsed?.accessToken;
            } catch {}
          }
        }
        if (token) {
          authHeaders["Authorization"] = `Bearer ${token}`;
          console.log("🔐 Using token for API request:", token.substring(0, 20) + "...");
        } else {
          console.warn("⚠️ No token found in localStorage");
        }
      }
    } catch {}

    const isGet = (options?.method || "GET").toUpperCase() === "GET";

    // For GET requests with body, we need to convert to POST or use query parameters
    const finalUrl = url;
    const finalOptions = { ...options };

    if (isGet && options?.body) {
      // Convert GET with body to POST for compatibility
      finalOptions.method = "POST";
      console.log(
        "🔄 Converting GET request with body to POST for compatibility"
      );
    }

    const response = await fetch(finalUrl, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(finalOptions.method === "GET"
          ? { "Cache-Control": "no-cache", Pragma: "no-cache" }
          : {}),
        ...authHeaders,
        ...finalOptions?.headers,
      },
      ...finalOptions,
    });

    console.log("📥 Response status:", response.status, response.statusText);

    if (!response.ok) {
      // Attempt to read error body for better diagnostics, including validation details
      let errorMessage: string | undefined;
      try {
        const ct = response.headers.get("content-type") || "";
        if (ct.toLowerCase().includes("application/json")) {
          const j = await response.clone().json();
          // Common patterns: { message }, { title }, ValidationProblemDetails: { errors: { field: [..] } }
          if (typeof j?.message === "string" && j.message.trim()) {
            errorMessage = j.message;
          } else if (typeof j?.title === "string" && j.title.trim()) {
            errorMessage = j.title;
          } else if (j?.errors && typeof j.errors === "object") {
            const parts: string[] = [];
            for (const [field, arr] of Object.entries(j.errors)) {
              const msgs = Array.isArray(arr) ? arr.join("; ") : String(arr);
              parts.push(`${field}: ${msgs}`);
            }
            if (parts.length) errorMessage = parts.join(" | ");
          } else {
            errorMessage = JSON.stringify(j);
          }
        } else {
          const txt = await response.clone().text();
          if (txt && txt.trim()) errorMessage = txt;
        }
      } catch {}
      // Handle specific error cases
      if (response.status === 404 || response.status === 401) {
        console.warn(
          `⚠️ Endpoint not found or unauthorized: ${endpoint}. Verify against Swagger and adjust.`
        );
      }

      if (response.status === 401) {
        console.warn(
          `⚠️ Unauthorized access to: ${endpoint} - This endpoint may require authentication`
        );
        // For critical endpoints, surface the error to the caller instead of returning empty
        if (
          endpoint.includes("/TripRoutes") ||
          endpoint.includes("/Buses") ||
          endpoint.includes("/Trips") ||
          endpoint.includes("/Trip")
        ) {
          throw new Error("Unauthorized");
        }
        return [] as T;
      }

      const baseMsg = `API request failed: ${response.status} ${response.statusText}`;
      const withBody = errorMessage ? `${baseMsg} - ${errorMessage}` : baseMsg;
      throw new Error(withBody);
    }

    // Try to parse JSON safely; handle 204/empty bodies and servers that return JSON with wrong content-type
    const contentType = response.headers.get("content-type") || "";
    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader
      ? parseInt(contentLengthHeader, 10)
      : undefined;
    if (response.status === 204 || contentLength === 0) {
      return {} as unknown as T;
    }

    // Read body as text first, then try to JSON.parse. This handles servers that return JSON but set
    // the Content-Type to text/plain or omit it.
    const rawText = await response.text();
    if (!rawText) {
      return {} as unknown as T;
    }
    try {
      const parsed = JSON.parse(rawText);
      console.log("📥 Response data (parsed):", parsed);
      console.log("📥 Response success:", parsed?.success);
      console.log("📥 Response message:", parsed?.message);
      return parsed as T;
    } catch {
      // Not JSON — return raw text to caller (caller may handle text). This is more robust than
      // silently returning an empty object when servers mis-label JSON responses.
      console.warn("⚠️ Response was not JSON, returning raw text");
      return rawText as unknown as T;
    }
  } catch (error: unknown) {
    console.error(`❌ API request failed for ${endpoint}:`, error);

    // For critical endpoints, re-throw the error
    if (
      endpoint.includes("/Users") ||
      endpoint.includes("/Buses") ||
      endpoint.includes("/Routes") ||
      endpoint.includes("/Trips") ||
      endpoint.includes("/TripRoutes") ||
      endpoint.includes("/Trip")
    ) {
      throw error;
    }

    // For non-critical endpoints, return empty data
    console.log("🔄 Returning empty data for failed non-critical endpoint");
    if (Array.isArray([] as T)) {
      return [] as T;
    }
    return null as T;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

// Authentication API calls
export const authAPI = {
  // Student registration
  registerStudent: (studentData: StudentRegistrationDTO) => {
    console.log("🔗 Using endpoint:", apiConfig.AUTH.REGISTRATION_STUDENT);
    console.log(
      "🔗 Full URL:",
      apiConfig.buildUrl(apiConfig.AUTH.REGISTRATION_STUDENT)
    );
    console.log("📤 Sending data:", studentData);
    return apiRequest<any>(apiConfig.AUTH.REGISTRATION_STUDENT, {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },

  // Staff registration (Admin, Driver, Movement Manager, Supervisor)
  registerStaff: (staffData: StaffRegistrationDTO) => {
    console.log("🔗 Using endpoint:", apiConfig.AUTH.REGISTRATION_STAFF);
    console.log(
      "🔗 Full URL:",
      apiConfig.buildUrl(apiConfig.AUTH.REGISTRATION_STAFF)
    );
    console.log("📤 Sending data:", staffData);
    return apiRequest<any>(apiConfig.AUTH.REGISTRATION_STAFF, {
      method: "POST",
      body: JSON.stringify(staffData),
    });
  },

  // User login
  login: (credentials: LoginDTO) => {
    console.log("🔗 Using endpoint:", apiConfig.AUTH.LOGIN);
    console.log("🔗 Full URL:", apiConfig.buildUrl(apiConfig.AUTH.LOGIN));
    return apiRequest<any>(apiConfig.AUTH.LOGIN, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  // Email verification
  verifyEmail: (verificationData: VerificationDTO) => {
    console.log("🔗 Using endpoint:", apiConfig.AUTH.VERIFICATION);
    return apiRequest<any>(apiConfig.AUTH.VERIFICATION, {
      method: "POST",
      body: JSON.stringify({
        email: verificationData.email,
        verificationCode: verificationData.code,
      }),
    });
  },

  // Forgot password
  forgotPassword: (emailData: ForgotPasswordDTO) => {
    console.log("🔗 Using endpoint:", apiConfig.AUTH.FORGOT_PASSWORD);
    console.log(
      "🔗 Full URL:",
      apiConfig.buildUrl(apiConfig.AUTH.FORGOT_PASSWORD)
    );
    return apiRequest<any>(apiConfig.AUTH.FORGOT_PASSWORD, {
      method: "POST",
      body: JSON.stringify(emailData),
    });
  },

  // Reset password
  resetPassword: (resetData: ResetPasswordDTO) => {
    console.log("🔗 Using endpoint:", apiConfig.AUTH.RESET_PASSWORD);
    console.log(
      "🔗 Full URL:",
      apiConfig.buildUrl(apiConfig.AUTH.RESET_PASSWORD)
    );
    return apiRequest<any>(apiConfig.AUTH.RESET_PASSWORD, {
      method: "POST",
      body: JSON.stringify(resetData),
    });
  },

  // Verify reset token
  verifyResetToken: (verificationData: {
    email: string;
    resetToken: string;
  }) => {
    console.log(
      "🔗 Using endpoint for reset verification:",
      apiConfig.AUTH.RESET_PASSWORD_VERIFICATION
    );
    console.log(
      "🔗 Full URL:",
      apiConfig.buildUrl(apiConfig.AUTH.RESET_PASSWORD_VERIFICATION)
    );
    console.log("📤 Sending reset verification data:", verificationData);
    return apiRequest<any>(apiConfig.AUTH.RESET_PASSWORD_VERIFICATION, {
      method: "POST",
      body: JSON.stringify({
        email: verificationData.email,
        resetToken: verificationData.resetToken,
        action: "verify", // Add action to distinguish from forgot password
      }),
    });
  },
};

// User-related API calls - use global endpoints
const mapGlobalStatus = (status: string | undefined) => {
  if (!status) return "active";
  const s = status.toLowerCase();
  if (s === "inactive") return "inactive";
  if (s === "suspended") return "suspended";
  return "active";
};

const mapGlobalRole = (role: string | undefined) => {
  if (!role) return "student";
  const r = role.toLowerCase();
  // Backend uses MovementManager, Conductor; app uses 'movement-manager' and may not use 'conductor'
  if (r === "movementmanager" || r === "movement manager")
    return "movement-manager";
  return r;
};

const mapGlobalUserToApp = (u: any) => {
  if (!u) return null;
  const first = u.firstName || "";
  const last = u.lastName || "";
  const fullName = `${first} ${last}`.trim();
  return {
    id: String(u.id ?? u.userId ?? ""),
    profileId: String(u.profileId ?? ""),
    name: fullName || u.name || u.email || "Unknown",
    fullName: fullName || undefined,
    email: u.email || "",
    role: mapGlobalRole(u.role),
    phone: u.phoneNumber || u.phone || "",
    nationalId: u.nationalId || "",
    status: mapGlobalStatus(u.status),
    avatar: u.profilePictureUrl || u.avatar || undefined,
    createdAt: u.createdAt || new Date().toISOString(),
    updatedAt: u.updatedAt || new Date().toISOString(),
  };
};

export const userAPI = {
  // Get all users (unwraps { data })
  getAll: async () => {
    const resp = await apiRequest<any>("/Users");
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list.map(mapGlobalUserToApp) : [];
  },

  // Get users by role
  getByRole: async (role: string) => {
    const resp = await apiRequest<any>(
      `/Users/by-role/${encodeURIComponent(role)}`
    );
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list.map(mapGlobalUserToApp) : [];
  },

  // Get user by ID
  getById: async (id: string) => {
    const resp = await apiRequest<any>(`/Users/${id}`);
    const item = resp?.data ?? resp ?? null;
    return item ? mapGlobalUserToApp(item) : null;
  },

  // Get user by email (fallback to filtering all if endpoint unsupported)
  getByEmail: async (email: string) => {
    try {
      const resp = await apiRequest<any>(
        `/Users?email=${encodeURIComponent(email)}`
      );
      const list = resp?.data ?? resp ?? [];
      return Array.isArray(list) ? list.map(mapGlobalUserToApp) : [];
    } catch {
      const all = await userAPI.getAll();
      return (all || []).filter(
        (u: any) => (u.email || "").toLowerCase() === email.toLowerCase()
      );
    }
  },

  // Change password
  changePassword: (payload: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  }) =>
    apiRequest<any>("/Users/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Get profile
  getProfile: async () => {
    const resp = await apiRequest<any>("/Users/profile");
    const item = resp?.data ?? resp ?? null;
    return item ? mapGlobalUserToApp(item) : null;
  },

  // Get current user profile (raw data from /Users/profile endpoint)
  getCurrentUserProfile: async () => {
    const resp = await apiRequest<any>("/Users/profile");
    return resp?.data ?? resp ?? null;
  },

  // Delete user
  delete: (id: string) =>
    apiRequest<any>(`/Users/${id}`, {
      method: "DELETE",
    }),

  // Update user (partial)
  update: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/Users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // Update user profile (for all roles)
  updateProfile: (payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }) =>
    apiRequest<unknown>("/Users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Update driver profile (includes licenseNumber)
  updateDriverProfile: (payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    licenseNumber?: string;
  }) =>
    apiRequest<unknown>("/Users/driver-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Update movement manager profile
  updateMovementManagerProfile: (payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }) =>
    apiRequest<unknown>("/Users/movement-manager-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Update admin profile
  updateAdminProfile: (payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }) =>
    apiRequest<unknown>("/Users/admin-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Update student profile using the correct endpoint
  updateStudentProfile: (payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    department?: string;
    yearOfStudy?: number;
    emergencyContact?: string;
    emergencyPhone?: string;
  }) =>
    apiRequest<unknown>("/Users/student-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Update profile picture
  updateProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Get authentication headers manually since we need to bypass the default Content-Type
    const authHeaders: Record<string, string> = {};
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.token || parsed?.accessToken;
          if (token) {
            authHeaders["Authorization"] = `Bearer ${token}`;
            console.log("🔐 Using token for profile picture upload:", token.substring(0, 20) + "...");
          }
        }
      }
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }
    
    const baseURL = apiConfig.BASE_URL;
    const url = `${baseURL}/Users/update-profile-picture`;
    
    console.log("🌐 Uploading profile picture to:", url);
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
        ...authHeaders,
      },
      body: formData,
    });

    console.log("📥 Profile picture upload response:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Profile picture upload failed:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.text();
    console.log("📥 Profile picture upload result:", result);
    
    // Try to parse as JSON, fallback to text
    try {
      return JSON.parse(result);
    } catch (e) {
      return result;
    }
  },
};

// Bus-related API calls - use global endpoints
export const busAPI = {
  // Get all buses with filters & pagination (GET with JSON body as per API)
  getAll: (params?: Partial<BusListParams>) => {
    const defaultParams: BusListParams = {
      page: 0,
      pageSize: 1000, // Default to get all buses
      busNumber: "",
      status: "",
      minSpeed: 0,
      maxSpeed: 0,
      minCapacity: 0,
      maxCapacity: 0,
    };
    const body = {
      ...defaultParams,
      ...(params || {}),
      _ts: Date.now(),
    };
    return apiRequest<BusApiResponse<Bus[]>>("/Buses", {
      method: "GET",
      body: JSON.stringify(body),
    });
  },

  // Get bus by ID
  getById: (id: number) => apiRequest<BusApiResponse<Bus>>(`/Buses/${id}`),

  // Create new bus
  create: (busData: BusRequest) =>
    apiRequest<BusApiResponse<Bus>>("/Buses", {
      method: "POST",
      body: JSON.stringify(busData),
    }),

  // Update bus
  update: (id: number, busData: BusRequest) =>
    apiRequest<BusApiResponse<Bus>>(`/Buses/${id}`, {
      method: "PUT",
      body: JSON.stringify(busData),
    }),

  // Delete bus
  delete: (id: number) =>
    apiRequest<BusApiResponse<null>>(`/Buses/${id}`, {
      method: "DELETE",
    }),
};

// Trip-related API calls - use global endpoints
/* Legacy Trip API removed – new Trip module will use dedicated tripService per backend spec */
export const tripAPI = {
  // Get all trips
  getAll: async (): Promise<TripViewModel[]> => {
    const resp = await apiRequest<TripViewModel[] | { data: TripViewModel[] }>(
      "/Trip"
    );
    const list =
      (resp as { data: TripViewModel[] })?.data ??
      (resp as TripViewModel[]) ??
      [];
    return Array.isArray(list) ? list : [];
  },

  // Get trip by ID
  getById: async (id: string | number): Promise<TripViewModel | null> => {
    const resp = await apiRequest<TripViewModel | { data: TripViewModel }>(
      `/Trip/${id}`
    );
    const item =
      (resp as { data: TripViewModel })?.data ??
      (resp as TripViewModel) ??
      null;
    return item ?? null;
  },

  // Get trip view model by ID (includes booking info)
  getViewModelById: async (
    id: string | number
  ): Promise<TripViewModel | null> => {
    const resp = await apiRequest<TripViewModel | { data: TripViewModel }>(
      `/Trip/${id}`
    );
    const item =
      (resp as { data: TripViewModel })?.data ??
      (resp as TripViewModel) ??
      null;
    return item ?? null;
  },

  // Get all trips as view models (includes booking info)
  getAllViewModels: async (): Promise<TripViewModel[]> => {
    const resp = await apiRequest<TripViewModel[] | { data: TripViewModel[] }>(
      "/Trip"
    );
    const list =
      (resp as { data: TripViewModel[] })?.data ??
      (resp as TripViewModel[]) ??
      [];
    return Array.isArray(list) ? list : [];
  },

  // Get trips by date (YYYY-MM-DD format)
  getByDate: async (date: string): Promise<Trip[]> => {
    const resp = await apiRequest<Trip[] | { data: Trip[] }>(
      `/Trip/by-date/${encodeURIComponent(date)}`
    );
    const list = (resp as { data: Trip[] })?.data ?? (resp as Trip[]) ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Get trips by driver ID
  getByDriver: async (driverId: string | number): Promise<Trip[]> => {
    const resp = await apiRequest<Trip[] | { data: Trip[] }>(
      `/Trip/by-driver/${driverId}`
    );
    const list = (resp as { data: Trip[] })?.data ?? (resp as Trip[]) ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Get trips by bus ID
  getByBus: async (busId: string | number): Promise<Trip[]> => {
    const resp = await apiRequest<Trip[] | { data: Trip[] }>(
      `/Trip/by-bus/${busId}`
    );
    const list = (resp as { data: Trip[] })?.data ?? (resp as Trip[]) ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Create new trip using CreateTripDTO (camelCase as per spec)
  create: (tripData: CreateTripDTO): Promise<Trip> => {
    const payload: CreateTripDTO = {
      busId: Number(tripData.busId),
      driverId: Number(tripData.driverId),
      conductorId: Number(tripData.conductorId),
      startLocation: (tripData.startLocation || "").trim(),
      endLocation: (tripData.endLocation || "").trim(),
      tripDate: tripData.tripDate,
      departureTimeOnly: tripData.departureTimeOnly,
      arrivalTimeOnly: tripData.arrivalTimeOnly,
      stopLocations: Array.isArray(tripData.stopLocations)
        ? tripData.stopLocations.map((s) => ({
            address: (s.address || "").trim(),
            arrivalTimeOnly: s.arrivalTimeOnly,
            departureTimeOnly: s.departureTimeOnly,
          }))
        : [],
    };

    return apiRequest<Trip>("/Trip", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Update existing trip using CreateTripDTO shape (backend expects same DTO)
  update: (id: string | number, tripData: CreateTripDTO): Promise<Trip> => {
    const payload: CreateTripDTO = {
      busId: Number(tripData.busId),
      driverId: Number(tripData.driverId),
      conductorId: Number(tripData.conductorId),
      startLocation: (tripData.startLocation || "").trim(),
      endLocation: (tripData.endLocation || "").trim(),
      tripDate: tripData.tripDate,
      departureTimeOnly: tripData.departureTimeOnly,
      arrivalTimeOnly: tripData.arrivalTimeOnly,
      stopLocations: Array.isArray(tripData.stopLocations)
        ? tripData.stopLocations.map((s) => ({
            address: (s.address || "").trim(),
            arrivalTimeOnly: s.arrivalTimeOnly,
            departureTimeOnly: s.departureTimeOnly,
          }))
        : [],
    };

    return apiRequest<Trip>(`/Trip/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Delete trip
  delete: (id: string | number): Promise<{ success: boolean }> =>
    apiRequest<{ success: boolean }>(`/Trip/${id}`, {
      method: "DELETE",
    }),

  // Get my trips (student's booked trips)
  getMyTrips: async (): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>("/Trip/my-trips");
    return resp?.data ?? [];
  },

  // Get driver's assigned trips
  getDriverTrips: async (): Promise<TripViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>("/Trip/my-trips");
    return (resp?.data ?? []) as unknown as TripViewModel[];
  },

  // Create booking
  createBooking: async (bookingData: CreateTripBookingDTO): Promise<BooleanApiResponse> => {
    console.log('🔍 tripAPI.createBooking called with:', bookingData);
    try {
      const result = await apiRequest<BooleanApiResponse>("/TripBooking", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });
      console.log('✅ tripAPI.createBooking result:', result);
      return result;
    } catch (error) {
      console.error('❌ tripAPI.createBooking error:', error);
      throw error;
    }
  },

  // Get booking by ID
  getBookingById: async (id: string | number): Promise<TripBookingViewModel | null> => {
    const resp = await apiRequest<TripBookingViewModelApiResponse>(`/TripBooking/${id}`);
    return resp?.data ?? null;
  },

  // Get bookings by trip
  getBookingsByTrip: async (tripId: string | number): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/by-trip/${tripId}`);
    return resp?.data ?? [];
  },

  // Get bookings by student
  getBookingsByStudent: async (studentId: string | number): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/by-student/${studentId}`);
    return resp?.data ?? [];
  },

  // Get bookings by date
  getBookingsByDate: async (date: string): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/by-date/${date}`);
    return resp?.data ?? [];
  },

  // Search bookings
  searchBookings: async (searchParams: TripBookingSearchDTO): Promise<TripBookingViewModel[]> => {
    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/search?${queryParams.toString()}`, {
      method: "POST",
    });
    return resp?.data ?? [];
  },

  // Update pickup location
  updatePickupLocation: async (id: string | number, pickupData: ChangePickupTripBookingDTO): Promise<BooleanApiResponse> => {
    return apiRequest<BooleanApiResponse>(`/TripBooking/update-trip-pickup/${id}`, {
      method: "PUT",
      body: JSON.stringify(pickupData),
    });
  },

  // Cancel booking
  cancelBooking: async (bookId: string | number): Promise<BooleanApiResponse> => {
    return apiRequest<BooleanApiResponse>(`/TripBooking/${bookId}/cancel`, {
      method: "PATCH",
    });
  },

  // Delete booking
  deleteBooking: async (id: string | number): Promise<BooleanApiResponse> => {
    return apiRequest<BooleanApiResponse>(`/TripBooking/${id}`, {
      method: "DELETE",
    });
  },

  // Check eligibility
  checkEligibility: async (tripId: string | number, studentId: string | number): Promise<boolean> => {
    const resp = await apiRequest<BooleanApiResponse>(`/TripBooking/check-eligibility?tripId=${tripId}&studentId=${studentId}`);
    return resp?.data ?? false;
  },
};

// Payment-related API calls - use global endpoints
// Payment API - use global endpoints
export const paymentAPI = {
  // GET /api/Payment
  getAll: async (): Promise<PaymentViewModel[]> => {
    const resp = await apiRequest<PaymentViewModelIEnumerableApiResponse>("/Payment");
    return resp?.data ?? [];
  },
  // GET /api/Payment/{id}
  getById: async (id: number | string): Promise<PaymentViewModel | null> => {
    const resp = await apiRequest<PaymentViewModelApiResponse>(`/Payment/${id}`);
    return resp?.data ?? null;
  },
  // POST /api/Payment with CreatePaymentDTO
  create: (paymentData: CreatePaymentDTO): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>("/Payment", {
      method: "POST",
      body: JSON.stringify(paymentData),
    }),
  // DELETE /api/Payment/{id}
  delete: (id: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/Payment/${id}`, {
      method: "DELETE",
    }),
  // PUT /api/Payment/{id}/review with ReviewPaymentDTO
  review: (
    id: number | string,
    reviewData: ReviewPaymentDTO
  ): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/Payment/${id}/review`, {
      method: "PUT",
      body: JSON.stringify(reviewData),
    }),
  // GET /api/Payment/my-payments
  getMyPayments: async (): Promise<PaymentViewModel[]> => {
    const resp = await apiRequest<PaymentViewModelIEnumerableApiResponse>("/Payment/my-payments");
    return resp?.data ?? [];
  },
  // GET /api/Payment/by-status/{status}
  getByStatus: async (status: PaymentStatus): Promise<PaymentViewModel[]> => {
    const resp = await apiRequest<PaymentViewModelIEnumerableApiResponse>(`/Payment/by-status/${status}`);
    return resp?.data ?? [];
  },
  // GET /api/Payment/pending
  getPending: async (): Promise<PaymentViewModel[]> => {
    const resp = await apiRequest<PaymentViewModelIEnumerableApiResponse>("/Payment/pending");
    return resp?.data ?? [];
  },
  // GET /api/Payment/by-student/{studentId}
  getByStudent: async (studentId: number | string): Promise<PaymentViewModel[]> => {
    const resp = await apiRequest<PaymentViewModelIEnumerableApiResponse>(`/Payment/by-student/${studentId}`);
    return resp?.data ?? [];
  },
  // GET /api/Payment/by-subscription-plan/{subscriptionPlanId}
  getBySubscriptionPlan: async (subscriptionPlanId: number | string): Promise<PaymentViewModel[]> => {
    const resp = await apiRequest<PaymentViewModelIEnumerableApiResponse>(`/Payment/by-subscription-plan/${subscriptionPlanId}`);
    return resp?.data ?? [];
  },
  // GET /api/Payment/statistics
  getStatistics: async (): Promise<PaymentStatisticsViewModel | null> => {
    const resp = await apiRequest<PaymentViewModelApiResponse>("/Payment/statistics");
    return (resp?.data ?? null) as unknown as PaymentStatisticsViewModel | null;
  },
};

// Notification-related API calls - use global endpoints
export const notificationAPI = {
  // GET /api/Notifications - Get all notifications for current user
  getAll: () => apiRequest<NotificationViewModelIEnumerableApiResponse>("/Notifications"),

  // GET /api/Notifications/unread - Get unread notifications for current user
  getUnread: () => apiRequest<NotificationViewModelIEnumerableApiResponse>("/Notifications/unread"),

  // GET /api/Notifications/unread-count - Get unread count for current user
  getUnreadCount: () => apiRequest<Int32ApiResponse>("/Notifications/unread-count"),

  // GET /api/Notifications/{id} - Get notification by ID
  getById: (id: number) => apiRequest<NotificationViewModelApiResponse>(`/Notifications/${id}`),

  // POST /api/Notifications - Create new notification
  create: (notificationData: CreateNotificationDTO) =>
    apiRequest<BooleanApiResponse>("/Notifications", {
      method: "POST",
      body: JSON.stringify(notificationData),
    }),

  // DELETE /api/Notifications/{id} - Delete notification
  delete: (id: number) =>
    apiRequest<BooleanApiResponse>(`/Notifications/${id}`, {
      method: "DELETE",
    }),

  // POST /api/Notifications/broadcast - Broadcast notification to multiple users
  broadcast: (broadcastData: BroadcastNotificationDTO) =>
    apiRequest<BooleanApiResponse>("/Notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(broadcastData),
    }),

  // PUT /api/Notifications/{id}/mark-read - Mark notification as read
  markAsRead: (id: number) =>
    apiRequest<BooleanApiResponse>(`/Notifications/${id}/mark-read`, {
      method: "PUT",
    }),

  // PUT /api/Notifications/mark-all-read - Mark all notifications as read
  markAllAsRead: () =>
    apiRequest<BooleanApiResponse>("/Notifications/mark-all-read", {
      method: "PUT",
    }),

  // DELETE /api/Notifications/clear-all - Clear all notifications
  clearAll: () =>
    apiRequest<BooleanApiResponse>("/Notifications/clear-all", {
      method: "DELETE",
    }),

  // Admin endpoints
  // GET /api/Notifications/admin/all - Get all notifications (admin only)
  adminGetAll: () => apiRequest<NotificationViewModelIEnumerableApiResponse>("/Notifications/admin/all"),

  // DELETE /api/Notifications/admin/{id} - Delete notification (admin only)
  adminDelete: (id: number) =>
    apiRequest<BooleanApiResponse>(`/Notifications/admin/${id}`, {
      method: "DELETE",
    }),
};

// Forms API - use global endpoints
export const formsAPI = {
  get: () => apiRequest<any>("/Forms"),
};

// Subscription plans API - use global endpoints
export const subscriptionPlansAPI = {
  // GET /api/SubscriptionPlan → returns SubscriptionPlanViewModelIEnumerableApiResponse
  getAll: async (): Promise<SubscriptionPlanViewModel[]> => {
    const resp = await apiRequest<SubscriptionPlanViewModelIEnumerableApiResponse>("/SubscriptionPlan");
    return resp?.data ?? [];
  },
  // GET /api/SubscriptionPlan/active
  getActive: async (): Promise<SubscriptionPlanViewModel[]> => {
    const resp = await apiRequest<SubscriptionPlanViewModelIEnumerableApiResponse>("/SubscriptionPlan/active");
    return resp?.data ?? [];
  },
  // GET /api/SubscriptionPlan/{id}
  getById: async (id: number | string): Promise<SubscriptionPlanViewModel | null> => {
    const resp = await apiRequest<SubscriptionPlanViewModelApiResponse>(`/SubscriptionPlan/${id}`);
    return resp?.data ?? null;
  },
  // POST /api/SubscriptionPlan with CreateSubscriptionPlanDTO
  create: (planData: CreateSubscriptionPlanDTO): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>("/SubscriptionPlan", {
      method: "POST",
      body: JSON.stringify(planData),
    }),
  // PUT /api/SubscriptionPlan/{id} with UpdateSubscriptionPlanDTO
  update: (
    id: number | string,
    planData: UpdateSubscriptionPlanDTO
  ): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/SubscriptionPlan/${id}`, {
      method: "PUT",
      body: JSON.stringify(planData),
    }),
  // DELETE /api/SubscriptionPlan/{id}
  delete: (id: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/SubscriptionPlan/${id}`, {
      method: "DELETE",
    }),
  // PUT /api/SubscriptionPlan/{id}/activate
  activate: (id: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/SubscriptionPlan/${id}/activate`, {
      method: "PUT",
    }),
  // PUT /api/SubscriptionPlan/{id}/deactivate
  deactivate: (id: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/SubscriptionPlan/${id}/deactivate`, {
      method: "PUT",
    }),
  // GET /api/SubscriptionPlan/by-price-range?minPrice=&maxPrice=
  getByPriceRange: async (minPrice?: number, maxPrice?: number): Promise<SubscriptionPlanViewModel[]> => {
    const params = new URLSearchParams();
    if (minPrice !== undefined) params.append("minPrice", String(minPrice));
    if (maxPrice !== undefined) params.append("maxPrice", String(maxPrice));
    const resp = await apiRequest<SubscriptionPlanViewModelIEnumerableApiResponse>(
      `/SubscriptionPlan/by-price-range?${params.toString()}`
    );
    return resp?.data ?? [];
  },
  // GET /api/SubscriptionPlan/by-duration?durationInDays=
  getByDuration: async (durationInDays?: number): Promise<SubscriptionPlanViewModel[]> => {
    const params = new URLSearchParams();
    if (durationInDays !== undefined)
      params.append("durationInDays", String(durationInDays));
    const resp = await apiRequest<SubscriptionPlanViewModelIEnumerableApiResponse>(
      `/SubscriptionPlan/by-duration?${params.toString()}`
    );
    return resp?.data ?? [];
  },
};

// TripBooking API - use global endpoints
export const tripBookingAPI = {
  // POST /api/TripBooking (create new booking)
  create: (bookingData: CreateTripBookingDTO): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>("/TripBooking", {
      method: "POST",
      body: JSON.stringify(bookingData),
    }),
  
  // GET /api/TripBooking/{id} (get booking by id)
  getById: async (id: number | string): Promise<TripBookingViewModel | null> => {
    const resp = await apiRequest<TripBookingViewModelApiResponse>(`/TripBooking/${id}`);
    return resp?.data ?? null;
  },
  
  // DELETE /api/TripBooking/{id} (delete booking)
  delete: (id: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/TripBooking/${id}`, {
      method: "DELETE",
    }),
  
  // PATCH /api/TripBooking/{bookId}/cancel (cancel booking)
  cancel: (bookId: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/TripBooking/${bookId}/cancel`, {
      method: "PATCH",
    }),
  
  // PUT /api/TripBooking/update-trip-pickup/{id} (update pickup location for a booking)
  updatePickupLocation: (
    id: number | string, 
    pickupData: ChangePickupTripBookingDTO
  ): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/TripBooking/update-trip-pickup/${id}`, {
      method: "PUT",
      body: JSON.stringify(pickupData),
    }),
  
  // POST /api/TripBooking/search (search/filter bookings)
  search: async (searchData: TripBookingSearchDTO): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>("/TripBooking/search", {
      method: "POST",
      body: JSON.stringify(searchData),
    });
    return resp?.data ?? [];
  },
  
  // GET /api/TripBooking/by-trip/{tripId}
  getByTrip: async (tripId: number | string): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/by-trip/${tripId}`);
    return resp?.data ?? [];
  },
  
  // GET /api/TripBooking/by-student/{studentId}
  getByStudent: async (studentId: number | string): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/by-student/${studentId}`);
    return resp?.data ?? [];
  },
  
  // GET /api/TripBooking/by-date/{date}
  getByDate: async (date: string): Promise<TripBookingViewModel[]> => {
    const resp = await apiRequest<TripBookingViewModelIEnumerableApiResponse>(`/TripBooking/by-date/${date}`);
    return resp?.data ?? [];
  },
  
  // GET /api/TripBooking/check-eligibility?tripId=&studentId=
  checkEligibility: async (tripId: number | string, studentId: number | string): Promise<boolean> => {
    const params = new URLSearchParams();
    params.append("tripId", String(tripId));
    params.append("studentId", String(studentId));
    const resp = await apiRequest<BooleanApiResponse>(`/TripBooking/check-eligibility?${params.toString()}`);
    return resp?.data ?? false;
  },

  // GET /api/TripBooking/has-booked/{tripId} - Check if user has booked a specific trip
  hasBooked: async (tripId: number | string): Promise<boolean> => {
    const resp = await apiRequest<BooleanApiResponse>(`/TripBooking/has-booked/${tripId}`);
    return resp?.data ?? false;
  },
};

// Legacy Booking API - kept for backward compatibility
export const bookingAPI = {
  getAll: () => apiRequest<unknown[]>("/Bookings"),
  getById: (id: string) => apiRequest<any>(`/Bookings/${id}`),
  getByStudent: (studentId: string) =>
    apiRequest<unknown[]>(`/Bookings?studentId=${studentId}`),
  getByTrip: (tripId: string) =>
    apiRequest<unknown[]>(`/Bookings?tripId=${tripId}`),
  create: (bookingData: Record<string, unknown>) =>
    apiRequest<unknown>("/Bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    }),
  update: (id: string, bookingData: Record<string, unknown>) =>
    apiRequest<unknown>(`/Bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(bookingData),
    }),
  delete: (id: string) =>
    apiRequest<any>(`/Bookings/${id}`, {
      method: "DELETE",
    }),
};

// Attendance API - use global endpoints
export const attendanceAPI = {
  getAll: () => apiRequest<unknown[]>("/Attendance"),
  getById: (id: string) => apiRequest<any>(`/Attendance/${id}`),
  getByTrip: (tripId: string) =>
    apiRequest<unknown[]>(`/Attendance?tripId=${tripId}`),
  getByStudent: (studentId: string) =>
    apiRequest<unknown[]>(`/Attendance?studentId=${studentId}`),
  create: (attendanceData: Record<string, unknown>) =>
    apiRequest<unknown>("/Attendance", {
      method: "POST",
      body: JSON.stringify(attendanceData),
    }),
  update: (id: string, attendanceData: Record<string, unknown>) =>
    apiRequest<unknown>(`/Attendance/${id}`, {
      method: "PATCH",
      body: JSON.stringify(attendanceData),
    }),
  delete: (id: string) =>
    apiRequest<any>(`/Attendance/${id}`, {
      method: "DELETE",
    }),
};

// Settings API - use global endpoints
export const settingsAPI = {
  // Return safe defaults locally to avoid 404s if backend Settings endpoints don't exist
  get: async (): Promise<any> => {
    return {
      systemName: "El Renad",
      logo: "/logo2.png",
      primaryColor: "#2563EB",
      secondaryColor: "#7C3AED",
    };
  },
  update: async (_settingsData: Record<string, unknown>): Promise<unknown> => {
    // No-op; assume success
    return { success: true } as unknown;
  },
  getMaintenanceMode: async (): Promise<any> => {
    return { maintenanceMode: false };
  },
};

// Student-specific API calls - use global endpoints
export const studentAPI = {
  // Get all students using GET /api/Users/students-data
  getAll: async () => {
    const resp = await apiRequest<any>("/Users/students-data");
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Get student by ID using GET /api/Users/students-data/{id}
  getById: async (id: string | number) => {
    const resp = await apiRequest<any>(`/Users/students-data/${id}`);
    const item = resp?.data ?? resp ?? null;
    return item ?? null;
  },

  // Get students by role using existing role endpoint
  getByRole: async () => {
    const resp = await apiRequest<any>("/Users/by-role/Student");
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },
};


// Student Dashboard API - use global endpoints
export const studentDashboardAPI = {
  getStats: (studentId: string) =>
    apiRequest<any>(`/StudentDashboard/${studentId}/stats`),
  getRecentTrips: (studentId: string) =>
    apiRequest<unknown[]>(`/StudentDashboard/${studentId}/recent-trips`),
  getUpcomingTrips: (studentId: string) =>
    apiRequest<unknown[]>(`/StudentDashboard/${studentId}/upcoming-trips`),
  getPaymentHistory: (studentId: string) =>
    apiRequest<unknown[]>(`/StudentDashboard/${studentId}/payments`),
};


export const routeAPI = {
  // Get all routes
  getAll: () => apiRequest<any[]>("/Routes"),

  // Get route by ID
  getById: (id: string | number) => apiRequest<any>(`/Routes/${id}`),

  // Create new route
  create: (routeData: Record<string, unknown>) =>
    apiRequest<any>("/Routes", {
      method: "POST",
      body: JSON.stringify(routeData),
    }),

  // Update route
  update: (id: string | number, routeData: Record<string, unknown>) =>
    apiRequest<any>(`/Routes/${id}`, {
      method: "PUT",
      body: JSON.stringify(routeData),
    }),

  // Delete route
  delete: (id: string | number) =>
    apiRequest<any>(`/Routes/${id}`, {
      method: "DELETE",
    }),
};

// Student Subscription API - use global endpoints
export const studentSubscriptionAPI = {
  // GET /api/StudentSubscription/my-active-subscription
  getMyActiveSubscription: async (): Promise<StudentSubscriptionViewModel | null> => {
    const resp = await apiRequest<StudentSubscriptionViewModelApiResponse>("/StudentSubscription/my-active-subscription");
    return resp?.data ?? null;
  },

  // GET /api/StudentSubscription/my-subscriptions
  getMySubscriptions: async (): Promise<StudentSubscriptionViewModel[]> => {
    const resp = await apiRequest<StudentSubscriptionViewModelIEnumerableApiResponse>("/StudentSubscription/my-subscriptions");
    return resp?.data ?? [];
  },

  // GET /api/StudentSubscription/{id}
  getById: async (id: number | string): Promise<StudentSubscriptionViewModel | null> => {
    const resp = await apiRequest<StudentSubscriptionViewModelApiResponse>(`/StudentSubscription/${id}`);
    return resp?.data ?? null;
  },

  // GET /api/StudentSubscription/by-student/{studentId}
  getByStudent: async (studentId: number | string): Promise<StudentSubscriptionViewModel[]> => {
    const resp = await apiRequest<StudentSubscriptionViewModelIEnumerableApiResponse>(`/StudentSubscription/by-student/${studentId}`);
    return resp?.data ?? [];
  },

  // GET /api/StudentSubscription/by-plan/{planId}
  getByPlan: async (planId: number | string): Promise<StudentSubscriptionViewModel[]> => {
    const resp = await apiRequest<StudentSubscriptionViewModelIEnumerableApiResponse>(`/StudentSubscription/by-plan/${planId}`);
    return resp?.data ?? [];
  },

  // GET /api/StudentSubscription/by-status/{status}
  getByStatus: async (status: SubscriptionStatus): Promise<StudentSubscriptionViewModel[]> => {
    const resp = await apiRequest<StudentSubscriptionViewModelIEnumerableApiResponse>(`/StudentSubscription/by-status/${status}`);
    return resp?.data ?? [];
  },

  // GET /api/StudentSubscription/expiring-soon
  getExpiringSoon: async (): Promise<StudentSubscriptionViewModel[]> => {
    const resp = await apiRequest<StudentSubscriptionViewModelIEnumerableApiResponse>("/StudentSubscription/expiring-soon");
    return resp?.data ?? [];
  },

  // GET /api/StudentSubscription/expired
  getExpired: async (): Promise<StudentSubscriptionViewModel[]> => {
    const resp = await apiRequest<StudentSubscriptionViewModelIEnumerableApiResponse>("/StudentSubscription/expired");
    return resp?.data ?? [];
  },

  // PUT /api/StudentSubscription/{id}/activate
  activate: (id: number | string): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/StudentSubscription/${id}/activate`, {
      method: "PUT",
    }),

  // PUT /api/StudentSubscription/{id}/suspend
  suspend: (id: number | string, suspendData: SuspendSubscriptionDTO): Promise<BooleanApiResponse> =>
    apiRequest<BooleanApiResponse>(`/StudentSubscription/${id}/suspend`, {
      method: "PUT",
      body: JSON.stringify(suspendData),
    }),
};

// ==================== Voting / Surveys ====================
export const votingAPI = {
  getAll: async (): Promise<any> => {
    const resp = await apiRequest<any>("/Voting");
    return resp;
  },
  getActive: async (): Promise<any> => {
    const resp = await apiRequest<any>("/Voting/active");
    return resp;
  },
  getById: async (id: string): Promise<any> => {
    const resp = await apiRequest<any>(`/Voting/${id}`);
    return resp;
  },
  getResults: async (id: string): Promise<any> => {
    const resp = await apiRequest<any>(`/Voting/${id}/results`);
    return resp;
  },
  getResultsByDate: async (id: string, dateKey: string): Promise<any> => {
    const resp = await apiRequest<any>(`/Voting/${id}/results/${dateKey}`);
    return resp;
  },
  hasVoted: async (id: string): Promise<any> => {
    const resp = await apiRequest<any>(`/Voting/${id}/has-voted`);
    return resp;
  },
  create: async (data: any): Promise<any> => {
    return apiRequest<any>("/Voting", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: string, data: any): Promise<any> => {
    return apiRequest<any>(`/Voting/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  toggleActive: async (id: string): Promise<any> => {
    return apiRequest<any>(`/Voting/${id}/toggle-active`, { method: "PUT" });
  },
  delete: async (id: string): Promise<any> => {
    return apiRequest<any>(`/Voting/${id}`, { method: "DELETE" });
  },
  submitVote: async (data: { surveyId: string; answers: Array<{ questionIndex: number; answer: string }> }): Promise<any> => {
    return apiRequest<any>("/Voting/submit", { method: "POST", body: JSON.stringify(data) });
  },
};
