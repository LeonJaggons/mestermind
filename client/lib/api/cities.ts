import { apiClient } from './client';

export interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
  country_code: string;
  region: string;
  population: number;
  timezone: string;
  is_capital: boolean;
  is_major_market: boolean;
  sort_order: number;
}

export const citiesApi = {
  getAll: async (skip = 0, limit = 100): Promise<City[]> => {
    return apiClient.get<City[]>(`/api/v1/cities?skip=${skip}&limit=${limit}`);
  },
};
