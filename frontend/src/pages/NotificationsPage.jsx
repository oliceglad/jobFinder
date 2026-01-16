import { useMarkNotificationReadMutation, useNotificationsQuery } from "../app/api.js";
import useToast from "../components/useToast.js";

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const { notify } = useToast();

  return (
    <div className="card">
      <h3>Уведомления</h3>
      <div className="list">
        {notifications.map((notification) => (
          <div className="list-item" key={notification.id}>
            <div>
              <h4>{notification.title}</h4>
              <p className="muted">{notification.body}</p>
            </div>
            <button
              className="ghost"
              onClick={() =>
                markRead(notification.id)
                  .unwrap()
                  .then(() => notify("Уведомление отмечено", "success"))
              }
            >
              {notification.read_at ? "Прочитано" : "Отметить"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
