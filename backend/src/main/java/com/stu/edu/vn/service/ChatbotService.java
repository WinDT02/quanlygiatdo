package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.ChatbotResponse;
import com.stu.edu.vn.dto.OrderItemResponse;
import com.stu.edu.vn.dto.OrderResponse;
import com.stu.edu.vn.dto.PromotionResponse;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.ChatbotCatalogRepository;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Rule-based support bot, no external AI. The question is lower-cased and stripped of Vietnamese accents,
 * so "Bảng giá", "bang gia" and "BẢNG GIÁ" are the same. Rules are tried in order and the FIRST match wins;
 * the order matters ("hoàn tiền" must come before "tiền", "giảm giá" before "giá").
 * Answers about prices, promotions and orders come straight from the database.
 */
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private static final String ROLE_CUSTOMER = "CUSTOMER";
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** "#6", "đơn 6", "đơn hàng số 6" (already accent-free and lower-case). */
    private static final Pattern ORDER_ID = Pattern.compile("#\\s*(\\d+)|\\bdon\\s*(?:hang\\s*)?(?:so\\s*)?#?(\\d+)\\b");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private final ChatbotCatalogRepository catalogRepository;
    private final PromotionService promotionService;
    private final OrderService orderService;

    /** One answer rule: any keyword (whole word or phrase, accent-free) triggers it. */
    private record Rule(String intent, List<String> keywords) {
    }

    // ORDER MATTERS - first match wins. Keywords are written with accents for readability and normalized at start-up.
    private static final List<Rule> RULES = List.of(
            new Rule("REFUND", List.of("hoàn tiền", "hủy đơn", "huỷ đơn", "hoàn lại tiền", "trả lại tiền")),
            new Rule("ORDER", List.of("đơn hàng", "đơn của tôi", "kiểm tra đơn", "giặt xong chưa", "trạng thái đơn", "tra cứu đơn", "xem đơn")),
            new Rule("PROMOTION", List.of("giảm giá", "khuyến mãi", "khuyến mại", "voucher", "ưu đãi", "mã giảm", "mã", "coupon")),
            new Rule("PAYMENT", List.of("thanh toán", "vnpay", "tiền mặt", "cod", "thẻ", "qr", "chuyển khoản", "trả tiền")),
            new Rule("TIME", List.of("bao lâu", "mấy tiếng", "mấy giờ", "khi nào xong", "khi nào có", "thời gian", "lấy đồ", "giặt nhanh", "express")),
            new Rule("DELIVERY", List.of("khu vực", "ship", "giao nhận", "khách sạn", "tận nơi", "giao hàng", "lấy tận", "địa chỉ", "phí vận chuyển", "hotel")),
            new Rule("COMPENSATION", List.of("hư hỏng", "hỏng đồ", "rách", "mất đồ", "thất lạc", "bồi thường", "đền bù", "đền tiền", "phai màu", "lem màu", "co rút")),
            new Rule("SELF_SERVICE", List.of("tự phục vụ", "máy giặt", "tự giặt", "tự động")),
            new Rule("LANGUAGE", List.of("tiếng anh", "english", "nước ngoài", "người nước ngoài", "foreigner")),
            new Rule("PRICE", List.of("giá", "bảng giá", "dịch vụ", "giặt bao nhiêu", "bao nhiêu", "tiền", "phí"))
    );

    private static final List<Rule> NORMALIZED_RULES = RULES.stream()
            .map(r -> new Rule(r.intent(), r.keywords().stream().map(ChatbotService::normalize).toList()))
            .toList();

    // ------------------------------------------------------------------ entry point

    /** {@code principal} is null for a guest. */
    @Transactional(readOnly = true)
    public ChatbotResponse ask(UserPrincipal principal, String message) {
        String text = normalize(message);
        if (text.isEmpty()) {
            return reply("FALLBACK", fallback());
        }

        // an explicit order number ("#6", "đơn 6") always means an order lookup
        String digits = extractOrderDigits(text);
        if (digits != null) {
            if (digits.length() > 18) {   // cannot be a real id (and would overflow a long)
                return reply("ORDER", "Mã đơn không hợp lệ. Bạn kiểm tra lại mã đơn trong mục \"Đơn của tôi\" nhé.");
            }
            return reply("ORDER", orderAnswer(principal, Long.parseLong(digits)));
        }

        for (Rule rule : NORMALIZED_RULES) {
            if (matches(text, rule.keywords())) {
                return reply(rule.intent(), answer(rule.intent(), principal));
            }
        }
        return reply("FALLBACK", fallback());
    }

    private String answer(String intent, UserPrincipal principal) {
        return switch (intent) {
            case "REFUND" -> refundAnswer();
            case "ORDER" -> orderAnswer(principal, null);
            case "PROMOTION" -> promotionAnswer();
            case "PAYMENT" -> paymentAnswer();
            case "TIME" -> timeAnswer();
            case "DELIVERY" -> deliveryAnswer();
            case "COMPENSATION" -> compensationAnswer();
            case "SELF_SERVICE" -> selfServiceAnswer();
            case "LANGUAGE" -> languageAnswer();
            case "PRICE" -> priceAnswer();
            default -> fallback();
        };
    }

    // ------------------------------------------------------------------ group A: database

    private String priceAnswer() {
        List<ChatbotCatalogRepository.ServiceRow> services = catalogRepository.findActiveServices();
        if (services.isEmpty()) {
            return "Hiện tiệm chưa có dịch vụ nào đang mở bán. Bạn vui lòng quay lại sau nhé!";
        }
        StringBuilder sb = new StringBuilder("Bảng giá dịch vụ hiện tại:");
        for (ChatbotCatalogRepository.ServiceRow s : services) {
            sb.append("\n• ").append(s.getName()).append(": ").append(vnd(s.getPrice())).append("/").append(s.getUnit());
        }
        sb.append("\n\nBạn có thể đặt giặt ngay ở mục \"Đặt giặt\" trên thanh menu.");
        return sb.toString();
    }

    private String promotionAnswer() {
        List<PromotionResponse> promotions = promotionService.listUsable();
        if (promotions.isEmpty()) {
            return "Hiện chưa có mã giảm giá nào đang áp dụng. Bạn theo dõi trang chủ để không bỏ lỡ ưu đãi mới nhé!";
        }
        StringBuilder sb = new StringBuilder("Các mã giảm giá đang áp dụng:");
        for (PromotionResponse p : promotions) {
            sb.append("\n• ").append(p.code()).append(": giảm ").append(percent(p.discountPercent())).append("%");
            if (p.title() != null && !p.title().isBlank()) {
                sb.append(" (").append(p.title()).append(")");
            }
            if (p.endDate() != null) {
                sb.append(" – đến hết ").append(p.endDate().format(DATE));
            }
        }
        sb.append("\n\nNhập mã ở bước đặt giặt để được giảm trực tiếp vào tổng tiền.");
        return sb.toString();
    }

    /** {@code orderId == null} -> the customer's latest order. Only a logged-in CUSTOMER sees orders, and only his own. */
    private String orderAnswer(UserPrincipal principal, Long orderId) {
        if (principal == null) {
            return "Bạn vui lòng đăng nhập để mình tra cứu trạng thái đơn hàng của bạn nhé.";
        }
        if (!ROLE_CUSTOMER.equals(principal.getRole())) {
            return "Tài khoản nhân viên/quản trị không có đơn hàng cá nhân. Vui lòng xem đơn ở trang Quản lý đơn hàng.";
        }

        OrderResponse order;
        try {
            if (orderId != null) {
                order = orderService.getById(principal, orderId);   // ownership is checked there
            } else {
                List<OrderResponse> mine = orderService.getMyOrders(principal);
                if (mine.isEmpty()) {
                    return "Bạn chưa có đơn hàng nào. Hãy đặt giặt ở mục \"Đặt giặt\" nhé!";
                }
                order = mine.get(0);                                   // newest first
            }
        } catch (ResourceNotFoundException ex) {
            return "Mình không tìm thấy đơn #" + orderId + " trong tài khoản của bạn. Bạn kiểm tra lại mã đơn trong mục \"Đơn của tôi\" nhé.";
        }
        return describeOrder(order);
    }

    private String describeOrder(OrderResponse o) {
        StringBuilder sb = new StringBuilder("Đơn #").append(o.id()).append(" – ").append(statusLabel(o.status()));
        if (o.orderedAt() != null) {
            sb.append("\n• Đặt lúc: ").append(o.orderedAt().format(DATE_TIME));
        }
        if (o.items() != null && !o.items().isEmpty()) {
            sb.append("\n• Dịch vụ: ").append(o.items().stream().map(this::itemText).collect(Collectors.joining(", ")));
        }
        sb.append("\n• Tổng tiền: ").append(vnd(o.totalAmount()));
        sb.append("\n• Thanh toán: ").append(paymentLabel(o));
        if (o.employeeName() != null && !o.employeeName().isBlank()) {
            sb.append("\n• Nhân viên phụ trách: ").append(o.employeeName());
        }
        sb.append("\n\n").append(statusHint(o));
        return sb.toString();
    }

    private String itemText(OrderItemResponse item) {
        return item.serviceName() + " × " + plain(item.quantity()) + (item.unit() != null ? " " + item.unit() : "");
    }

    private String statusLabel(String status) {
        return switch (status) {
            case "PENDING" -> "Chờ xác nhận";
            case "PROCESSING" -> "Đang xử lý";
            case "WASHING" -> "Đang giặt";
            case "COMPLETED" -> "Đã hoàn thành";
            case "CANCELLED" -> "Đã hủy";
            default -> status;
        };
    }

    private String paymentLabel(OrderResponse o) {
        boolean paid = "PAID".equals(o.paymentStatus());
        if ("CANCELLED".equals(o.status()) && paid) {
            return "Chờ hoàn tiền";
        }
        return paid ? "Đã thanh toán" : "Chưa thanh toán";
    }

    private String statusHint(OrderResponse o) {
        return switch (o.status()) {
            case "PENDING" -> "Tiệm sẽ sớm xác nhận đơn của bạn. Bạn có thể hủy đơn khi đơn còn ở trạng thái này.";
            case "PROCESSING" -> "Đơn đã được tiếp nhận và đang được chuẩn bị giặt.";
            case "WASHING" -> "Đồ của bạn đang được giặt, sấy và gấp gọn.";
            case "COMPLETED" -> "Đơn đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!";
            case "CANCELLED" -> "PAID".equals(o.paymentStatus())
                    ? "Đơn này đã thanh toán. Cửa hàng sẽ liên hệ với bạn để hoàn lại số tiền đã thanh toán."
                    : "Đơn này đã bị hủy.";
            default -> "";
        };
    }

    // ------------------------------------------------------------------ group B: FAQ

    private String paymentAnswer() {
        return "Tiệm hỗ trợ 2 hình thức thanh toán:\n"
                + "• Tiền mặt khi nhận đồ (COD).\n"
                + "• Thanh toán trực tuyến qua cổng VNPay: thẻ ATM nội địa, thẻ quốc tế hoặc QR Pay.\n\n"
                + "Bạn chọn hình thức thanh toán ở bước xác nhận đơn.";
    }

    private String timeAnswer() {
        return "Thời gian xử lý:\n"
                + "• Giặt sấy tiêu chuẩn: hoàn thành trong 4–6 tiếng (trong ngày).\n"
                + "• Giặt nhanh (Express): có thể lấy sau 2 tiếng.";
    }

    private String deliveryAnswer() {
        return "Tiệm hỗ trợ giao nhận tận nơi tại TP.HCM, gồm nhà riêng, chung cư và khách sạn. "
                + "Bạn cũng có thể tự mang đồ đến cửa hàng. Chọn hình thức giao nhận ở bước đặt giặt nhé.";
    }

    private String compensationAnswer() {
        return "Tiệm cam kết phân loại đồ trắng và đồ màu trước khi giặt. "
                + "Nếu xảy ra hư hỏng hoặc thất lạc do lỗi của tiệm, chúng tôi sẽ hỗ trợ kiểm tra và bồi thường thỏa đáng theo giá trị thực tế của món đồ.";
    }

    private String selfServiceAnswer() {
        return "Tiệm hoạt động theo mô hình dịch vụ trọn gói: nhân viên tiếp nhận, phân loại, giặt, sấy khô và gấp gọn cho bạn. "
                + "Đây không phải tiệm máy giặt tự phục vụ.";
    }

    private String languageAnswer() {
        return "Yes! Our staff and system can support you by text message in English. "
                + "Nhân viên và hệ thống của tiệm sẵn sàng hỗ trợ khách nước ngoài qua tin nhắn bằng tiếng Anh.";
    }

    private String refundAnswer() {
        return "Nếu bạn hủy đơn đã thanh toán qua VNPay, cửa hàng sẽ liên hệ trực tiếp qua số điện thoại trong hồ sơ của bạn "
                + "để hoàn tiền chuyển khoản. Đơn chỉ hủy được khi còn ở trạng thái \"Chờ xác nhận\".";
    }

    private String fallback() {
        return "Xin chào! Mình là Trợ lý Giặt Sấy. Mình có thể giúp bạn về:\n"
                + "• Bảng giá dịch vụ\n"
                + "• Mã giảm giá\n"
                + "• Tra cứu đơn hàng của bạn (ví dụ: \"#6\")\n"
                + "• Thanh toán, thời gian giặt, giao nhận\n"
                + "• Chính sách bồi thường, hoàn tiền\n\n"
                + "Bạn muốn hỏi về chủ đề nào?";
    }

    // ------------------------------------------------------------------ helpers

    private ChatbotResponse reply(String intent, String text) {
        return new ChatbotResponse(text, intent);
    }

    private String extractOrderDigits(String text) {
        Matcher m = ORDER_ID.matcher(text);
        if (!m.find()) {
            return null;
        }
        return m.group(1) != null ? m.group(1) : m.group(2);
    }

    /** Whole-word / whole-phrase match: "ma" matches "ma giam gia" but not "may giat". */
    private static boolean matches(String text, List<String> keywords) {
        String padded = " " + text + " ";
        for (String keyword : keywords) {
            if (padded.contains(" " + keyword + " ")) {
                return true;
            }
        }
        return false;
    }

    /** lower-case, no accents (đ -> d), punctuation -> space (keeps '#'), single spaces. */
    static String normalize(String input) {
        if (input == null) {
            return "";
        }
        String s = input.toLowerCase(Locale.ROOT).replace('đ', 'd');
        s = Normalizer.normalize(s, Normalizer.Form.NFD);
        s = DIACRITICS.matcher(s).replaceAll("");
        s = s.replaceAll("[^a-z0-9#]+", " ").trim();
        return s;
    }

    private static String vnd(BigDecimal amount) {
        if (amount == null) {
            return "0đ";
        }
        DecimalFormat format = new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(Locale.ROOT));
        DecimalFormatSymbols symbols = format.getDecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        format.setDecimalFormatSymbols(symbols);
        return format.format(amount) + "đ";
    }

    private static String percent(BigDecimal value) {
        return plain(value);
    }

    private static String plain(Object number) {
        if (number == null) {
            return "0";
        }
        try {
            return new BigDecimal(String.valueOf(number)).stripTrailingZeros().toPlainString();
        } catch (NumberFormatException ex) {
            return String.valueOf(number);
        }
    }
}
