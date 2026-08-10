package com.sewasathi.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DeviceContextTest {

    private static final String CHROME_WIN =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    @Test
    void fingerprint_isStableForTheSameBrowserAndNetwork() {
        DeviceContext first = new DeviceContext(CHROME_WIN, "203.0.113.7");
        DeviceContext second = new DeviceContext(CHROME_WIN, "203.0.113.7");

        assertThat(first.fingerprint()).isEqualTo(second.fingerprint());
    }

    @Test
    void fingerprint_survivesAnAddressChangeWithinTheSameNetwork() {
        DeviceContext before = new DeviceContext(CHROME_WIN, "203.0.113.7");
        DeviceContext after = new DeviceContext(CHROME_WIN, "203.0.113.204");

        // A customer on mobile data gets a new address constantly; challenging on every
        // rotation would train them to approve codes reflexively.
        assertThat(before.fingerprint()).isEqualTo(after.fingerprint());
    }

    @Test
    void fingerprint_changesForADifferentNetwork() {
        DeviceContext home = new DeviceContext(CHROME_WIN, "203.0.113.7");
        DeviceContext elsewhere = new DeviceContext(CHROME_WIN, "198.51.100.7");

        assertThat(home.fingerprint()).isNotEqualTo(elsewhere.fingerprint());
    }

    @Test
    void fingerprint_changesForADifferentBrowser() {
        DeviceContext chrome = new DeviceContext(CHROME_WIN, "203.0.113.7");
        DeviceContext firefox = new DeviceContext(
                "Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0", "203.0.113.7");

        assertThat(chrome.fingerprint()).isNotEqualTo(firefox.fingerprint());
    }

    @Test
    void fingerprint_isAHexDigestThatNeverLeaksTheRawAddress() {
        DeviceContext device = new DeviceContext(CHROME_WIN, "203.0.113.7");

        assertThat(device.fingerprint()).matches("[0-9a-f]{64}");
        assertThat(device.fingerprint()).doesNotContain("203.0.113");
    }

    @Test
    void coarsenIp_handlesIpv4Ipv6AndJunk() {
        assertThat(DeviceContext.coarsenIp("203.0.113.7")).isEqualTo("203.0.113");
        assertThat(DeviceContext.coarsenIp("2001:db8:85a3:8d3:1319:8a2e:370:7348"))
                .isEqualTo("2001:db8:85a3:8d3");
        assertThat(DeviceContext.coarsenIp("")).isEmpty();
        assertThat(DeviceContext.coarsenIp(null)).isEmpty();
        // Not a recognisable address - passed through rather than mangled.
        assertThat(DeviceContext.coarsenIp("garbage")).isEqualTo("garbage");
    }

    @Test
    void label_describesCommonBrowserAndOsCombinations() {
        assertThat(new DeviceContext(CHROME_WIN, "1.1.1.1").label()).isEqualTo("Chrome on Windows");
        assertThat(new DeviceContext(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", "1.1.1.1").label())
                .isEqualTo("Safari on iOS");
        assertThat(new DeviceContext(
                "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0", "1.1.1.1").label())
                .isEqualTo("Edge on Windows");
        assertThat(new DeviceContext("", "1.1.1.1").label()).isEqualTo("Unknown browser on Unknown OS");
    }
}
