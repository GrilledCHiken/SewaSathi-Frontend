package com.sewasathi.service;

import com.sewasathi.exception.InvalidOperationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The declared content type is supplied by the client and is trivially forged, so the
 * upload allowlist only means something if the bytes are checked against it.
 */
class FileStorageServiceTest {

    private static final byte[] PNG_HEADER = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
    private static final byte[] JPEG_HEADER = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0};
    private static final byte[] PDF_HEADER = {0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37};

    private static MockMultipartFile file(String contentType, byte[] content) {
        return new MockMultipartFile("file", "upload.bin", contentType, content);
    }

    @Test
    void acceptsFilesWhoseBytesMatchTheirDeclaredType() {
        assertThatCode(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/png", PNG_HEADER), "image/png")).doesNotThrowAnyException();
        assertThatCode(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/jpeg", JPEG_HEADER), "image/jpeg")).doesNotThrowAnyException();
        assertThatCode(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("application/pdf", PDF_HEADER), "application/pdf")).doesNotThrowAnyException();
    }

    @Test
    void rejectsAnExecutableMasqueradingAsAnImage() {
        // "MZ..." - a Windows executable relabelled as a PNG. Previously stored without
        // complaint, because only the client's own content-type header was consulted.
        byte[] exe = {0x4D, 0x5A, (byte) 0x90, 0x00, 0x03, 0x00, 0x00, 0x00};

        assertThatThrownBy(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/png", exe), "image/png"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("do not match its declared type");
    }

    @Test
    void rejectsHtmlMasqueradingAsAnImage() {
        // An HTML file served from the app's own origin is an XSS vector.
        byte[] html = "<html><script>alert(1)</script>".getBytes();

        assertThatThrownBy(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/jpeg", html), "image/jpeg"))
                .isInstanceOf(InvalidOperationException.class);
    }

    @Test
    void rejectsAPdfRelabelledAsAPng() {
        assertThatThrownBy(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/png", PDF_HEADER), "image/png"))
                .isInstanceOf(InvalidOperationException.class);
    }

    @Test
    void rejectsAnEmptyOrTruncatedFile() {
        assertThatThrownBy(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/png", new byte[]{(byte) 0x89}), "image/png"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("empty or truncated");
    }

    @Test
    void plainTextIsExemptBecauseItHasNoSignature() {
        assertThatCode(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("text/plain", "just some notes".getBytes()), "text/plain"))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsWebpOnlyWhenBothRiffAndWebpMarkersArePresent() {
        byte[] webp = {0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50};
        byte[] riffButNotWebp = {0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20};

        assertThatCode(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/webp", webp), "image/webp")).doesNotThrowAnyException();
        assertThatThrownBy(() -> FileStorageService.assertContentMatchesDeclaredType(
                file("image/webp", riffButNotWebp), "image/webp"))
                .isInstanceOf(InvalidOperationException.class);
    }
}
