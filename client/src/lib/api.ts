/**
 * API service functions for Mestermind
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  subcategory_count?: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  category_id: string;
  subcategory_id: string;
  name: string;
  description?: string;
  requires_license: boolean;
  is_specialty: boolean;
  indoor_outdoor: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface ServiceExplore {
  id: string;
  category_id: string;
  subcategory_id: string;
  category_name: string;
  subcategory_name: string;
  name: string;
  description?: string;
  requires_license: boolean;
  is_specialty: boolean;
  indoor_outdoor: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Search services by free-text query (name contains query)
 */
export async function searchServices(query: string): Promise<Service[]> {
  try {
    if (!query || !query.trim()) return [];
    const encoded = encodeURIComponent(query.trim());
    const response = await fetch(`${API_BASE_URL}/services/search/${encoded}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error searching services:", error);
    throw error;
  }
}

export interface QuestionSet {
  id: string;
  service_id: string;
  name: string;
  description?: string;
  version: number;
  status: "draft" | "published";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  questions?: Question[];
  question_count?: number;
}

export interface Question {
  id: string;
  question_set_id: string;
  key: string;
  label: string;
  description?: string;
  question_type:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi_select"
    | "date"
    | "file";
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  options?: Record<string, any>;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  conditional_rules?: Record<string, any>;
  allowed_file_types?: string[];
  max_file_size?: number;
  created_at: string;
  updated_at?: string;
}

export interface QuestionSetCreate {
  service_id: string;
  name: string;
  description?: string;
  status?: "draft" | "published";
  is_active?: boolean;
  sort_order?: number;
}

export interface QuestionSetUpdate {
  service_id?: string;
  name?: string;
  description?: string;
  status?: "draft" | "published";
  is_active?: boolean;
  sort_order?: number;
}

export interface QuestionCreate {
  question_set_id: string;
  key: string;
  label: string;
  description?: string;
  question_type:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi_select"
    | "date"
    | "file";
  is_required?: boolean;
  is_active?: boolean;
  sort_order?: number;
  options?: Record<string, any>;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  conditional_rules?: Record<string, any>;
  allowed_file_types?: string[];
  max_file_size?: number;
}

export interface QuestionUpdate {
  key?: string;
  label?: string;
  description?: string;
  question_type?:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi_select"
    | "date"
    | "file";
  is_required?: boolean;
  is_active?: boolean;
  sort_order?: number;
  options?: Record<string, any>;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  conditional_rules?: Record<string, any>;
  allowed_file_types?: string[];
  max_file_size?: number;
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

/**
 * Fetch all categories (active only)
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

/**
 * Fetch all categories for admin dashboard (active and inactive)
 */
export async function fetchAllCategoriesAdmin(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/admin/all`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching all categories for admin:", error);
    throw error;
  }
}

/**
 * Fetch a specific category with its subcategories (active only)
 */
export async function fetchCategoryWithSubcategories(
  categoryId: string,
): Promise<CategoryWithSubcategories> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Category ${categoryId} data:`, data);
    return data;
  } catch (error) {
    console.error("Error fetching category with subcategories:", error);
    throw error;
  }
}

/**
 * Fetch a specific category with all subcategories (active and inactive) for admin
 */
export async function fetchCategoryWithSubcategoriesAdmin(
  categoryId: string,
): Promise<CategoryWithSubcategories> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/categories/admin/${categoryId}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Category ${categoryId} admin data:`, data);
    return data;
  } catch (error) {
    console.error(
      "Error fetching category with subcategories for admin:",
      error,
    );
    throw error;
  }
}

/**
 * Fetch all categories with their subcategories (active only)
 */
export async function fetchAllCategoriesWithSubcategories(): Promise<
  CategoryWithSubcategories[]
> {
  try {
    const categories = await fetchCategories();
    const categoriesWithSubcategories = await Promise.all(
      categories.map((category) => fetchCategoryWithSubcategories(category.id)),
    );
    return categoriesWithSubcategories;
  } catch (error) {
    console.error("Error fetching all categories with subcategories:", error);
    throw error;
  }
}

/**
 * Fetch all categories with their subcategories for admin dashboard (active and inactive)
 */
export async function fetchAllCategoriesWithSubcategoriesAdmin(): Promise<
  CategoryWithSubcategories[]
> {
  try {
    const categories = await fetchAllCategoriesAdmin();
    const categoriesWithSubcategories = await Promise.all(
      categories.map((category) =>
        fetchCategoryWithSubcategoriesAdmin(category.id),
      ),
    );
    return categoriesWithSubcategories;
  } catch (error) {
    console.error(
      "Error fetching all categories with subcategories for admin:",
      error,
    );
    throw error;
  }
}

/**
 * Fetch services for a specific subcategory
 */
export async function fetchServicesBySubcategory(
  subcategoryId: string,
): Promise<Service[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/services/subcategory/${subcategoryId}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching services by subcategory:", error);
    throw error;
  }
}

/**
 * Fetch all services
 */
export async function fetchAllServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/services/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching all services:", error);
    throw error;
  }
}

/**
 * Fetch explore services with category and subcategory information
 */
export async function fetchExploreServices(params?: {
  skip?: number;
  limit?: number;
  category_id?: string;
  subcategory_id?: string;
  requires_license?: boolean;
  is_specialty?: boolean;
  indoor_outdoor?: string;
  is_active?: boolean;
  search?: string;
}): Promise<ServiceExplore[]> {
  try {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const url = `${API_BASE_URL}/services/explore${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching explore services:", error);
    throw error;
  }
}

// Question Set API Functions

/**
 * Fetch all question sets
 */
export async function fetchQuestionSets(params?: {
  skip?: number;
  limit?: number;
  service_id?: string;
  status?: "draft" | "published";
  is_active?: boolean;
  search?: string;
}): Promise<QuestionSet[]> {
  try {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const url = `${API_BASE_URL}/question-sets/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching question sets:", error);
    throw error;
  }
}

/**
 * Fetch a specific question set by ID
 */
export async function fetchQuestionSet(
  questionSetId: string,
): Promise<QuestionSet> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/question-sets/${questionSetId}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching question set:", error);
    throw error;
  }
}

/**
 * Create a new question set
 */
export async function createQuestionSet(
  questionSet: QuestionSetCreate,
): Promise<QuestionSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(questionSet),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating question set:", error);
    throw error;
  }
}

/**
 * Update a question set
 */
export async function updateQuestionSet(
  questionSetId: string,
  questionSet: QuestionSetUpdate,
): Promise<QuestionSet> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/question-sets/${questionSetId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(questionSet),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating question set:", error);
    throw error;
  }
}

/**
 * Delete a question set (soft delete)
 */
export async function deleteQuestionSet(questionSetId: string): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/question-sets/${questionSetId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error deleting question set:", error);
    throw error;
  }
}

/**
 * Publish a question set
 */
export async function publishQuestionSet(questionSetId: string): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/question-sets/${questionSetId}/publish`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error publishing question set:", error);
    throw error;
  }
}

/**
 * Unpublish a question set
 */
export async function unpublishQuestionSet(
  questionSetId: string,
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/question-sets/${questionSetId}/unpublish`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error unpublishing question set:", error);
    throw error;
  }
}

/**
 * Fetch question sets by service ID
 */
export async function fetchQuestionSetsByService(
  serviceId: string,
): Promise<QuestionSet[]> {
  try {
    console.log("Fetching question sets by service ID:", serviceId);
    const response = await fetch(
      `${API_BASE_URL}/question-sets/service/${serviceId}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching question sets by service:", error);
    throw error;
  }
}

// Question API Functions

/**
 * Fetch all questions
 */
export async function fetchQuestions(params?: {
  skip?: number;
  limit?: number;
  question_set_id?: string;
  question_type?:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi_select"
    | "date"
    | "file";
  is_required?: boolean;
  is_active?: boolean;
  search?: string;
}): Promise<Question[]> {
  try {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const url = `${API_BASE_URL}/questions/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching questions:", error);
    throw error;
  }
}

/**
 * Fetch a specific question by ID
 */
export async function fetchQuestion(questionId: string): Promise<Question> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching question:", error);
    throw error;
  }
}

/**
 * Create a new question
 */
export async function createQuestion(
  question: QuestionCreate,
): Promise<Question> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(question),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}

/**
 * Update a question
 */
export async function updateQuestion(
  questionId: string,
  question: QuestionUpdate,
): Promise<Question> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(question),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating question:", error);
    throw error;
  }
}

/**
 * Delete a question (soft delete)
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error deleting question:", error);
    throw error;
  }
}

/**
 * Fetch questions by question set ID
 */
export async function fetchQuestionsByQuestionSet(
  questionSetId: string,
): Promise<Question[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/questions/question-set/${questionSetId}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching questions by question set:", error);
    throw error;
  }
}

// Geo/Location API Functions

export interface LocationSearchResult {
  id: string;
  type: "city" | "district";
  name: string;
  county_name: string;
  city_name: string;
  district_code: string | null;
  score: number;
}

export interface GeoNormalizeRequest {
  place_id?: string;
  type?: "city" | "district";
  query?: string;
}

export interface GeoNormalizeResponse {
  place_id: string;
  type: "city" | "district";
  name: string;
  city_id: string;
  district_id: string | null;
  lat: number | null;
  lon: number | null;
}

// Pros search types
export interface Mester {
  id: string;
  full_name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  logo_url?: string | null;
  skills?: string[] | null;
  tags?: string[] | null;
  languages?: string[] | null;
  years_experience?: number | null;
  is_verified: boolean;
  is_active: boolean;
  home_city_id?: string | null;
  lat?: number | null;
  lon?: number | null;
  rating_avg?: number | null;
  review_count: number;
  created_at: string;
  updated_at?: string | null;
}

export interface MesterServiceLink {
  id: string;
  mester_id: string;
  service_id: string;
  price_hour_min?: number | null;
  price_hour_max?: number | null;
  pricing_notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface SearchProsItem {
  mester: Mester;
  services: MesterServiceLink[];
  distance_km?: number | null;
  score: number;
}

export interface SearchProsResponse {
  items: SearchProsItem[];
  next_cursor?: string | null;
}

export async function searchPros(params: {
  q?: string;
  service_id?: string;
  lat?: number;
  lon?: number;
  radius_km?: number;
  limit?: number;
  cursor?: string;
}): Promise<SearchProsResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.service_id) searchParams.set("service_id", params.service_id);
  if (params.lat !== undefined) searchParams.set("lat", String(params.lat));
  if (params.lon !== undefined) searchParams.set("lon", String(params.lon));
  if (params.radius_km !== undefined)
    searchParams.set("radius_km", String(params.radius_km));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));
  if (params.cursor) searchParams.set("cursor", params.cursor);
  const url = `${API_BASE_URL}/v1/search/pros?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

// -----------------------------
// Messaging API
// -----------------------------

export interface MessageThread {
  id: string;
  request_id: string;
  mester_id: string;
  customer_user_id?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Message {
  id: string;
  thread_id: string;
  body: string;
  sender_type: "customer" | "mester";
  sender_user_id?: string | null;
  sender_mester_id?: string | null;
  is_read_by_customer: boolean;
  is_read_by_mester: boolean;
  created_at: string;
}

export async function createOrGetThread(params: {
  request_id: string;
  mester_id: string;
  customer_user_id?: string;
}): Promise<MessageThread> {
  const res = await fetch(`${API_BASE_URL}/messages/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function listThreads(
  params: {
    request_id?: string;
    mester_id?: string;
    customer_user_id?: string;
    limit?: number;
    skip?: number;
    viewer_type?: "customer" | "mester";
  } = {},
): Promise<MessageThread[]> {
  const search = new URLSearchParams();
  if (params.request_id) search.set("request_id", params.request_id);
  if (params.mester_id) search.set("mester_id", params.mester_id);
  if (params.customer_user_id)
    search.set("customer_user_id", params.customer_user_id);
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.skip !== undefined) search.set("skip", String(params.skip));
  if (params.viewer_type) search.set("viewer_type", params.viewer_type);
  const res = await fetch(
    `${API_BASE_URL}/messages/threads${search.toString() ? `?${search.toString()}` : ""}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function getThread(threadId: string): Promise<MessageThread> {
  const res = await fetch(`${API_BASE_URL}/messages/threads/${threadId}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function listMessages(
  threadId: string,
  params: { limit?: number; skip?: number; viewer_type?: "customer" | "mester" } = {},
): Promise<Message[]> {
  const search = new URLSearchParams();
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.skip !== undefined) search.set("skip", String(params.skip));
  if (params.viewer_type) search.set("viewer_type", params.viewer_type);
  const res = await fetch(
    `${API_BASE_URL}/messages/threads/${threadId}/messages${search.toString() ? `?${search.toString()}` : ""}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function sendMessage(
  threadId: string,
  payload: {
    body: string;
    sender_type: "customer" | "mester";
    sender_user_id?: string;
    sender_mester_id?: string;
  },
): Promise<Message> {
  const res = await fetch(
    `${API_BASE_URL}/messages/threads/${threadId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    // Map 402 to a typed error the UI can react to
    if (res.status === 402) {
      let detail: string | undefined;
      try {
        const data = await res.json();
        detail = data?.detail;
      } catch {}
      const err = new Error(detail || "PAYMENT_REQUIRED");
      // @ts-expect-error augment error with code for UI checks
      err.code = "PAYMENT_REQUIRED";
      throw err;
    }
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return await res.json();
}

export async function markThreadRead(
  threadId: string,
  reader_type: "customer" | "mester",
): Promise<{ ok: boolean }> {
  const res = await fetch(
    `${API_BASE_URL}/messages/threads/${threadId}/read?reader_type=${reader_type}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export interface MesterDetailResponse {
  mester: Mester;
  services: MesterServiceLink[];
}

export async function fetchMesterById(
  id: string,
): Promise<MesterDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/mesters/${id}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

// -----------------------------
// Admin: Mesters Management
// -----------------------------

export interface ListMestersItem {
  id: string;
  full_name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  is_verified: boolean;
  rating_avg?: number | null;
  review_count: number;
}

export interface ListMestersResponse {
  items: ListMestersItem[];
  next_cursor?: string | null;
}

export async function listMesters(
  params: {
    q?: string;
    is_active?: boolean;
    is_verified?: boolean;
    limit?: number;
    cursor?: string;
  } = {},
): Promise<ListMestersResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.is_active !== undefined)
    search.set("is_active", String(params.is_active));
  if (params.is_verified !== undefined)
    search.set("is_verified", String(params.is_verified));
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.cursor) search.set("cursor", params.cursor);
  const res = await fetch(
    `${API_BASE_URL}/v1/mesters/${search.toString() ? `?${search.toString()}` : ""}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function addMesterService(
  mesterId: string,
  payload: {
    service_id: string;
    price_hour_min?: number | null;
    price_hour_max?: number | null;
    pricing_notes?: string | null;
    is_active?: boolean;
  },
): Promise<MesterServiceLink> {
  const res = await fetch(`${API_BASE_URL}/v1/mesters/${mesterId}/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mester_id: mesterId, ...payload }),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function updateMesterService(
  linkId: string,
  payload: Partial<{
    price_hour_min: number | null;
    price_hour_max: number | null;
    pricing_notes: string | null;
    is_active: boolean;
  }>,
): Promise<MesterServiceLink> {
  const res = await fetch(`${API_BASE_URL}/v1/mesters/services/${linkId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function deleteMesterService(
  linkId: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE_URL}/v1/mesters/services/${linkId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

/**
 * Fetch a specific service by ID
 */
export async function fetchServiceById(serviceId: string): Promise<Service> {
  try {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching service by ID:", error);
    throw error;
  }
}

export async function checkRequestExists(params: {
  service_id: string;
  question_set_id: string;
  place_id?: string;
}): Promise<{ exists: boolean; status?: "draft" | "submitted"; id?: string }> {
  const searchParams = new URLSearchParams({
    service_id: params.service_id,
    question_set_id: params.question_set_id,
  });
  if (params.place_id) searchParams.set("place_id", params.place_id);
  const res = await fetch(
    `${API_BASE_URL}/requests/exists?${searchParams.toString()}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

// -----------------------------
// Onboarding (server-side drafts)
// -----------------------------

export interface OnboardingDraft {
  id: string;
  email?: string | null;
  phone?: string | null;
  data?: Record<string, any> | null;
  current_step: number;
  is_submitted: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface OnboardingDraftCreate {
  email?: string;
  phone?: string;
  data?: Record<string, any>;
  current_step?: number;
}

export interface OnboardingDraftUpdate {
  email?: string;
  phone?: string;
  data?: Record<string, any>;
  current_step?: number;
  is_submitted?: boolean;
}

export async function createOnboardingDraft(
  payload: OnboardingDraftCreate = {},
): Promise<OnboardingDraft> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function getOnboardingDraft(id: string): Promise<OnboardingDraft> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function updateOnboardingDraft(
  id: string,
  payload: OnboardingDraftUpdate,
): Promise<OnboardingDraft> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function deleteOnboardingDraft(
  id: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function finalizeOnboardingDraft(id: string): Promise<Mester> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}/finalize`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

// Request API Types
export interface CustomerRequest {
  id: string;
  service_id: string;
  question_set_id: string;
  place_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  postal_code?: string | null;
  message_to_pro?: string | null;
  mester_id?: string | null;
  current_step: number;
  answers?: Record<string, any> | null;
  status:
    | "DRAFT"
    | "OPEN"
    | "QUOTED"
    | "SHORTLISTED"
    | "ACCEPTED"
    | "BOOKED"
    | "EXPIRED"
    | "CANCELLED";
  created_at: string;
  updated_at?: string | null;
}

export interface CustomerRequestCreate {
  service_id: string;
  question_set_id: string;
  place_id?: string;
  first_name?: string;
  last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  postal_code?: string;
  message_to_pro?: string;
  mester_id?: string;
  current_step?: number;
  answers?: Record<string, any>;
}

export interface CustomerRequestUpdate {
  current_step?: number;
  answers?: Record<string, any>;
  status?:
    | "DRAFT"
    | "OPEN"
    | "QUOTED"
    | "SHORTLISTED"
    | "ACCEPTED"
    | "BOOKED"
    | "EXPIRED"
    | "CANCELLED";
  first_name?: string;
  last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  postal_code?: string;
  message_to_pro?: string;
  mester_id?: string;
}

export async function createCustomerRequest(
  payload: CustomerRequestCreate,
): Promise<CustomerRequest> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication token if available
  if (typeof window !== "undefined") {
    const { auth } = await import("@/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}/requests/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function getCustomerRequest(id: string): Promise<CustomerRequest> {
  const response = await fetch(`${API_BASE_URL}/requests/${id}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function updateCustomerRequest(
  id: string,
  payload: CustomerRequestUpdate,
): Promise<CustomerRequest> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication token if available
  if (typeof window !== "undefined") {
    const { auth } = await import("@/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function deleteCustomerRequest(
  id: string,
): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function listCustomerRequests(
  params: {
    mester_id?: string;
    match_mester_services?: boolean;
    status?:
      | "DRAFT"
      | "OPEN"
      | "QUOTED"
      | "SHORTLISTED"
      | "ACCEPTED"
      | "BOOKED"
      | "EXPIRED"
      | "CANCELLED";
    limit?: number;
    skip?: number;
  } = {},
): Promise<CustomerRequest[]> {
  const searchParams = new URLSearchParams();
  if (params.mester_id) searchParams.set("mester_id", params.mester_id);
  if (params.match_mester_services)
    searchParams.set("match_mester_services", "true");
  if (params.status) searchParams.set("status", params.status);
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
  const res = await fetch(
    `${API_BASE_URL}/requests/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function getMyRequests(
  params: {
    status?:
      | "DRAFT"
      | "OPEN"
      | "QUOTED"
      | "SHORTLISTED"
      | "ACCEPTED"
      | "BOOKED"
      | "EXPIRED"
      | "CANCELLED";
    limit?: number;
    skip?: number;
  } = {},
): Promise<CustomerRequest[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication token if available
  if (typeof window !== "undefined") {
    const { auth } = await import("@/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));

  const response = await fetch(
    `${API_BASE_URL}/requests/my-requests${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    { headers },
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

// Admin Request Management Functions
export async function updateRequestStatus(
  requestId: string,
  status: CustomerRequest['status']
): Promise<CustomerRequest> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication token if available
  if (typeof window !== "undefined") {
    const { auth } = await import("@/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function deleteRequest(requestId: string): Promise<{
  ok: boolean;
  deleted_counts: {
    offers: number;
    message_threads: number;
    notifications: number;
  };
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication token if available
  if (typeof window !== "undefined") {
    const { auth } = await import("@/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function getRequestById(requestId: string): Promise<CustomerRequest> {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Search for locations (cities, districts, postal codes)
 */
export async function searchLocations(
  query: string,
  limit: number = 10,
): Promise<LocationSearchResult[]> {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/v1/geo/search?${searchParams.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error searching locations:", error);
    throw error;
  }
}

/**
 * Normalize a location to a canonical entity
 */
export async function normalizeLocation(
  payload: GeoNormalizeRequest,
): Promise<GeoNormalizeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/geo/normalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Swallow logging to avoid dev overlay noise; caller handles fallback
    throw error as Error;
  }
}

/**
 * Get coordinates for a postal code
 */
export async function getCoordinatesByPostalCode(postalCode: string): Promise<{
  postal_code: string;
  type: string;
  name: string;
  city_name: string;
  lat: number | null;
  lon: number | null;
  source: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/geo/coordinates/${postalCode}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting coordinates:", error);
    throw error;
  }
}

// -----------------------------
// Users
// -----------------------------

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  firebase_uid?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  firebase_uid?: string | null;
  created_at: string;
}

export async function createUserRecord(
  payload: CreateUserPayload,
): Promise<UserRecord | { ok: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // If endpoint not ready, don't block signup flow
      console.warn("User API not ready or failed, status:", res.status);
      return { ok: false } as any;
    }
    return await res.json();
  } catch (e) {
    console.warn("User API unreachable, continuing without server user record");
    return { ok: false } as any;
  }
}

export async function fetchIsProByEmail(
  email: string,
): Promise<{ is_pro: boolean }> {
  const res = await fetch(
    `${API_BASE_URL}/v1/users/pro-status?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export interface ProProfileLite {
  logo_url?: string | null;
  display_name?: string | null;
}

export type ProProfile = ProProfileLite;

export async function fetchProProfileByEmail(
  email: string,
): Promise<ProProfileLite | null> {
  const res = await fetch(
    `${API_BASE_URL}/v1/users/pro-status?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data &&
    typeof data === "object" &&
    ("logo_url" in data || "display_name" in data)
    ? (data as ProProfileLite)
    : null;
}

export interface ProStatus {
  is_pro: boolean;
  mester_id?: string | null;
  logo_url?: string | null;
  display_name?: string | null;
}

export async function fetchProStatus(email: string): Promise<ProStatus> {
  const res = await fetch(
    `${API_BASE_URL}/v1/users/pro-status?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authentication token
    if (typeof window !== "undefined") {
      const { auth } = await import("@/firebase");
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${API_BASE_URL}/v1/users/me`, { headers });
    if (!res.ok) {
      if (res.status === 401) return null;
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export interface BestMatch {
  id: string;
  full_name: string;
  slug: string;
  rating_avg?: number;
  review_count: number;
  years_experience?: number;
  is_verified: boolean;
  category: "frequently_hired" | "responds_quickly" | "highly_rated";
  is_top_pro: boolean;
}

export async function fetchBestMatches(
  serviceId?: string,
  limit: number = 3,
): Promise<BestMatch[]> {
  const params = new URLSearchParams();
  if (serviceId) params.append("service_id", serviceId);
  params.append("limit", limit.toString());

  const res = await fetch(`${API_BASE_URL}/v1/mesters/best-matches?${params}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

// =============================
// Offers API
// =============================

export interface Offer {
  id: string;
  request_id: string;
  mester_id: string;
  price: number;
  currency: string;
  message?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

export interface OfferCreate {
  request_id: string;
  price: number;
  currency?: string;
  message?: string;
}

export async function createOffer(
  payload: OfferCreate,
  mesterId: string,
): Promise<Offer> {
  const response = await fetch(
    `${API_BASE_URL}/offers/?mester_id=${mesterId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function getOffer(offerId: string): Promise<Offer> {
  const response = await fetch(`${API_BASE_URL}/offers/${offerId}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function listOffers(params?: {
  request_id?: string;
  mester_id?: string;
  status?: string;
}): Promise<Offer[]> {
  const searchParams = new URLSearchParams();
  if (params?.request_id) searchParams.set("request_id", params.request_id);
  if (params?.mester_id) searchParams.set("mester_id", params.mester_id);
  if (params?.status) searchParams.set("status", params.status);

  const response = await fetch(`${API_BASE_URL}/offers/?${searchParams}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function updateOffer(
  offerId: string,
  update: { status?: string; price?: number; message?: string },
): Promise<Offer> {
  const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function acceptOffer(offerId: string): Promise<Offer> {
  return updateOffer(offerId, { status: "ACCEPTED" });
}

export async function rejectOffer(offerId: string): Promise<Offer> {
  return updateOffer(offerId, { status: "REJECTED" });
}

// ==========================================
// Messaging API
// ==========================================

// Duplicate interfaces removed; see Messaging API types above

// Removed duplicate Messaging API function variants; using the object-based versions defined above

// ==========================================
// Notifications API
// ==========================================

export interface Notification {
  id: string;
  user_id?: string;
  mester_id?: string;
  type: string;
  title: string;
  body: string;
  request_id?: string;
  offer_id?: string;
  message_id?: string;
  action_url?: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}

export interface NotificationPreference {
  id: string;
  user_id?: string;
  mester_id?: string;
  preferences: Record<string, any>;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  token: string,
  params?: {
    is_read?: boolean;
    limit?: number;
    skip?: number;
  },
): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.is_read !== undefined)
    searchParams.set("is_read", String(params.is_read));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));

  const response = await fetch(
    `${API_BASE_URL}/notifications/?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  token: string,
): Promise<{ ok: boolean; id: string }> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(
  token: string,
): Promise<{ ok: boolean; updated_count: number }> {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  token: string,
): Promise<{ ok: boolean; id: string }> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(
  token: string,
): Promise<NotificationPreference> {
  const response = await fetch(`${API_BASE_URL}/notifications/preferences/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  token: string,
  preferences: {
    preferences: Record<string, any>;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  },
): Promise<NotificationPreference> {
  const response = await fetch(`${API_BASE_URL}/notifications/preferences/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

// Onboarding cleanup functions
export async function cleanupOnboardingByEmail(email: string): Promise<{ message: string; deleted_count: number }> {
  const response = await fetch(`${API_BASE_URL}/cleanup/onboarding/by-email/${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to cleanup onboarding drafts: ${response.statusText}`);
  }

  return response.json();
}

export async function cleanupAbandonedOnboarding(daysOld: number = 7): Promise<{ message: string; deleted_count: number }> {
  const response = await fetch(`${API_BASE_URL}/cleanup/onboarding/abandoned?days_old=${daysOld}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to cleanup abandoned onboarding drafts: ${response.statusText}`);
  }

  return response.json();
}

export async function getOnboardingStats(): Promise<{
  total_drafts: number;
  submitted_drafts: number;
  abandoned_drafts: number;
  abandoned_over_7_days: number;
  abandoned_over_30_days: number;
  submission_rate: number;
}> {
  const response = await fetch(`${API_BASE_URL}/cleanup/onboarding/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get onboarding stats: ${response.statusText}`);
  }

  return response.json();
}
