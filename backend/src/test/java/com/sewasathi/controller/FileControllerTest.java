package com.sewasathi.controller;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.FileAccessService;
import com.sewasathi.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * The admin verification queue shows identity documents in a viewer rather than downloading
 * them, and a blob fetch decides between rendering and saving purely from the response's
 * content type. {@code Files.probeContentType} is platform-dependent - on Windows it reads the
 * registry and often answers null - so an unrecognised PDF would come back as
 * {@code application/octet-stream}, which the {@code nosniff} header turns into a download.
 * These tests pin the extension fallback that prevents that.
 */
@ExtendWith(MockitoExtension.class)
class FileControllerTest {

    @Mock private FileStorageService fileStorageService;
    @Mock private FileAccessService fileAccessService;

    private FileController fileController;
    private UserPrincipal admin;

    @TempDir Path uploadDir;

    @BeforeEach
    void setUp() {
        fileController = new FileController(fileStorageService, fileAccessService);
        admin = new UserPrincipal(User.builder().id(1L).email("admin@example.com")
                .fullName("Admin").phone("9800000000")
                .role(Role.ADMIN).status(ApprovalStatus.APPROVED).build());
    }

    private ResponseEntity<Resource> serve(String filename, boolean download) throws IOException {
        Path file = uploadDir.resolve(filename);
        Files.writeString(file, "contents");
        when(fileStorageService.resolveForRead(filename)).thenReturn(file);
        return fileController.download(filename, download, admin);
    }

    @Test
    void pdf_isServedAsPdfSoTheViewerCanRenderIt() throws IOException {
        ResponseEntity<Resource> response = serve("a-police-clearance.pdf", false);

        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
    }

    @Test
    void image_isServedAsAnImage() throws IOException {
        ResponseEntity<Resource> response = serve("a-citizenship.jpg", false);

        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
    }

    @Test
    void unrecognisedExtension_fallsBackToOctetStream() throws IOException {
        ResponseEntity<Resource> response = serve("mystery.zzz", false);

        // Fail closed: an unknown type must not be declared as something a browser will render.
        assertThat(response.getHeaders().getContentType())
                .isEqualTo(MediaType.APPLICATION_OCTET_STREAM);
    }

    @Test
    void document_isStillOfferedAsAnAttachment() throws IOException {
        ResponseEntity<Resource> response = serve("a-police-clearance.pdf", false);

        // The viewer fetches bytes as a blob and ignores this header, so it stays "attachment" -
        // that is what stops a crafted upload from being rendered as HTML in the site's origin.
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .startsWith("attachment");
    }

    @Test
    void imageDownloadRequest_isForcedToAttachment() throws IOException {
        ResponseEntity<Resource> response = serve("a-citizenship.jpg", true);

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .startsWith("attachment");
    }

    @Test
    void image_isInlineWhenNotAskedToDownload() throws IOException {
        ResponseEntity<Resource> response = serve("a-citizenship.jpg", false);

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .startsWith("inline");
    }
}
