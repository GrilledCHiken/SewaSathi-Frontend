// Shared service catalogue for the marketing pages (Home + Services).
//
// POPULAR_SERVICES and ALL_SERVICES are intentionally two separate lists:
// they differ in both membership (Handyman vs Gardening) and naming
// ("Mounting" vs "Mounting & Installation"). Keep them separate so the two
// pages stay independent.

// The first two entries carry `featured` plus proof metrics — Home renders
// them as the wide cards at the top of its bento grid.
export const POPULAR_SERVICES = [
  {
    name: "Furniture Assembly",
    description: "Expert assembly for beds, desks, shelves, and more.",
    icon: "furniture",
    featured: true,
    rating: 4.9,
    reviews: 420,
    workers: 42,
  },
  {
    name: "Home Cleaning",
    description: "Deep cleaning and regular upkeep for every room.",
    icon: "cleaning",
    featured: true,
    rating: 4.8,
    reviews: 610,
    workers: 58,
  },
  {
    name: "Mounting",
    description: "TVs, shelves, art, and fixtures mounted securely.",
    icon: "mounting",
  },
  {
    name: "Moving Help",
    description: "Loading, unloading, and heavy lifting assistance.",
    icon: "moving",
  },
  {
    name: "Plumbing",
    description: "Leaks, fixtures, and pipe repairs done right.",
    icon: "plumbing",
  },
  {
    name: "Electrical",
    description: "Wiring, outlets, and lighting installations.",
    icon: "electrical",
  },
  {
    name: "Handyman",
    description: "General repairs and small home improvement tasks.",
    icon: "handyman",
  },
  {
    name: "Painting",
    description: "Interior and exterior painting with a clean finish.",
    icon: "painting",
  },
];

export const ALL_SERVICES = [
  {
    name: "Furniture Assembly",
    category: "Furniture",
    rating: 4.9,
    reviews: 420,
    tasks: 1600,
    workers: 42,
    icon: "furniture",
  },
  {
    name: "Home Cleaning",
    category: "Cleaning",
    rating: 4.8,
    reviews: 610,
    tasks: 2400,
    workers: 58,
    icon: "cleaning",
  },
  {
    name: "Mounting & Installation",
    category: "Mounting",
    rating: 4.9,
    reviews: 330,
    tasks: 1300,
    workers: 37,
    icon: "mounting",
  },
  {
    name: "Moving Help",
    category: "Moving",
    rating: 4.7,
    reviews: 280,
    tasks: 1100,
    workers: 29,
    icon: "moving",
  },
  {
    name: "Gardening",
    category: "Outdoor",
    rating: 4.6,
    reviews: 150,
    tasks: 540,
    workers: 18,
    icon: "services",
  },
  {
    name: "Plumbing",
    category: "Plumbing",
    rating: 4.8,
    reviews: 390,
    tasks: 1500,
    workers: 33,
    icon: "plumbing",
  },
  {
    name: "Electrical Work",
    category: "Electrical",
    rating: 4.8,
    reviews: 365,
    tasks: 1400,
    workers: 31,
    icon: "electrical",
  },
  {
    name: "Painting",
    category: "Painting",
    rating: 4.7,
    reviews: 210,
    tasks: 820,
    workers: 24,
    icon: "painting",
  },
];

export const FILTER_TAGS = ["Cleaning", "Furniture", "Plumbing", "Moving", "Electrical"];
