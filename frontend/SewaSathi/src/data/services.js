// Presentation details for the service catalogue — an icon and a line of copy
// per category.
//
// This file used to hold the catalogue itself, including per-service ratings,
// review counts, task counts and worker counts, all invented. Those figures now
// come from GET /api/public/services, counted from the database, so what is left
// here is only what a database cannot supply: which glyph to draw and how to
// describe the work.
//
// The keys are the category names the backend publishes (ServiceCategories in
// the API, SERVICE_CATEGORIES in utils/taskValidation.js). A category with no
// entry here still renders — see serviceDisplay below.

export const SERVICE_DISPLAY = {
  "Furniture Assembly": {
    icon: "furniture",
    description: "Expert assembly for beds, desks, shelves, and more.",
  },
  Mounting: {
    icon: "mounting",
    description: "TVs, shelves, art, and fixtures mounted securely.",
  },
  Cleaning: {
    icon: "cleaning",
    description: "Deep cleaning and regular upkeep for every room.",
  },
  "Moving Help": {
    icon: "moving",
    description: "Loading, unloading, and heavy lifting assistance.",
  },
  Gardening: {
    icon: "services",
    description: "Planting, pruning, and keeping your garden in shape.",
  },
  "Delivery Help": {
    icon: "moving",
    description: "Pickups and drop-offs handled across the valley.",
  },
  Painting: {
    icon: "painting",
    description: "Interior and exterior painting with a clean finish.",
  },
  Electrician: {
    icon: "electrical",
    description: "Wiring, outlets, and lighting installations.",
  },
  Plumbing: {
    icon: "plumbing",
    description: "Leaks, fixtures, and pipe repairs done right.",
  },
  "Outdoor Help": {
    icon: "services",
    description: "Yard work, clearing, and jobs that belong outside.",
  },
  "Heavy Lifting": {
    icon: "moving",
    description: "An extra pair of hands for anything too heavy alone.",
  },
  "Home Repair": {
    icon: "handyman",
    description: "General repairs and small home improvement tasks.",
  },
  "Office Support": {
    icon: "book",
    description: "Setup, organising, and errands for your workplace.",
  },
  Other: {
    icon: "handyman",
    description: "Something else? Describe it and get matched.",
  },
};

/**
 * Icon and copy for a category, with a working fallback.
 *
 * The catalogue is defined by the API, not by this file, so a category added on
 * the server must still render here rather than crashing the grid. It gets the
 * generic handyman glyph until someone writes it a line.
 */
export function serviceDisplay(name) {
  return (
    SERVICE_DISPLAY[name] ?? {
      icon: "handyman",
      description: "Book a verified professional for this task.",
    }
  );
}
