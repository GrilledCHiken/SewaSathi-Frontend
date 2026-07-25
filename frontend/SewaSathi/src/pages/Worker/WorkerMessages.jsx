import WorkerHeader from "../../components/Worker/WorkerHeader";
import ChatPage from "../../components/Chat/ChatPage";

export default function WorkerMessages() {
  return <ChatPage renderHeader={() => <WorkerHeader title="Messages" />} />;
}
