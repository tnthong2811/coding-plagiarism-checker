package com.plagiarism.common.constant;

/**
 * Application-wide constants
 */
public class AppConstants {

    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";

    // Error Codes
    public static final String ERROR_INVALID_TOKEN = "INVALID_TOKEN";
    public static final String ERROR_UNAUTHORIZED = "UNAUTHORIZED";
    public static final String ERROR_FORBIDDEN = "FORBIDDEN";
    public static final String ERROR_NOT_FOUND = "NOT_FOUND";
    public static final String ERROR_INVALID_INPUT = "INVALID_INPUT";
    public static final String ERROR_INTERNAL_SERVER = "INTERNAL_SERVER_ERROR";

    // Message Queue
    public static final String SUBMISSION_QUEUE = "submission.queue";
    public static final String ANALYSIS_QUEUE = "analysis.queue";
    public static final String EXCHANGE_NAME = "plagiarism.exchange";

    // MinIO
    public static final String MINIO_BUCKET_SUBMISSIONS = "submissions";

    // Pagination
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    private AppConstants() {
        // Private constructor to prevent instantiation
    }
}

