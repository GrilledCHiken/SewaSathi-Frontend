package com.sewasathi.service;

import java.util.List;
import java.util.Set;

/**
 * The service catalogue: the categories a task may be posted under.
 *
 * <p>Shared by {@link TaskService}, which rejects unknown categories, and the public pages,
 * which publish the list - a duplicate would drift into advertising a category the post-a-task
 * form refuses. {@link #ORDERED} keeps the display order used by SERVICE_CATEGORIES in the
 * frontend's {@code utils/taskValidation.js}; {@link #ALLOWED} is the same values as a set.
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
