/**
 * API service functions for Mestermind
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    console.error('Error searching services:', error);
    throw error;
  }
}

export interface QuestionSet {
  id: string;
  service_id: string;
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'published';
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
  question_type: 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file';
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
  status?: 'draft' | 'published';
  is_active?: boolean;
  sort_order?: number;
}

export interface QuestionSetUpdate {
  service_id?: string;
  name?: string;
  description?: string;
  status?: 'draft' | 'published';
  is_active?: boolean;
  sort_order?: number;
}

export interface QuestionCreate {
  question_set_id: string;
  key: string;
  label: string;
  description?: string;
  question_type: 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file';
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
  question_type?: 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file';
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
    console.error('Error fetching categories:', error);
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
    console.error('Error fetching all categories for admin:', error);
    throw error;
  }
}

/**
 * Fetch a specific category with its subcategories (active only)
 */
export async function fetchCategoryWithSubcategories(categoryId: string): Promise<CategoryWithSubcategories> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Category ${categoryId} data:`, data);
    return data;
  } catch (error) {
    console.error('Error fetching category with subcategories:', error);
    throw error;
  }
}

/**
 * Fetch a specific category with all subcategories (active and inactive) for admin
 */
export async function fetchCategoryWithSubcategoriesAdmin(categoryId: string): Promise<CategoryWithSubcategories> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/admin/${categoryId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Category ${categoryId} admin data:`, data);
    return data;
  } catch (error) {
    console.error('Error fetching category with subcategories for admin:', error);
    throw error;
  }
}

/**
 * Fetch all categories with their subcategories (active only)
 */
export async function fetchAllCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
  try {
    const categories = await fetchCategories();
    const categoriesWithSubcategories = await Promise.all(
      categories.map(category => fetchCategoryWithSubcategories(category.id))
    );
    return categoriesWithSubcategories;
  } catch (error) {
    console.error('Error fetching all categories with subcategories:', error);
    throw error;
  }
}

/**
 * Fetch all categories with their subcategories for admin dashboard (active and inactive)
 */
export async function fetchAllCategoriesWithSubcategoriesAdmin(): Promise<CategoryWithSubcategories[]> {
  try {
    const categories = await fetchAllCategoriesAdmin();
    const categoriesWithSubcategories = await Promise.all(
      categories.map(category => fetchCategoryWithSubcategoriesAdmin(category.id))
    );
    return categoriesWithSubcategories;
  } catch (error) {
    console.error('Error fetching all categories with subcategories for admin:', error);
    throw error;
  }
}

/**
 * Fetch services for a specific subcategory
 */
export async function fetchServicesBySubcategory(subcategoryId: string): Promise<Service[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/services/subcategory/${subcategoryId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching services by subcategory:', error);
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
    console.error('Error fetching all services:', error);
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
    
    const url = `${API_BASE_URL}/services/explore${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching explore services:', error);
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
  status?: 'draft' | 'published';
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
    
    const url = `${API_BASE_URL}/question-sets/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching question sets:', error);
    throw error;
  }
}

/**
 * Fetch a specific question set by ID
 */
export async function fetchQuestionSet(questionSetId: string): Promise<QuestionSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/${questionSetId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching question set:', error);
    throw error;
  }
}

/**
 * Create a new question set
 */
export async function createQuestionSet(questionSet: QuestionSetCreate): Promise<QuestionSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionSet),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating question set:', error);
    throw error;
  }
}

/**
 * Update a question set
 */
export async function updateQuestionSet(questionSetId: string, questionSet: QuestionSetUpdate): Promise<QuestionSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/${questionSetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionSet),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating question set:', error);
    throw error;
  }
}

/**
 * Delete a question set (soft delete)
 */
export async function deleteQuestionSet(questionSetId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/${questionSetId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting question set:', error);
    throw error;
  }
}

/**
 * Publish a question set
 */
export async function publishQuestionSet(questionSetId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/${questionSetId}/publish`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error publishing question set:', error);
    throw error;
  }
}

/**
 * Unpublish a question set
 */
export async function unpublishQuestionSet(questionSetId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/${questionSetId}/unpublish`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error unpublishing question set:', error);
    throw error;
  }
}

/**
 * Fetch question sets by service ID
 */
export async function fetchQuestionSetsByService(serviceId: string): Promise<QuestionSet[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/question-sets/service/${serviceId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching question sets by service:', error);
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
  question_type?: 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file';
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
    
    const url = `${API_BASE_URL}/questions/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching questions:', error);
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
    console.error('Error fetching question:', error);
    throw error;
  }
}

/**
 * Create a new question
 */
export async function createQuestion(question: QuestionCreate): Promise<Question> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(question),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
}

/**
 * Update a question
 */
export async function updateQuestion(questionId: string, question: QuestionUpdate): Promise<Question> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(question),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
}

/**
 * Delete a question (soft delete)
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

/**
 * Fetch questions by question set ID
 */
export async function fetchQuestionsByQuestionSet(questionSetId: string): Promise<Question[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/question-set/${questionSetId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching questions by question set:', error);
    throw error;
  }
}

// Geo/Location API Functions

export interface LocationSearchResult {
  id: string;
  type: 'city' | 'district';
  name: string;
  county_name: string;
  city_name: string;
  district_code: string | null;
  score: number;
}

export interface GeoNormalizeRequest {
  place_id?: string;
  type?: 'city' | 'district';
  query?: string;
}

export interface GeoNormalizeResponse {
  place_id: string;
  type: 'city' | 'district';
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
  if (params.q) searchParams.set('q', params.q);
  if (params.service_id) searchParams.set('service_id', params.service_id);
  if (params.lat !== undefined) searchParams.set('lat', String(params.lat));
  if (params.lon !== undefined) searchParams.set('lon', String(params.lon));
  if (params.radius_km !== undefined) searchParams.set('radius_km', String(params.radius_km));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.cursor) searchParams.set('cursor', params.cursor);
  const url = `${API_BASE_URL}/v1/search/pros?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export interface MesterDetailResponse {
  mester: Mester;
  services: MesterServiceLink[];
}

export async function fetchMesterById(id: string): Promise<MesterDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/mesters/${id}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function checkRequestExists(params: {
  service_id: string;
  question_set_id: string;
  place_id?: string;
}): Promise<{ exists: boolean; status?: 'draft' | 'submitted'; id?: string }>
{
  const searchParams = new URLSearchParams({
    service_id: params.service_id,
    question_set_id: params.question_set_id,
  });
  if (params.place_id) searchParams.set('place_id', params.place_id);
  const res = await fetch(`${API_BASE_URL}/requests/exists?${searchParams.toString()}`);
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

export async function createOnboardingDraft(payload: OnboardingDraftCreate = {}): Promise<OnboardingDraft> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function updateOnboardingDraft(id: string, payload: OnboardingDraftUpdate): Promise<OnboardingDraft> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function deleteOnboardingDraft(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function finalizeOnboardingDraft(id: string): Promise<Mester> {
  const res = await fetch(`${API_BASE_URL}/onboarding/drafts/${id}/finalize`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

// Request API Types
export interface CustomerRequest {
  id: string;
  service_id: string;
  question_set_id: string;
  place_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  postal_code?: string | null;
  message_to_pro?: string | null;
  mester_id?: string | null;
  current_step: number;
  answers?: Record<string, any> | null;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at?: string | null;
}

export interface CustomerRequestCreate {
  service_id: string;
  question_set_id: string;
  place_id?: string;
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
  status?: 'draft' | 'submitted';
  contact_email?: string;
  contact_phone?: string;
  postal_code?: string;
  message_to_pro?: string;
  mester_id?: string;
}

export async function createCustomerRequest(payload: CustomerRequestCreate): Promise<CustomerRequest> {
  const response = await fetch(`${API_BASE_URL}/requests/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function updateCustomerRequest(id: string, payload: CustomerRequestUpdate): Promise<CustomerRequest> {
  const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function deleteCustomerRequest(id: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function listCustomerRequests(params: {
  mester_id?: string;
  match_mester_services?: boolean;
  status?: 'draft' | 'submitted';
  limit?: number;
  skip?: number;
} = {}): Promise<CustomerRequest[]> {
  const searchParams = new URLSearchParams();
  if (params.mester_id) searchParams.set('mester_id', params.mester_id);
  if (params.match_mester_services) searchParams.set('match_mester_services', 'true');
  if (params.status) searchParams.set('status', params.status);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
  const res = await fetch(`${API_BASE_URL}/requests/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

/**
 * Search for locations (cities, districts, postal codes)
 */
export async function searchLocations(query: string, limit: number = 10): Promise<LocationSearchResult[]> {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });
    
    const response = await fetch(`${API_BASE_URL}/v1/geo/search?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

/**
 * Normalize a location to a canonical entity
 */
export async function normalizeLocation(payload: GeoNormalizeRequest): Promise<GeoNormalizeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/geo/normalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

export async function createUserRecord(payload: CreateUserPayload): Promise<UserRecord | { ok: boolean }>
{
  try {
    const res = await fetch(`${API_BASE_URL}/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // If endpoint not ready, don't block signup flow
      console.warn('User API not ready or failed, status:', res.status);
      return { ok: false } as any;
    }
    return await res.json();
  } catch (e) {
    console.warn('User API unreachable, continuing without server user record');
    return { ok: false } as any;
  }
}

export async function fetchIsProByEmail(email: string): Promise<{ is_pro: boolean }> {
  const res = await fetch(`${API_BASE_URL}/v1/users/pro-status?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export interface ProProfileLite {
  logo_url?: string | null;
  display_name?: string | null;
}

export async function fetchProProfileByEmail(email: string): Promise<ProProfileLite | null> {
  const res = await fetch(`${API_BASE_URL}/v1/users/pro-status?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data && typeof data === 'object' && ('logo_url' in data || 'display_name' in data)) ? data as ProProfileLite : null;
}

export interface ProStatus {
  is_pro: boolean;
  mester_id?: string | null;
  logo_url?: string | null;
  display_name?: string | null;
}

export async function fetchProStatus(email: string): Promise<ProStatus> {
  const res = await fetch(`${API_BASE_URL}/v1/users/pro-status?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}
