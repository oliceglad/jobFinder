import { useSelector } from "react-redux";

export default function GlobalStatus() {
  const isFetching = useSelector((state) =>
    Object.values(state.api.queries).some((query) => query?.status === "pending")
  );
  const isMutating = useSelector((state) =>
    Object.values(state.api.mutations).some((mutation) => mutation?.status === "pending")
  );

  if (!isFetching && !isMutating) return null;

  return (
    <div className="global-loading-backdrop">
      <div className="global-loading-card">
        <span className="spinner" />
        Загрузка…
      </div>
    </div>
  );
}
