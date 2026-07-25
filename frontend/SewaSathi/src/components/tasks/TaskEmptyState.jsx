export default function TaskEmptyState({ icon, title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      {icon && (
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
