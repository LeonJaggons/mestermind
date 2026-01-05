import { apiClient } from './client';

export type UserRole = 'customer' | 'mester' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  firebase_uid?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateUserDto {
  email: string;
  role?: UserRole;
  firebase_uid?: string;
}

export interface UpdateUserDto {
  email?: string;
  role?: UserRole;
  firebase_uid?: string | null;
}

export interface CustomerProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  street_address?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateCustomerProfileDto {
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  street_address?: string;
}

export interface UpdateCustomerProfileDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  district?: string;
  street_address?: string;
}

export const usersApi = {
  create: async (data: CreateUserDto): Promise<User> => {
    return apiClient.post<User>('/api/v1/users/', data);
  },

  getAll: async (skip = 0, limit = 100): Promise<User[]> => {
    return apiClient.get<User[]>(`/api/v1/users/?skip=${skip}&limit=${limit}`);
  },

  getById: async (id: number): Promise<User> => {
    return apiClient.get<User>(`/api/v1/users/${id}`);
  },

  getByEmail: async (email: string): Promise<User> => {
    return apiClient.get<User>(`/api/v1/users/email/${encodeURIComponent(email)}`);
  },

  update: async (id: number, data: UpdateUserDto): Promise<User> => {
    return apiClient.put<User>(`/api/v1/users/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/api/v1/users/${id}`);
  },

  // Customer Profile endpoints
  profile: {
    create: async (userId: number, data: CreateCustomerProfileDto): Promise<CustomerProfile> => {
      return apiClient.post<CustomerProfile>(`/api/v1/users/${userId}/profile`, data);
    },

    get: async (userId: number): Promise<CustomerProfile> => {
      return apiClient.get<CustomerProfile>(`/api/v1/users/${userId}/profile`);
    },

    update: async (userId: number, data: UpdateCustomerProfileDto): Promise<CustomerProfile> => {
      return apiClient.put<CustomerProfile>(`/api/v1/users/${userId}/profile`, data);
    },

    delete: async (userId: number): Promise<void> => {
      return apiClient.delete<void>(`/api/v1/users/${userId}/profile`);
    },
  },
};
