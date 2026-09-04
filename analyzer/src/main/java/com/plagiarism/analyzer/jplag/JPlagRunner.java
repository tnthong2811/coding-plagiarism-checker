package com.plagiarism.analyzer.jplag;

import com.plagiarism.analyzer.config.MinioProperties;
import com.plagiarism.analyzer.dto.CompareRequest;
import com.plagiarism.analyzer.dto.CompareResponse;
import de.jplag.JPlag;
import de.jplag.JPlagComparison;
import de.jplag.JPlagResult;
import de.jplag.Language;
import de.jplag.options.JPlagOptions;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class JPlagRunner {

    private static final Logger log = LoggerFactory.getLogger(JPlagRunner.class);
    private static final byte[] UTF8_BOM = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    public JPlagRunner(MinioClient minioClient, MinioProperties minioProperties) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
    }

    public CompareResponse runAnalysis(CompareRequest request) {
        validateRequest(request);

        Path workspace;
        try {
            workspace = Files.createTempDirectory("jplag-run-");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create temporary analysis workspace", e);
        }

        try {
            Path submissionsRoot = workspace.resolve("submissions");
            Files.createDirectories(submissionsRoot);
            Map<String, CompareRequest.SubmissionPayload> lookup = materializeSubmissions(request.getSubmissions(), submissionsRoot);
            normalizeJavaSources(submissionsRoot);

            Language language = resolveLanguage(request.getLanguage());
            ensureComparableSources(language, submissionsRoot, lookup);
            JPlagOptions options = new JPlagOptions(language, Set.of(submissionsRoot.toFile()), Collections.emptySet())
                    .withSimilarityThreshold(0)
                    .withMaximumNumberOfComparisons(JPlagOptions.SHOW_ALL_COMPARISONS);

            log.info("Running JPlag for {} submissions", lookup.size());
            JPlagResult jPlagResult = new JPlag(options).run();
            return toResponse(request, jPlagResult, lookup);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            IllegalArgumentException userInputError = toUserInputError(e);
            if (userInputError != null) {
                throw userInputError;
            }
            throw new IllegalStateException("JPlag analysis failed: " + e.getMessage(), e);
        } finally {
            deleteRecursively(workspace);
        }
    }

    private void validateRequest(CompareRequest request) {
        if (request == null || request.getSubmissions() == null || request.getSubmissions().size() < 2) {
            throw new IllegalArgumentException("At least 2 submissions are required for comparison");
        }

        for (CompareRequest.SubmissionPayload submission : request.getSubmissions()) {
            if (submission == null || submission.getObjectKey() == null || submission.getObjectKey().isBlank()) {
                throw new IllegalArgumentException("Each submission must include a non-empty objectKey");
            }
        }
    }

    private Language resolveLanguage(String language) {
        if (language == null || language.isBlank() || "JAVA".equalsIgnoreCase(language)) {
            return new de.jplag.java.Language();
        }
        throw new IllegalArgumentException("Unsupported language: " + language + ". Supported values: JAVA");
    }

    private void ensureComparableSources(Language language,
                                         Path submissionsRoot,
                                         Map<String, CompareRequest.SubmissionPayload> lookup) {
        String requiredExtension = requiredExtension(language);
        List<String> missingSources = lookup.entrySet().stream()
                .filter(entry -> !containsSourceWithExtension(submissionsRoot.resolve(entry.getKey()), requiredExtension))
                .map(entry -> describeSubmission(entry.getValue(), entry.getKey()))
                .toList();

        if (!missingSources.isEmpty()) {
            throw new IllegalArgumentException(
                    "Missing " + requiredExtension + " source files in: " + String.join(", ", missingSources)
            );
        }
    }

    private String requiredExtension(Language language) {
        if (language instanceof de.jplag.java.Language) {
            return ".java";
        }
        throw new IllegalArgumentException("Unsupported language handler: " + language.getIdentifier());
    }

    private boolean containsSourceWithExtension(Path submissionDir, String extension) {
        if (!Files.exists(submissionDir)) {
            return false;
        }

        try (Stream<Path> walk = Files.walk(submissionDir)) {
            return walk
                    .filter(Files::isRegularFile)
                    .anyMatch(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(extension));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to inspect extracted submission at " + submissionDir, e);
        }
    }

    private String describeSubmission(CompareRequest.SubmissionPayload payload, String fallbackName) {
        if (payload.getSubmissionId() != null) {
            return "submissionId=" + payload.getSubmissionId();
        }
        if (payload.getOriginalFileName() != null && !payload.getOriginalFileName().isBlank()) {
            return payload.getOriginalFileName();
        }
        return fallbackName;
    }

    private void normalizeJavaSources(Path submissionsRoot) {
        try (Stream<Path> walk = Files.walk(submissionsRoot)) {
            walk.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".java"))
                    .forEach(this::stripUtf8BomIfPresent);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to normalize extracted Java sources", e);
        }
    }

    private void stripUtf8BomIfPresent(Path file) {
        try {
            byte[] content = Files.readAllBytes(file);
            if (content.length >= 3
                    && content[0] == UTF8_BOM[0]
                    && content[1] == UTF8_BOM[1]
                    && content[2] == UTF8_BOM[2]) {
                Files.write(file, Arrays.copyOfRange(content, 3, content.length));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to normalize source file " + file, e);
        }
    }

    private IllegalArgumentException toUserInputError(Exception error) {
        Throwable current = error;
        while (current != null) {
            String message = current.getMessage();
            if (message != null && message.contains("Not enough valid submissions")) {
                return new IllegalArgumentException(
                        "Selected submissions do not contain enough parsable source code for JPlag. " +
                                "Please choose at least two valid source submissions.",
                        error
                );
            }
            current = current.getCause();
        }
        return null;
    }

    private Map<String, CompareRequest.SubmissionPayload> materializeSubmissions(List<CompareRequest.SubmissionPayload> submissions,
                                                                                  Path submissionsRoot) throws Exception {
        AtomicInteger counter = new AtomicInteger(1);
        Map<String, CompareRequest.SubmissionPayload> lookup = new LinkedHashMap<>();

        for (CompareRequest.SubmissionPayload payload : submissions) {
            String submissionName = payload.getSubmissionId() == null
                    ? "submission-" + counter.getAndIncrement()
                    : "submission-" + payload.getSubmissionId();

            while (lookup.containsKey(submissionName)) {
                submissionName = submissionName + "-" + counter.getAndIncrement();
            }

            Path submissionDir = submissionsRoot.resolve(submissionName);
            Files.createDirectories(submissionDir);
            copyFromMinio(payload, submissionDir);
            lookup.put(submissionName, payload);
        }
        return lookup;
    }

    private void copyFromMinio(CompareRequest.SubmissionPayload payload, Path submissionDir) throws Exception {
        String originalFileName = payload.getOriginalFileName() == null || payload.getOriginalFileName().isBlank()
                ? "submission.java"
                : payload.getOriginalFileName();

        try (InputStream input = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(minioProperties.getBucketName())
                        .object(payload.getObjectKey())
                        .build())) {
            if (originalFileName.toLowerCase(Locale.ROOT).endsWith(".zip")) {
                unzipSubmission(input, submissionDir);
                return;
            }

            Path targetFile = submissionDir.resolve(originalFileName).normalize();
            if (!targetFile.startsWith(submissionDir)) {
                throw new IllegalArgumentException("Invalid file name in submission: " + originalFileName);
            }

            Files.createDirectories(targetFile.getParent());
            Files.copy(input, targetFile, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void unzipSubmission(InputStream zippedStream, Path destinationDir) throws IOException {
        try (ZipInputStream zipInputStream = new ZipInputStream(zippedStream)) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                Path target = destinationDir.resolve(entry.getName()).normalize();
                if (!target.startsWith(destinationDir)) {
                    throw new IOException("Zip entry outside destination: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    Files.createDirectories(target);
                } else {
                    if (target.getParent() != null) {
                        Files.createDirectories(target.getParent());
                    }
                    try (OutputStream output = Files.newOutputStream(target)) {
                        zipInputStream.transferTo(output);
                    }
                }
                zipInputStream.closeEntry();
            }
        }
    }

    private CompareResponse toResponse(CompareRequest request,
                                       JPlagResult result,
                                       Map<String, CompareRequest.SubmissionPayload> lookup) {
        CompareResponse response = new CompareResponse();
        response.setSuccess(true);
        response.setLanguage(request.getLanguage() == null || request.getLanguage().isBlank() ? "JAVA" : request.getLanguage().toUpperCase(Locale.ROOT));
        response.setSubmissionCount(lookup.size());
        response.setDurationMs(result.getDuration());
        response.setGeneratedAt(Instant.now().toString());

        List<CompareResponse.ComparisonRow> comparisons = result.getAllComparisons().stream()
                .map(comparison -> toComparisonRow(comparison, lookup))
                .filter(Objects::nonNull)
                .toList();

        response.setComparisons(comparisons);
        if (comparisons.isEmpty()) {
            response.setMessage("No comparable pairs were produced by JPlag for the selected submissions.");
        }
        return response;
    }

    private CompareResponse.ComparisonRow toComparisonRow(JPlagComparison comparison,
                                                          Map<String, CompareRequest.SubmissionPayload> lookup) {
        CompareRequest.SubmissionPayload left = lookup.get(comparison.firstSubmission().getName());
        CompareRequest.SubmissionPayload right = lookup.get(comparison.secondSubmission().getName());
        if (left == null || right == null) {
            return null;
        }

        CompareResponse.ComparisonRow row = new CompareResponse.ComparisonRow();
        row.setLeftSubmissionId(left.getSubmissionId());
        row.setLeftStudent(left.getSubmittedBy());
        row.setLeftFileName(left.getOriginalFileName());
        row.setRightSubmissionId(right.getSubmissionId());
        row.setRightStudent(right.getSubmittedBy());
        row.setRightFileName(right.getOriginalFileName());
        row.setSimilarityPercent(roundToTwoDecimals(comparison.similarity() * 100));
        row.setMaximalSimilarityPercent(roundToTwoDecimals(comparison.maximalSimilarity() * 100));
        row.setMinimalSimilarityPercent(roundToTwoDecimals(comparison.minimalSimilarity() * 100));
        row.setMatchedTokens(comparison.getNumberOfMatchedTokens());
        return row;
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private void deleteRecursively(Path root) {
        if (root == null || !Files.exists(root)) {
            return;
        }

        try (Stream<Path> walk = Files.walk(root)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        } catch (IOException e) {
            log.warn("Failed to cleanup temporary workspace: {}", root, e);
        } catch (UncheckedIOException e) {
            log.warn("Failed to cleanup temporary workspace: {}", root, e.getCause());
        }
    }
}

