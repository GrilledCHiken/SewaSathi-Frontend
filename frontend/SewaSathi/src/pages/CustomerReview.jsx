import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { createReview, listMyReviews, listReviewableTasks } from "../api/reviewApi";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import Card, { Panel } from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import SegmentedControl from "../components/ui/SegmentedControl";
import { Field, Select, Textarea, CharCount } from "../components/ui/Field";
import { SkeletonCard } from "../components/ui/Skeleton";
import { initialsOf, paletteFor } from "../components/tasks/taskUi.jsx";
import { PlusIcon, StarIcon, XIcon } from "../components/ui/icons";

const MAX_REVIEW_LENGTH = 500;

const STAR_FILTERS = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];

function StarDisplay({ rating, size = "h-4 w-4" }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={`${size} ${
            i < Math.floor(rating)
              ? "text-amber-400"
              : i < rating
                ? "text-amber-300"
                : "text-line-strong"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Rating input. Scaled up from the original so it reads as the primary control
 * on the form rather than an afterthought beside the textarea.
 */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }, (_, i) => {
          const star = i + 1;
          const filled = star <= shown;
          return (
            <button
              key={star}
              type="button"
              className="rounded-field p-0.5 transition duration-200 ease-spring hover:scale-110 motion-reduce:hover:scale-100 focus-ring"
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(0)}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              aria-pressed={star === value}
            >
              <svg
                className={`h-9 w-9 transition-colors sm:h-10 sm:w-10 ${
                  filled ? "text-amber-400" : "text-line-strong"
                }`}
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>
      <span
        className={`text-sm font-semibold ${value > 0 ? "text-ink" : "text-ink-faint"}`}
        aria-live="polite"
      >
        {value > 0 ? `${value}.0` : "Tap a star"}
      </span>
    </div>
  );
}

function ReviewCard({ review }) {
  const palette = paletteFor(review.worker?.id);

  return (
    <Card padding="lg">
      <div className="flex gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${palette.bg} ${palette.text}`}
        >
          {initialsOf(review.worker.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-bold text-ink">{review.worker.fullName}</h3>
            <span className="text-sm text-ink-faint">
              {review.createdAt ? review.createdAt.slice(0, 10) : ""}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StarDisplay rating={review.rating} />
            <span className="text-sm font-semibold text-ink-body">
              {review.rating}.0
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-muted">
        Task: <span className="text-ink-body">{review.taskTitle}</span>
      </p>
      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-ink-body">
          {review.comment}
        </p>
      )}
    </Card>
  );
}

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
    <PageShell
      header={<DashboardHeader title="Reviews" searchPlaceholder="Search workers..." />}
      width="md"
    >
      <PageHeader
        title="My Reviews"
        description="Manage your reviews and ratings for completed tasks."
        actions={
          showForm ? (
            <Button
              variant="secondary"
              onClick={closeForm}
              iconLeft={<XIcon className="h-4 w-4" />}
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={openForm}
              disabled={reviewableTasks.length === 0}
              iconLeft={<PlusIcon className="h-4 w-4" />}
            >
              Write a Review
            </Button>
          )
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="mt-6">
          <Panel title="Write a review" padding="lg">
            <Field id="completed-task" label="Select Completed Task">
              {(field) => (
                <Select
                  {...field}
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  {reviewableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} — {task.worker?.fullName}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {selectedTask && (
              <div className="mt-5 rounded-card border border-line bg-surface-muted p-5 sm:p-6">
                <h3 className="text-lg font-bold text-ink">
                  Rate Your Experience
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  How was working with {selectedTask.worker?.fullName} on &apos;
                  {selectedTask.title}&apos;?
                </p>

                <div className="mt-4">
                  <StarPicker value={rating} onChange={setRating} />
                </div>

                <Field
                  id="review-text"
                  label="Your Review"
                  className="mt-6"
                  error={formError || undefined}
                  labelSuffix={
                    <CharCount value={reviewText} max={MAX_REVIEW_LENGTH} />
                  }
                >
                  {(field) => (
                    <Textarea
                      {...field}
                      value={reviewText}
                      onChange={(e) => {
                        setReviewText(e.target.value.slice(0, MAX_REVIEW_LENGTH));
                        setFormError("");
                      }}
                      rows={5}
                      placeholder="Share details about your experience. What went well? What could improve?"
                    />
                  )}
                </Field>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button type="submit" loading={submitting}>
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        </form>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-ink-muted">Average Rating</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">
            {stats.avg}
          </p>
          <div className="mt-2">
            <StarDisplay rating={Number(stats.avg)} />
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-ink-muted">Total Reviews</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">
            {stats.total}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-ink-muted">Positive Reviews</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">
            {stats.positive}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-ink-muted">Tasks to Review</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink">
            {stats.tasksToReview}
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <SegmentedControl
          options={STAR_FILTERS}
          value={starFilter}
          onChange={setStarFilter}
          size="sm"
          ariaLabel="Filter reviews by rating"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-4" role="status" aria-label="Loading your reviews">
            <SkeletonCard lines={2} showTile={false} />
            <SkeletonCard lines={2} showTile={false} />
          </div>
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            icon={<StarIcon className="h-6 w-6" />}
            title={reviews.length === 0 ? "No reviews yet" : "Nothing matches this filter"}
            body={
              reviews.length === 0
                ? "Once a task is completed you can rate the worker here."
                : "Try a different star rating."
            }
          />
        ) : (
          <ul className="space-y-4">
            {filteredReviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
