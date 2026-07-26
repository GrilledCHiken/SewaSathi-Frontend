package com.sewasathi.service;

import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
    );

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory", e);
        }
    }

    public record StoredFile(String url, String originalName, String contentType) {
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidOperationException("No file was provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new InvalidOperationException("Unsupported file type: " + contentType);
        }
        // The declared content type comes from the client and is trivially forged, so the
        // file's own leading bytes have to agree with it. Without this, anything at all
        // could be stored simply by labelling it "image/png".
        assertContentMatchesDeclaredType(file, contentType);

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "file"
        );
        String extension = "";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0) {
            extension = originalName.substring(dot);
        }
        String storedName = UUID.randomUUID() + extension;

        try {
            Files.copy(file.getInputStream(), uploadPath.resolve(storedName));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store file", e);
        }

        return new StoredFile("/uploads/" + storedName, originalName, contentType);
    }

    /**
     * Checks the file's leading bytes against the type the client claimed.
     *
     * <p>{@code text/plain} is exempt because plain text has no signature to check.
     */
    static void assertContentMatchesDeclaredType(MultipartFile file, String contentType) {
        if ("text/plain".equals(contentType)) {
            return;
        }

        byte[] header = new byte[12];
        int read;
        try (var in = file.getInputStream()) {
            read = in.readNBytes(header, 0, header.length);
        } catch (IOException e) {
            throw new InvalidOperationException("Could not read the uploaded file");
        }
        if (read < 4) {
            throw new InvalidOperationException("The uploaded file appears to be empty or truncated");
        }

        if (!matchesSignature(header, contentType)) {
            throw new InvalidOperationException(
                    "This file's contents do not match its declared type (" + contentType + ")");
        }
    }

    private static boolean matchesSignature(byte[] h, String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> startsWith(h, 0xFF, 0xD8, 0xFF);
            case "image/png" -> startsWith(h, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case "image/gif" -> startsWith(h, 0x47, 0x49, 0x46, 0x38);
            // "RIFF" .... "WEBP" - the four size bytes in between are skipped.
            case "image/webp" -> startsWith(h, 0x52, 0x49, 0x46, 0x46)
                    && h[8] == 0x57 && h[9] == 0x45 && h[10] == 0x42 && h[11] == 0x50;
            case "application/pdf" -> startsWith(h, 0x25, 0x50, 0x44, 0x46);
            // Legacy .doc is an OLE compound document.
            case "application/msword" -> startsWith(h, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
            // .docx is a zip container.
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
                    startsWith(h, 0x50, 0x4B, 0x03, 0x04);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] header, int... signature) {
        if (header.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((header[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Resolves a stored filename to a readable file on disk, refusing anything that escapes
     * the upload directory.
     *
     * <p>The traversal guard is the important part: the filename arrives from a URL path,
     * so without normalising and re-checking the prefix, a request for {@code ../../} could
     * read arbitrary files off the server.
     */
    public Path resolveForRead(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new ResourceNotFoundException("No file requested");
        }
        Path target = uploadPath.resolve(filename).normalize();
        if (!target.startsWith(uploadPath) || !Files.isRegularFile(target)) {
            throw new ResourceNotFoundException("No file named " + filename);
        }
        return target;
    }

    /**
     * Removes a file previously returned by {@link #store}. Best effort: a missing or
     * unreadable file must never fail the request that triggered the cleanup.
     */
    public void delete(String url) {
        if (url == null || !url.startsWith("/uploads/")) {
            return;
        }
        Path target = uploadPath.resolve(url.substring("/uploads/".length())).normalize();
        if (!target.startsWith(uploadPath)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // Orphaned file on disk is preferable to a failed delete.
        }
    }
}
