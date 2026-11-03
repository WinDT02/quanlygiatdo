import axiosClient from './axiosClient';

/** Thin wrappers around the backend endpoints used by the customer pages. Each returns the JSON body. */

// ---- public catalogue ----
export const fetchServices = () => axiosClient.get('/services');
export const fetchPromotions = () => axiosClient.get('/promotions');
export const fetchServiceReviews = (serviceId, page = 0, size = 10) =>
  axiosClient.get(`/reviews/service/${serviceId}`, { params: { page, size } });

// ---- needs login ----
export const checkPromotion = (code, subtotal) => axiosClient.post('/promotions/check', { code, subtotal });

export const createOrder = (payload) => axiosClient.post('/orders', payload);
export const fetchMyOrders = () => axiosClient.get('/orders/my-orders');
export const fetchOrder = (id) => axiosClient.get(`/orders/${id}`);
export const cancelOrder = (id) => axiosClient.put(`/orders/${id}/cancel`);

export const createReview = (orderId, rating, comment) => axiosClient.post('/reviews', { orderId, rating, comment });

/** Returns { paymentUrl, txnRef, expiresAt }. */
export const createVnpayUrl = (orderId) => axiosClient.get('/payment/create-vnpay-url', { params: { orderId } });

/** Creates a VNPay payment attempt for the order and sends the browser to VNPay. Throws if the URL cannot be created. */
export async function redirectToVnpay(orderId) {
  const { paymentUrl } = await createVnpayUrl(orderId);
  window.location.href = paymentUrl;
}
