package com.plagiarism.analyzer.jplag;

import com.plagiarism.analyzer.config.MinioProperties;
import com.plagiarism.analyzer.dto.CompareRequest;
import com.plagiarism.analyzer.dto.CompareResponse;
import de.jplag.JPlag;
import de.jplag.JPlagComparison;
import de.jplag.JPlagResult;
import de.jplag.Language;
import de.jplag.Match;
import de.jplag.Token;
import de.jplag.options.JPlagOptions;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
    private static final List<SourceLanguage> SUPPORTED_LANGUAGES = List.of(SourceLanguage.JAVA, SourceLanguage.CPP);

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final int minimumTokenMatch;

    public JPlagRunner(MinioClient minioClient,
                       MinioProperties minioProperties,
                       @Value("${analyzer.jplag.minimum-token-match:3}") int minimumTokenMatch) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        this.minimumTokenMatch = minimumTokenMatch;
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
            normalizeSupportedSources(submissionsRoot);

            SourceLanguage sourceLanguage = resolveLanguage(request.getLanguage(), submissionsRoot, lookup);
            Map<String, CompareResponse.ComparedSubmissionSource> sourceLookup = collectSubmissionSources(
                    submissionsRoot,
                    lookup,
                    sourceLanguage
            );
            Language language = sourceLanguage.createLanguage();
            JPlagOptions options = new JPlagOptions(language, Set.of(submissionsRoot.toFile()), Collections.emptySet())
                    .withMinimumTokenMatch(minimumTokenMatch)
                    .withSimilarityThreshold(0)
                    .withMaximumNumberOfComparisons(JPlagOptions.SHOW_ALL_COMPARISONS);

            log.info("Running JPlag {} analysis for {} submissions", sourceLanguage.responseValue, lookup.size());
            JPlagResult jPlagResult = new JPlag(options).run();
            return toResponse(sourceLanguage, jPlagResult, lookup, sourceLookup);
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

    private SourceLanguage resolveLanguage(String requestedLanguage,
                                           Path submissionsRoot,
                                           Map<String, CompareRequest.SubmissionPayload> lookup) {
        SourceLanguage explicitLanguage = resolveExplicitLanguage(requestedLanguage);
        if (explicitLanguage != null) {
            ensureSourcesForLanguage(explicitLanguage, submissionsRoot, lookup);
            return explicitLanguage;
        }

        return detectCommonLanguage(submissionsRoot, lookup);
    }

    private SourceLanguage resolveExplicitLanguage(String language) {
        if (language == null || language.isBlank() || "AUTO".equalsIgnoreCase(language.trim())) {
            return null;
        }

        String normalized = language.trim()
                .toUpperCase(Locale.ROOT)
                .replace("-", "_")
                .replace("/", "_")
                .replace(" ", "");
        return switch (normalized) {
            case "JAVA" -> SourceLanguage.JAVA;
            case "CPP", "C", "C++", "CXX", "CC", "C_CPP", "CPLUSPLUS" -> SourceLanguage.CPP;
            default -> throw new IllegalArgumentException(
                    "Unsupported language: " + language + ". Supported values: AUTO, JAVA, CPP"
            );
        };
    }

    private SourceLanguage detectCommonLanguage(Path submissionsRoot,
                                                Map<String, CompareRequest.SubmissionPayload> lookup) {
        List<String> missingSources = new ArrayList<>();
        List<String> ambiguousSources = new ArrayList<>();
        Set<SourceLanguage> detectedLanguages = new LinkedHashSet<>();

        for (Map.Entry<String, CompareRequest.SubmissionPayload> entry : lookup.entrySet()) {
            Set<SourceLanguage> languages = detectLanguages(submissionsRoot.resolve(entry.getKey()));
            if (languages.isEmpty()) {
                missingSources.add(describeSubmission(entry.getValue(), entry.getKey()));
            } else if (languages.size() > 1) {
                ambiguousSources.add(describeSubmission(entry.getValue(), entry.getKey()) + " (" + languageList(languages) + ")");
            } else {
                detectedLanguages.add(languages.iterator().next());
            }
        }

        if (!missingSources.isEmpty()) {
            throw new IllegalArgumentException(
                    "Supported source files were not found in: " + String.join(", ", missingSources) +
                            ". Supported extensions: " + supportedExtensionsLabel()
            );
        }

        if (!ambiguousSources.isEmpty()) {
            throw new IllegalArgumentException(
                    "Multiple supported languages found in: " + String.join(", ", ambiguousSources) +
                            ". Select submissions containing one language."
            );
        }

        if (detectedLanguages.size() > 1) {
            throw new IllegalArgumentException(
                    "Selected submissions use multiple languages (" + languageList(detectedLanguages) +
                            "). Select submissions from one language at a time."
            );
        }

        return detectedLanguages.iterator().next();
    }

    private void ensureSourcesForLanguage(SourceLanguage language,
                                          Path submissionsRoot,
                                          Map<String, CompareRequest.SubmissionPayload> lookup) {
        List<String> missingSources = lookup.entrySet().stream()
                .filter(entry -> !containsSourceForLanguage(submissionsRoot.resolve(entry.getKey()), language))
                .map(entry -> describeSubmission(entry.getValue(), entry.getKey()))
                .toList();

        if (!missingSources.isEmpty()) {
            throw new IllegalArgumentException(
                    "Missing " + language.responseValue + " source files in: " + String.join(", ", missingSources) +
                            ". Expected extensions: " + language.extensionsLabel()
            );
        }
    }

    private boolean containsSourceForLanguage(Path submissionDir, SourceLanguage language) {
        if (!Files.exists(submissionDir)) {
            return false;
        }

        try (Stream<Path> walk = Files.walk(submissionDir)) {
            return walk
                    .filter(Files::isRegularFile)
                    .anyMatch(language::matches);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to inspect extracted submission at " + submissionDir, e);
        }
    }

    private Set<SourceLanguage> detectLanguages(Path submissionDir) {
        if (!Files.exists(submissionDir)) {
            return Set.of();
        }

        Set<SourceLanguage> languages = new LinkedHashSet<>();
        try (Stream<Path> walk = Files.walk(submissionDir)) {
            walk.filter(Files::isRegularFile)
                    .map(SourceLanguage::fromPath)
                    .filter(Objects::nonNull)
                    .forEach(languages::add);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to inspect extracted submission at " + submissionDir, e);
        }
        return languages;
    }

    private String languageList(Set<SourceLanguage> languages) {
        return languages.stream()
                .map(language -> language.responseValue)
                .distinct()
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
    }

    private String supportedExtensionsLabel() {
        return SUPPORTED_LANGUAGES.stream()
                .flatMap(language -> language.extensions.stream())
                .distinct()
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
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

    private void normalizeSupportedSources(Path submissionsRoot) {
        try (Stream<Path> walk = Files.walk(submissionsRoot)) {
            walk.filter(Files::isRegularFile)
                    .filter(path -> SourceLanguage.fromPath(path) != null)
                    .forEach(this::stripUtf8BomIfPresent);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to normalize extracted source files", e);
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

    private Map<String, CompareResponse.ComparedSubmissionSource> collectSubmissionSources(
            Path submissionsRoot,
            Map<String, CompareRequest.SubmissionPayload> lookup,
            SourceLanguage language
    ) throws IOException {
        Map<String, CompareResponse.ComparedSubmissionSource> sourceLookup = new LinkedHashMap<>();

        for (Map.Entry<String, CompareRequest.SubmissionPayload> entry : lookup.entrySet()) {
            String submissionName = entry.getKey();
            CompareRequest.SubmissionPayload payload = entry.getValue();

            CompareResponse.ComparedSubmissionSource source = new CompareResponse.ComparedSubmissionSource();
            source.setSubmissionName(submissionName);
            source.setSubmissionId(payload.getSubmissionId());
            source.setSubmittedBy(payload.getSubmittedBy());
            source.setOriginalFileName(payload.getOriginalFileName());
            source.setSourceFiles(readSourceFiles(submissionsRoot.resolve(submissionName), language));
            sourceLookup.put(submissionName, source);
        }

        return sourceLookup;
    }

    private List<CompareResponse.SourceFile> readSourceFiles(Path submissionDir, SourceLanguage language) throws IOException {
        if (!Files.exists(submissionDir)) {
            return List.of();
        }

        try (Stream<Path> walk = Files.walk(submissionDir)) {
            return walk
                    .filter(Files::isRegularFile)
                    .filter(language::matches)
                    .sorted(Comparator.comparing(path -> toRelativePath(submissionDir, path)))
                    .map(path -> toSourceFile(submissionDir, path))
                    .toList();
        }
    }

    private CompareResponse.SourceFile toSourceFile(Path submissionDir, Path sourcePath) {
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(sourcePath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read source file " + sourcePath, e);
        }

        String content = new String(bytes, StandardCharsets.UTF_8);
        CompareResponse.SourceFile sourceFile = new CompareResponse.SourceFile();
        sourceFile.setPath(toRelativePath(submissionDir, sourcePath));
        sourceFile.setFileName(sourcePath.getFileName().toString());
        sourceFile.setContent(content);
        sourceFile.setLineCount(countLines(content));
        return sourceFile;
    }

    private int countLines(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }

        int lines = 1;
        for (int i = 0; i < content.length(); i++) {
            if (content.charAt(i) == '\n') {
                lines++;
            }
        }
        return lines;
    }

    private CompareResponse toResponse(SourceLanguage sourceLanguage,
                                       JPlagResult result,
                                       Map<String, CompareRequest.SubmissionPayload> lookup,
                                       Map<String, CompareResponse.ComparedSubmissionSource> sourceLookup) {
        CompareResponse response = new CompareResponse();
        response.setSuccess(true);
        response.setLanguage(sourceLanguage.responseValue);
        response.setSubmissionCount(lookup.size());
        response.setDurationMs(result.getDuration());
        response.setGeneratedAt(Instant.now().toString());
        response.setSources(new ArrayList<>(sourceLookup.values()));

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
        row.setLeftSubmissionName(comparison.firstSubmission().getName());
        row.setLeftSubmissionId(left.getSubmissionId());
        row.setLeftStudent(left.getSubmittedBy());
        row.setLeftFileName(left.getOriginalFileName());
        row.setRightSubmissionName(comparison.secondSubmission().getName());
        row.setRightSubmissionId(right.getSubmissionId());
        row.setRightStudent(right.getSubmittedBy());
        row.setRightFileName(right.getOriginalFileName());
        row.setSimilarityPercent(roundToTwoDecimals(comparison.similarity() * 100));
        row.setMaximalSimilarityPercent(roundToTwoDecimals(comparison.maximalSimilarity() * 100));
        row.setMinimalSimilarityPercent(roundToTwoDecimals(comparison.minimalSimilarity() * 100));
        row.setMatchedTokens(comparison.getNumberOfMatchedTokens());
        row.setMatches(toMatchSegments(comparison));
        return row;
    }

    private List<CompareResponse.MatchSegment> toMatchSegments(JPlagComparison comparison) {
        List<Match> matches = comparison.matches();
        if (matches == null || matches.isEmpty()) {
            return List.of();
        }

        Path firstRoot = comparison.firstSubmission().getRoot().toPath().toAbsolutePath().normalize();
        Path secondRoot = comparison.secondSubmission().getRoot().toPath().toAbsolutePath().normalize();
        List<Token> firstTokens = comparison.firstSubmission().getTokenList();
        List<Token> secondTokens = comparison.secondSubmission().getTokenList();
        List<CompareResponse.MatchSegment> segments = new ArrayList<>();

        for (int i = 0; i < matches.size(); i++) {
            Match match = matches.get(i);
            CompareResponse.MatchSegment segment = new CompareResponse.MatchSegment();
            segment.setMatchIndex(i + 1);
            segment.setMatchedTokens(match.length());
            segment.setLeftRanges(toSourceRanges(firstTokens, match.startOfFirst(), match.endOfFirst(), firstRoot));
            segment.setRightRanges(toSourceRanges(secondTokens, match.startOfSecond(), match.endOfSecond(), secondRoot));

            if (!segment.getLeftRanges().isEmpty() || !segment.getRightRanges().isEmpty()) {
                segments.add(segment);
            }
        }

        return segments;
    }

    private List<CompareResponse.SourceRange> toSourceRanges(List<Token> tokens,
                                                              int startIndex,
                                                              int endIndex,
                                                              Path submissionRoot) {
        if (tokens == null || tokens.isEmpty()) {
            return List.of();
        }

        int safeStart = Math.max(0, startIndex);
        int safeEnd = Math.min(endIndex, tokens.size() - 1);
        if (safeStart > safeEnd) {
            return List.of();
        }

        List<CompareResponse.SourceRange> ranges = new ArrayList<>();
        String currentPath = null;
        int currentStartLine = -1;
        int currentEndLine = -1;

        for (int i = safeStart; i <= safeEnd; i++) {
            Token token = tokens.get(i);
            if (token == null || token.getFile() == null || token.getLine() <= 0) {
                continue;
            }

            String path = toRelativePath(submissionRoot, token.getFile().toPath());
            int line = token.getLine();

            if (!path.equals(currentPath)) {
                addSourceRange(ranges, currentPath, currentStartLine, currentEndLine);
                currentPath = path;
                currentStartLine = line;
                currentEndLine = line;
            } else {
                currentStartLine = Math.min(currentStartLine, line);
                currentEndLine = Math.max(currentEndLine, line);
            }
        }

        addSourceRange(ranges, currentPath, currentStartLine, currentEndLine);
        return ranges;
    }

    private void addSourceRange(List<CompareResponse.SourceRange> ranges, String path, int startLine, int endLine) {
        if (path == null || path.isBlank() || startLine <= 0 || endLine <= 0) {
            return;
        }

        CompareResponse.SourceRange range = new CompareResponse.SourceRange();
        range.setPath(path);
        range.setStartLine(Math.min(startLine, endLine));
        range.setEndLine(Math.max(startLine, endLine));
        ranges.add(range);
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String toRelativePath(Path root, Path path) {
        Path normalizedRoot = root.toAbsolutePath().normalize();
        Path normalizedPath = path.isAbsolute()
                ? path.toAbsolutePath().normalize()
                : normalizedRoot.resolve(path).normalize();

        if (normalizedPath.startsWith(normalizedRoot)) {
            return normalizedRoot.relativize(normalizedPath).toString().replace('\\', '/');
        }

        Path fileName = path.getFileName();
        return fileName == null ? path.toString().replace('\\', '/') : fileName.toString();
    }

    private enum SourceLanguage {
        JAVA("JAVA", List.of(".java")) {
            @Override
            Language createLanguage() {
                return new de.jplag.java.Language();
            }
        },
        CPP("CPP", List.of(".cpp", ".cxx", ".c++", ".c", ".cc", ".h", ".hpp", ".hh", ".hxx")) {
            @Override
            Language createLanguage() {
                return new de.jplag.cpp.Language();
            }
        };

        private final String responseValue;
        private final List<String> extensions;

        SourceLanguage(String responseValue, List<String> extensions) {
            this.responseValue = responseValue;
            this.extensions = extensions;
        }

        abstract Language createLanguage();

        private boolean matches(Path path) {
            String fileName = path.getFileName().toString().toLowerCase(Locale.ROOT);
            return extensions.stream().anyMatch(fileName::endsWith);
        }

        private String extensionsLabel() {
            return String.join(", ", extensions);
        }

        private static SourceLanguage fromPath(Path path) {
            for (SourceLanguage language : SUPPORTED_LANGUAGES) {
                if (language.matches(path)) {
                    return language;
                }
            }
            return null;
        }
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

