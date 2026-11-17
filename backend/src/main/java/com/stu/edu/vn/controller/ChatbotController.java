package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.ChatbotRequest;
import com.stu.edu.vn.dto.ChatbotResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Open to guests (SecurityConfig). {@code principal} is null when the caller is not logged in. */
@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/ask")
    public ChatbotResponse ask(@AuthenticationPrincipal UserPrincipal principal,
                               @Valid @RequestBody ChatbotRequest request) {
        return chatbotService.ask(principal, request.message());
    }
}
