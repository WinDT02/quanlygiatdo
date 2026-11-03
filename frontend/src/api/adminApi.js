import axiosClient from './axiosClient';

/** Endpoints used by the staff / admin pages. Each returns the JSON body (see axiosClient). */

// ---- dashboard (ADMIN) ----
/** `days` = length of the revenue series; the dashboard asks for 31 so one call covers today / 7 days / this month. */
export const fetchDashboardStats = (days = 31) => axiosClient.get('/admin/dashboard/stats', { params: { days } });

// ---- orders (ADMIN + EMPLOYEE) ----
/** Returns a PageResponse: { content, page, size, totalElements, totalPages, first, last }. Empty filters are not sent. */
export function searchOrders({ status, keyword, page = 0, size = 10 }) {
  const params = { page, size };
  if (status && status !== 'ALL') params.status = status;
  if (keyword?.trim()) params.keyword = keyword.trim();
  return axiosClient.get('/orders', { params });
}
/** `cashCollected = true` together with COMPLETED also marks a COD order as PAID (one request, one transaction). */
export const updateOrderStatus = (id, status, cashCollected) =>
  axiosClient.put(`/orders/${id}/status`, cashCollected === undefined ? { status } : { status, cashCollected });
/** Staff confirms the cash of a COD order was collected (UNPAID -> PAID). Returns the updated order. */
export const markOrderPaid = (id) => axiosClient.put(`/orders/${id}/mark-paid`);
export const assignOrderEmployee = (id, employeeId) => axiosClient.put(`/orders/${id}/assign`, { employeeId });

// ---- services (ADMIN) ----
export const fetchAllServices = () => axiosClient.get('/services', { params: { all: true } }); // includes INACTIVE
export const createService = (body) => axiosClient.post('/services', body);
export const updateService = (id, body) => axiosClient.put(`/services/${id}`, body);
/** Soft delete: the backend sets the service to INACTIVE (old orders keep pointing at it). */
export const deleteService = (id) => axiosClient.delete(`/services/${id}`);

// ---- employees (ADMIN) ----
export const fetchEmployees = (status) => axiosClient.get('/admin/employees', { params: status ? { status } : {} });
/** Returns { employee, temporaryPassword } - temporaryPassword is only set when the server generated it. */
export const createEmployee = (body) => axiosClient.post('/admin/employees', body);
/** `userId` is EmployeeResponse.userId (not the employee id). */
export const updateUserStatus = (userId, status) => axiosClient.put(`/admin/users/${userId}/status`, { status });

// ---- promotions (ADMIN) ----
export const fetchAllPromotions = () => axiosClient.get('/promotions', { params: { all: true } }); // includes expired / switched off
export const createPromotion = (body) => axiosClient.post('/promotions', body);
export const updatePromotion = (id, body) => axiosClient.put(`/promotions/${id}`, body);
/** Soft delete: the backend sets active=false (old orders keep referencing the promotion). */
export const deletePromotion = (id) => axiosClient.delete(`/promotions/${id}`);
