package com.sewasathi.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Background execution for work that must not sit in the request path - currently
 * {@link com.sewasathi.service.SmtpEmailService}.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("mail-");
        // If the queue ever fills, run the send on the caller's thread rather than
        // discarding it. A slow registration beats a silently lost verification email.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setTaskDecorator(new MdcPropagatingTaskDecorator());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(15);
        executor.initialize();
        return executor;
    }

    /**
     * Carries the request's correlation id onto the worker thread, so a failed email can be
     * traced back to the request that triggered it. Without this the MDC is empty on pooled
     * threads and the log line has no id.
     */
    static class MdcPropagatingTaskDecorator implements TaskDecorator {
        @Override
        public Runnable decorate(Runnable runnable) {
            Map<String, String> callerContext = MDC.getCopyOfContextMap();
            return () -> {
                Map<String, String> previous = MDC.getCopyOfContextMap();
                if (callerContext != null) {
                    MDC.setContextMap(callerContext);
                }
                try {
                    runnable.run();
                } finally {
                    if (previous != null) {
                        MDC.setContextMap(previous);
                    } else {
                        MDC.clear();
                    }
                }
            };
        }
    }
}
