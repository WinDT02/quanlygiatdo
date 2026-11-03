/** Order statuses exactly as the backend defines them (OrderStatus enum). */
export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', badge: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'Đang xử lý', badge: 'bg-blue-100 text-blue-700' },
  WASHING: { label: 'Đang giặt', badge: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'Hoàn thành', badge: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-red-100 text-red-700' },
};

/** The normal life of an order, in order (CANCELLED is a side exit and is shown separately). */
export const ORDER_STEPS = ['PENDING', 'PROCESSING', 'WASHING', 'COMPLETED'];

export const PAYMENT_STATUS = {
  UNPAID: { label: 'Chưa thanh toán', badge: 'bg-gray-100 text-gray-600' },
  PAID: { label: 'Đã thanh toán', badge: 'bg-green-100 text-green-700' },
};

export const DELIVERY_LABELS = {
  PICKUP: 'Nhân viên đến lấy đồ',
  DROP_OFF: 'Tự mang đến tiệm',
};

/** Shown in the booking form as an estimate; the server (app.order.shipping-fee) has the final say. */
export const SHIPPING_FEE = Number(import.meta.env.VITE_SHIPPING_FEE ?? 15000);

/** VNPay vnp_ResponseCode -> message for the customer. */
export const VNPAY_MESSAGES = {
  '00': 'Giao dịch thành công',
  '07': 'Giao dịch bị nghi ngờ gian lận hoặc bất thường',
  '09': 'Thẻ/tài khoản chưa đăng ký dịch vụ Internet Banking',
  '10': 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần',
  '11': 'Đã hết thời gian chờ thanh toán',
  '12': 'Thẻ/tài khoản bị khóa',
  '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Bạn đã hủy giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản đã vượt hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Lỗi không xác định từ VNPay',
};
