package com.sewasathi.service;

/**
 * The {@code customer_info} block Khalti prefills its checkout with, so the
 * customer does not retype what we already know about them.
 */
public record KhaltiCustomer(String name, String email, String phone) {
}
