import { useState } from 'react';
import { createReview } from '../../api/laundryApi';
import { getErrorMessage } from '../../api/axiosClient';
import { Alert, useToast } from '../common/Toast';
import SubmitButton from '../auth/SubmitButton';
import StarRating from './StarRating';

/** POST /reviews. The backend accepts one review per COMPLETED order of the logged-in customer. */
export default function ReviewForm({ orderId, onSubmitted, onCancel }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (rating < 1) return setError('Vui lòng chọn số sao');
    if (!comment.trim()) return setError('Vui lòng nhập nội dung đánh giá');
    setSubmitting(true);
    try {
      await createReview(orderId, rating, comment.trim());
      toast.success('Cảm ơn bạn đã đánh giá!');
      onSubmitted();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm font-semibold text-gray-900">Đánh giá đơn hàng #{orderId}</p>
      {error && <Alert variant="error">{error}</Alert>}
      <StarRating value={rating} onChange={setRating} size="h-7 w-7" />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Chia sẻ trải nghiệm của bạn về chất lượng giặt, thời gian, thái độ phục vụ..."
        className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
      <div className="flex items-center gap-3">
        <div className="w-40">
          <SubmitButton loading={submitting}>Gửi đánh giá</SubmitButton>
        </div>
        <button type="button" onClick={onCancel} disabled={submitting} className="text-sm text-gray-500 hover:text-gray-800">
          Để sau
        </button>
      </div>
    </form>
  );
}
