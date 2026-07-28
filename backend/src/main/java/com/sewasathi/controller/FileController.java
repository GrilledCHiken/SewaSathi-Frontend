package com.sewasathi.controller;

import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.FileAccessService;
import com.sewasathi.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;

/**
 * Authenticated download endpoint for uploaded files (requirement #12).
 *
 * <p>Replaces the static {@code /uploads/**} resource handler, which served every upload -
 * including workers' citizenship documents and police clearance certificates - to anonymous
 * callers. {@link FileAccessService} now authorises each read against whatever record
 * references the file.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;
    private final FileAccessService fileAccessService;

    /**
     * Fallback for when {@link Files#probeContentType} cannot identify a file. The probe is
     * platform-dependent - on Windows it reads the registry and frequently returns null - and an
     * {@code application/octet-stream} answer, combined with the {@code nosniff} header below,
     * means the browser downloads the file instead of showing it. Covers the same set
     * {@code FileStorageService.ALLOWED_CONTENT_TYPES} accepts on upload.
     */
    private static final Map<String, String> CONTENT_TYPE_BY_EXTENSION = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "gif", "image/gif",
            "webp", "image/webp",
            "pdf", "application/pdf",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "txt", "text/plain"
    );

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename,
                                             @RequestParam(defaultValue = "false") boolean download,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        fileAccessService.assertCanRead(filename, principal.getUsername());

        Path file = fileStorageService.resolveForRead(filename);
        Resource resource = new FileSystemResource(file);

        MediaType contentType = probeContentType(file);

        // Images render inline (the chat shows them in the thread); documents download.
        // "attachment" for anything non-image also stops a crafted upload from being
        // rendered as HTML in the site's own origin.
        String disposition = (download || !contentType.getType().equals("image"))
                ? "attachment" : "inline";

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                // Stops a browser from second-guessing the declared type and, say, running
                // an uploaded file as script.
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    private static MediaType probeContentType(Path file) {
        String probed;
        try {
            probed = Files.probeContentType(file);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        if (probed == null) {
            probed = CONTENT_TYPE_BY_EXTENSION.get(extensionOf(file));
        }
        if (probed == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(probed);
        } catch (org.springframework.http.InvalidMediaTypeException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    /** Lower-cased extension without the dot, or an empty string when there isn't one. */
    private static String extensionOf(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
