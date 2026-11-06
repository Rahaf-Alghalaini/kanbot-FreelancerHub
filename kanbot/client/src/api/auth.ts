import { request } from './client';
import type { AuthResponse, LoginRequest, MeResponse, RegisterRequest } from '../types/api';

export const authApi = {
  register: (body: RegisterRequest) => request<AuthResponse>('/auth/register', { method: 'POST', body, auth: false }),
  login: (body: LoginRequest) => request<AuthResponse>('/auth/login', { method: 'POST', body, auth: false }),
  me: () => request<MeResponse>('/auth/me'),
};
