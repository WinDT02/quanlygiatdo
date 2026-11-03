import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Loader2, Percent, Quote, ShieldCheck, Shirt, Sparkles, Truck, ArrowRight, CalendarCheck, PackageCheck, WashingMachine } from 'lucide-react';
import { fetchPromotions, fetchServiceReviews, fetchServices } from '../api/laundryApi';
import { getErrorMessage } from '../api/axiosClient';
import { formatDateTime, formatVND } from '../utils/format';
import { Alert } from '../components/common/Toast';
import StarRating from '../components/orders/StarRating';

const STEPS = [
  { icon: CalendarCheck, title: 'Đặt lịch', text: 'Chọn dịch vụ và giờ hẹn ngay trên website.' },
  { icon: Truck, title: 'Lấy đồ tận nơi', text: 'Nhân viên đến lấy đồ, hoặc bạn tự mang đến tiệm.' },
  { icon: WashingMachine, title: 'Giặt sấy chuyên nghiệp', text: 'Phân loại, giặt sấy, ủi theo đúng chất liệu vải.' },
  { icon: PackageCheck, title: 'Nhận đồ sạch', text: 'Theo dõi tiến độ và nhận đồ đã gấp gọn.' },
];

const PROMISES = [
  { icon: Sparkles, title: 'Sạch & thơm', text: 'Dùng hóa chất an toàn cho da, kiểm tra từng món trước khi trả.' },
  { icon: Clock, title: 'Đúng hẹn', text: 'Có gói giặt nhanh trong ngày cho khách cần gấp.' },
  { icon: ShieldCheck, title: 'Minh bạch', text: 'Giá niêm yết rõ ràng, thanh toán tiền mặt hoặc VNPay.' },
  { icon: Percent, title: 'Ưu đãi thường xuyên', text: 'Nhiều mã khuyến mãi cho khách mới và khách thân thiết.' },
];

const REVIEW_SERVICE_LIMIT = 8; // reviews are per service in the API, so the home page samples the first services

export default function HomePage() {
  const [services, setServices] = useState([]);
  const [ratings, setRatings] = useState({}); // { [serviceId]: { average, total } }
  const [reviews, setReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchServices()
      .then(async (list) => {
        if (cancelled) return;
        setServices(list);
        setLoading(false);

        // reviews are a bonus: if they fail the price list still shows
        const results = await Promise.allSettled(list.slice(0, REVIEW_SERVICE_LIMIT).map((s) => fetchServiceReviews(s.id, 0, 6)));
        if (cancelled) return;
        const nextRatings = {};
        const seen = new Map(); // one review can belong to several services: keep it once
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          const data = result.value;
          nextRatings[list[index].id] = { average: data.averageRating, total: data.totalReviews };
          data.reviews.forEach((r) => seen.set(r.id, r));
        });
        setRatings(nextRatings);
        setReviews(
          [...seen.values()]
            .filter((r) => r.rating >= 4 && r.comment)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 6),
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setError(getErrorMessage(e));
          setLoading(false);
        }
      });

    fetchPromotions().then((p) => !cancelled && setPromotions(p)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <div>
      {/* hero */}
      <section className="bg-gradient-to-br from-blue-600 to-sky-500 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Giặt sấy sạch thơm, giao nhận tận nơi</h1>
            <p className="mt-4 max-w-lg text-lg text-blue-50">Đặt lịch trực tuyến trong một phút, theo dõi đơn hàng mọi lúc và thanh toán tiện lợi.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/booking" className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow hover:bg-blue-50">
                Đặt giặt ngay <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#bang-gia" className="rounded-lg border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">Xem bảng giá</a>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <span className="flex h-56 w-56 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/10">
              <Shirt className="h-28 w-28 text-white" />
            </span>
          </div>
        </div>
      </section>

      {/* promotions */}
      {promotions.length > 0 && (
        <section className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm sm:px-6 lg:px-8">
            <span className="flex items-center gap-2 font-semibold text-amber-800"><Percent className="h-4 w-4" /> Ưu đãi đang diễn ra</span>
            {promotions.map((p) => (
              <span key={p.id} className="text-amber-900">
                <span className="rounded border border-dashed border-amber-500 bg-white px-2 py-0.5 font-mono text-xs font-bold">{p.code}</span>{' '}
                giảm {Number(p.discountPercent)}%{p.subtitle ? ` ${p.subtitle}` : ''} · đến {formatDateTime(p.endDate)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* price list */}
      <section id="bang-gia" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Bảng giá dịch vụ</h2>
        <p className="mt-2 text-center text-gray-500">Giá niêm yết rõ ràng, không phát sinh chi phí ẩn.</p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : error ? (
          <Alert variant="error" className="mx-auto mt-8 max-w-xl">
            {error} <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold underline">Thử lại</button>
          </Alert>
        ) : services.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Bảng giá đang được cập nhật.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => {
              const rating = ratings[s.id];
              return (
                <article key={s.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name} className="h-40 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-blue-50 text-blue-400"><Shirt className="h-14 w-14" /></div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{formatVND(s.price)}<span className="text-sm font-normal text-gray-500"> / {s.unit}</span></p>
                    {s.description && <p className="mt-2 flex-1 text-sm text-gray-500">{s.description}</p>}
                    {rating?.total > 0 && (
                      <p className="mt-3 flex items-center gap-1 text-sm text-gray-600">
                        <StarRating value={rating.average} size="h-4 w-4" /> {rating.average.toFixed(1)} ({rating.total})
                      </p>
                    )}
                    <Link to={`/booking?service=${s.id}`} className="mt-4 rounded-lg bg-blue-600 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">Đặt dịch vụ này</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* process */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">Quy trình đơn giản</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="text-center">
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-8 w-8" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* promises */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Cam kết của chúng tôi</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <Icon className="h-8 w-8 text-blue-600" />
              <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* reviews */}
      {reviews.length > 0 && (
        <section className="bg-blue-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold text-gray-900">Khách hàng nói gì về chúng tôi</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
                  <Quote className="h-6 w-6 text-blue-200" />
                  <StarRating value={r.rating} size="h-4 w-4" />
                  <blockquote className="mt-2 flex-1 text-sm text-gray-700">{r.comment}</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-gray-900">{r.customerName}</figcaption>
                  {r.replyContent && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600"><span className="font-semibold">Phản hồi từ tiệm:</span> {r.replyContent}</p>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* final call to action */}
      <section className="mx-auto max-w-4xl px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Sẵn sàng có quần áo sạch thơm?</h2>
        <Link to="/booking" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          Đặt giặt ngay <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
