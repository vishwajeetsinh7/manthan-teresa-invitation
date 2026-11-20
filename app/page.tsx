import { Invitation } from "@/src/components/Invitation";
import { inviteFor } from "@/src/content/events";

/** the plain address: the card alone (the events open only from an invitation link: /i/<code>) */
export default function Home() {
  return <Invitation invite={inviteFor([])} />;
}
