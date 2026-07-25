import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { createReview, listMyReviews, listReviewableTasks } from "../api/reviewApi";

const MAX_REVIEW_LENGTH = 500;

const STAR_FILTERS = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];

function StarDisplay({ rating, size = "h-4 w-4" }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${size} ${i < Math.floor(rating) ? "text-amber-400" : i < rating ? "text-amber-300" : "text-slate-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }, (_, i) => {
          const star = i + 1;
          const filled = star <= (hover || value);
          return (
            <button
              key={star}
              type="button"
              className="rounded p-0.5 transition hover:scale-110"
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <svg
                className={`h-8 w-8 sm:h-9 sm:w-9 ${filled ? "text-amber-400" : "text-slate-300"}`}
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>
      <span className="text-sm text-slate-500">
        {value > 0 ? `${value}.0` : "Tap a star"}
      </span>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
            {review.worker.fullName
              .split(" ")
              .filter(Boolean)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-semibold text-slate-900">{review.worker.fullName}</h3>
              <span className="text-sm text-slate-500">
                {review.createdAt ? review.createdAt.slice(0, 10) : ""}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StarDisplay rating={review.rating} />
              <span className="text-sm font-medium text-slate-700">
                {review.rating}.0
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Task: <span className="text-slate-600">{review.taskTitle}</span>
      </p>
      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{review.comment}</p>
      )}
    </article>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function CustomerReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [reviewableTasks, setReviewableTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    return Promise.all([listMyReviews(), listReviewableTasks()])
      .then(([reviewData, reviewableData]) => {
        setReviews(reviewData);
        setReviewableTasks(reviewableData);
        return reviewableData;
      })
      .catch(() => {
        toast.error("Could not load your reviews.");
        return [];
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData().then((reviewableData) => {
      const preselect = searchParams.get("taskId");
      if (preselect && reviewableData.some((t) => String(t.id) === preselect)) {
        setSelectedTaskId(preselect);
        setShowForm(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTask = reviewableTasks.find((t) => String(t.id) === selectedTaskId);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg =
      total > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
        : "0.0";
    const positive = reviews.filter((r) => r.rating >= 4).length;
    return { avg, total, positive, tasksToReview: reviewableTasks.length };
  }, [reviews, reviewableTasks]);

  const filteredReviews = useMemo(() => {
    if (starFilter === "All") return reviews;
    const stars = Number.parseInt(starFilter, 10);
    return reviews.filter((r) => r.rating === stars);
  }, [reviews, starFilter]);

  const closeForm = () => {
    setShowForm(false);
    setRating(0);
    setReviewText("");
    setFormError("");
    setSelectedTaskId("");
    if (searchParams.get("taskId")) {
      searchParams.delete("taskId");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const openForm = () => {
    setSelectedTaskId(reviewableTasks[0]?.id ? String(reviewableTasks[0].id) : "");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) {
      setFormError("Please select a completed task.");
      return;
    }
    if (!rating) {
      setFormError("Please select a star rating.");
      return;
    }
    if (!reviewText.trim()) {
      setFormError("Please write your review.");
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        taskId: Number(selectedTaskId),
        rating,
        comment: reviewText.trim(),
      });
      toast.success("Review submitted!");
      closeForm();
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                My Reviews
              </h2>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Manage your reviews and ratings for completed tasks.
              </p>
            </div>
            {showForm ? (
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={openForm}
                disabled={reviewableTasks.length === 0}
                className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Write a Review
              </button>
            )}
          </div>

          {/* Write review form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div>
                <label
                  htmlFor="completed-task"
                  className="mb-1.5 block text-sm font-medium text-slate-600"
                >
                  Select Completed Task
                </label>
                <select
                  id="completed-task"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className={`${inputClassName} border-2 border-slate-900`}
                >
                  {reviewableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} — {task.worker?.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTask && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    Rate Your Experience
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    How was working with {selectedTask.worker?.fullName} on &apos;
                    {selectedTask.title}&apos;?
                  </p>

                  <div className="mt-4">
                    <StarPicker value={rating} onChange={setRating} />
                  </div>

                  <div className="mt-6">
                    <label
                      htmlFor="review-text"
                      className="mb-1.5 block text-sm font-bold text-slate-900"
                    >
                      Your Review
                    </label>
                    <div className="relative">
                      <textarea
                        id="review-text"
                        value={reviewText}
                        onChange={(e) => {
                          setReviewText(e.target.value.slice(0, MAX_REVIEW_LENGTH));
                          setFormError("");
                        }}
                        rows={5}
                        placeholder="Share details about your experience. What went well? What could improve?"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 pb-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                      <span className="pointer-events-none absolute bottom-3 left-4 text-xs text-slate-400">
                        {reviewText.length}/{MAX_REVIEW_LENGTH}
                      </span>
                    </div>
                  </div>

                  {formError && (
                    <p className="mt-3 text-sm text-red-600">{formError}</p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Submit Review"}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Average Rating</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.avg}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StarDisplay rating={Number(stats.avg)} />
                <span className="text-sm font-medium text-slate-600">
                  {stats.avg}
                </span>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Reviews</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.total}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Positive Reviews</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.positive}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Tasks to Review</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.tasksToReview}
              </p>
            </article>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filter:</span>
            {STAR_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStarFilter(filter)}
                className={[
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  starFilter === filter
                    ? "bg-brand text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Reviews list */}
          <ul className="mt-6 space-y-4">
            {loading ? (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                Loading your reviews...
              </li>
            ) : filteredReviews.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                No reviews match this filter.
              </li>
            ) : (
              filteredReviews.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} />
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
