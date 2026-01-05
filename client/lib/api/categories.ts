import { apiClient } from './client';

export interface Category {
  id: string;
  name: string;
  name_hu?: string;  // Hungarian name for search
  slug: string;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  name_hu?: string;  // Hungarian name for search
  slug: string;
}

export interface CategoryWithServices extends Category {
  services: Service[];
}

export const categoriesApi = {
  getAll: async (skip = 0, limit = 100, language = 'en'): Promise<Category[]> => {
    return apiClient.get<Category[]>(`/api/v1/categories?skip=${skip}&limit=${limit}&language=${language}`);
  },

  getAllWithServices: async (skip = 0, limit = 100, language = 'en'): Promise<CategoryWithServices[]> => {
    return apiClient.get<CategoryWithServices[]>(`/api/v1/categories/with-services?skip=${skip}&limit=${limit}&language=${language}`);
  },

  getById: async (id: string, language = 'en'): Promise<Category> => {
    return apiClient.get<Category>(`/api/v1/categories/${id}?language=${language}`);
  },

  getByIdWithServices: async (id: string, language = 'en'): Promise<CategoryWithServices> => {
    return apiClient.get<CategoryWithServices>(`/api/v1/categories/${id}/with-services?language=${language}`);
  },
};
