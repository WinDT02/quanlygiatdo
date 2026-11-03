import axiosClient from './axiosClient';

/** The logged-in user's own account (all roles). */
export const fetchProfile = () => axiosClient.get('/profile');
/** Body: { fullName, phone, address }. Returns the updated user (same shape as /auth/me). */
export const updateProfile = (body) => axiosClient.put('/profile', body);
/** Body: { currentPassword, newPassword, confirmPassword }. Returns { message }. */
export const changePassword = (body) => axiosClient.put('/profile/password', body);
