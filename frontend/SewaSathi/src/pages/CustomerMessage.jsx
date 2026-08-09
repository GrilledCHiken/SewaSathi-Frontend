import DashboardHeader from "../components/User/DashboardHeader";
import ChatPage from "../components/Chat/ChatPage";

export default function CustomerMessage() {
  return <ChatPage renderHeader={() => <DashboardHeader />} />;
}
