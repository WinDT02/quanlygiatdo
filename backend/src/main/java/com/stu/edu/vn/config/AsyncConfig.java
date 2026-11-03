package com.stu.edu.vn.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Lets {@code @Async} work, so sending an e-mail never slows down (or reveals anything about) an API response. */
@Configuration
@EnableAsync
public class AsyncConfig {
}
