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
        try {
            String probed = Files.probeContentType(file);
            return probed == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(probed);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (org.springframework.http.InvalidMediaTypeException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
