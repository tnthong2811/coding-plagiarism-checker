package com.plagiarism.submission.config;

import com.plagiarism.common.constant.AppConstants;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    @Bean
    public DirectExchange plagiarismExchange() {
        return new DirectExchange(AppConstants.EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue analysisQueue() {
        return new Queue(AppConstants.ANALYSIS_QUEUE, true);
    }

    @Bean
    public Binding submissionUploadedBinding(Queue analysisQueue, DirectExchange plagiarismExchange) {
        return BindingBuilder.bind(analysisQueue)
                .to(plagiarismExchange)
                .with(AppConstants.SUBMISSION_UPLOADED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter rabbitMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
