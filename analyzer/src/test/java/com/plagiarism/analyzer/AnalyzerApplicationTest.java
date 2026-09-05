package com.plagiarism.analyzer;

import com.plagiarism.analyzer.repository.AnalysisReportRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class AnalyzerApplicationTest {

    @MockBean
    private AnalysisReportRepository analysisReportRepository;

    @Test
    void contextLoads() {
        // context load smoke test
    }
}

