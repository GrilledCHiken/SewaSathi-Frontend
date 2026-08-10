package com.sewasathi.service;

import jakarta.servlet.http.HttpServletRequest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * The device details of an incoming sign-in, extracted at the controller edge so the service
 * layer stays free of servlet types (and stays unit-testable).
 */
public record DeviceContext(String userAgent, String ipAddress) {

    public static DeviceContext from(HttpServletRequest request) {
        // X-Forwarded-For is only meaningful behind a proxy that sets it. Trust the first
        // entry when present, otherwise fall back to the socket address.
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();

        String agent = request.getHeader("User-Agent");
        return new DeviceContext(agent == null ? "" : agent, ip == null ? "" : ip);
    }

    /**
     * Stable identifier for this browser-on-network combination. The IP is coarsened to its
     * network prefix first: on mobile data the exact address changes constantly, and
     * challenging every sign-in trains people to approve codes reflexively.
     */
    public String fingerprint() {
        String material = userAgent + "|" + coarsenIp(ipAddress);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by the JDK; unreachable in practice.
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** IPv4 -> first three octets; IPv6 -> first four groups. */
    static String coarsenIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return "";
        }
        if (ip.contains(":")) {
            String[] groups = ip.split(":");
            return String.join(":", java.util.Arrays.copyOf(groups, Math.min(4, groups.length)));
        }
        String[] octets = ip.split("\\.");
        return octets.length == 4 ? octets[0] + "." + octets[1] + "." + octets[2] : ip;
    }

    /**
     * Best-effort "Chrome on Windows" summary for the alert email. Deliberately crude - it
     * only has to help a person recognise their own device, not identify it precisely.
     */
    public String label() {
        String browser = "Unknown browser";
        if (userAgent.contains("Edg/")) {
            browser = "Edge";
        } else if (userAgent.contains("Chrome/") && !userAgent.contains("Chromium")) {
            browser = "Chrome";
        } else if (userAgent.contains("Firefox/")) {
            browser = "Firefox";
        } else if (userAgent.contains("Safari/")) {
            browser = "Safari";
        }

        String os = "Unknown OS";
        if (userAgent.contains("Windows")) {
            os = "Windows";
        } else if (userAgent.contains("Android")) {
            os = "Android";
        } else if (userAgent.contains("iPhone") || userAgent.contains("iPad")) {
            os = "iOS";
        } else if (userAgent.contains("Mac OS")) {
            os = "macOS";
        } else if (userAgent.contains("Linux")) {
            os = "Linux";
        }

        return browser + " on " + os;
    }
}
