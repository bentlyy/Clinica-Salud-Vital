import api from './axios';

export interface Booking {
  id: string;
  doctor_id: string;
  patient_id?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  patient_rut?: string;
  date: string;
  time: string;
  status: string;
  [key: string]: unknown;
}

export interface Slot {
  time: string;
  available: boolean;
  [key: string]: unknown;
}

import type { AxiosRequestConfig } from 'axios';

export const getAvailableSlots = async (doctorId: string | number, date: string, options: AxiosRequestConfig = {}): Promise<Slot[]> => {
  const res = await api.get(
    `/bookings/available-slots?doctor_id=${doctorId}&date=${date}`, options
  );
  return res.data;
};

export const createBooking = async (data: Record<string, unknown>, options: AxiosRequestConfig = {}): Promise<Booking> => {
  const res = await api.post('/bookings', data, options);
  return res.data;
};

export const getAllBookings = async (params: Record<string, unknown> = {}, options: AxiosRequestConfig = {}): Promise<Booking[]> => {
  const res = await api.get('/bookings/all', { ...options, params });
  return res.data;
};

export const getMyBookings = async (options: AxiosRequestConfig = {}): Promise<Booking[]> => {
  const res = await api.get('/bookings/me', options);
  return res.data;
};

export const deleteBooking = async (id: string, options: AxiosRequestConfig = {}): Promise<void> => {
  const res = await api.delete(`/bookings/${id}`, options);
  return res.data;
};

export const confirmBooking = async (token: string, options: AxiosRequestConfig = {}): Promise<Booking> => {
  const res = await api.post('/confirmation/confirm', { token }, options);
  return res.data;
};

export const getDailyDensity = async (start: string, end: string, options: AxiosRequestConfig = {}): Promise<unknown> => {
  const res = await api.get(`/bookings/doctor/daily-density?start=${start}&end=${end}`, options);
  return res.data;
};
