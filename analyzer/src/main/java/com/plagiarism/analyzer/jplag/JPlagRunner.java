package com.plagiarism.analyzer.jplag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.List;

/**
 * Skeleton runner for jPlag-based analysis. Implementation should run jPlag
 * in a sandboxed environment and persist results. This is a safe placeholder
 * to be expanded with actual jPlag API calls or CLI invocation.
 */
@Service
public class JPlagRunner {

    private static final Logger log = LoggerFactory.getLogger(JPlagRunner.class);

    public AnalysisResult runAnalysis(List<Path> submissionPaths, Path outputDir) {
        log.info("Starting jPlag analysis for {} submissions, output: {}", submissionPaths.size(), outputDir);

        // TODO: integrate with de.jplag API or invoke jPlag CLI inside sandboxed container
        // For now, return a dummy result indicating success.

        AnalysisResult result = new AnalysisResult();
        result.setSuccess(true);
        result.setMessage("Not yet implemented: jPlag execution placeholder");
        return result;
    }

    public static class AnalysisResult {
        private boolean success;
        private String message;

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}

