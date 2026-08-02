package com.sewasathi.service;

import java.util.List;
import java.util.Set;

/**
 * The service catalogue: the categories a task may be posted under.
 *
 * <p>This used to live as a private constant inside {@link TaskService}, where it did one job -
 * rejecting an unknown category on the way in. The public pages now publish the same list, so it
 * sits here instead of being copied. A duplicate would drift, and the visible symptom would be a
 * catalogue advertising a category the post-a-task form refuses to accept.
 *
 * <p>{@link #ORDERED} keeps the display order used by SERVICE_CATEGORIES in the frontend's
 * {@code utils/taskValidation.js}; {@link #ALLOWED} is the same values as a set, for validation.
 */
public final class ServiceCategories {

    /** Display order, matching the post-a-task dropdown. */
    public static final List<String> ORDERED = List.of(
            "Furniture Assembly", "Mounting", "Cleaning", "Moving Help", "Gardening",
            "Delivery Help", "Painting", "Electrician", "Plumbing", "Outdoor Help",
            "Heavy Lifting", "Home Repair", "Office Support", "Other");

    /** The same categories, for membership checks. */
    public static final Set<String> ALLOWED = Set.copyOf(ORDERED);

    private ServiceCategories() {
    }
}
