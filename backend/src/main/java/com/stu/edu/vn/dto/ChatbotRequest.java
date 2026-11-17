package com.stu.edu.vn.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of POST /api/chatbot/ask. */
public record ChatbotRequest(
        @NotBlank(message = "Vui lòng nhập câu hỏi")
        @Size(max = 500, message = "Câu hỏi tối đa 500 ký tự")
        String message
) {
}
