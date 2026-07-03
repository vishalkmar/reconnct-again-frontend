import UserSupportPage from '../user/UserSupportPage.jsx';

// Host support chat — the exact same real-time thread component as the traveller
// one, but on the SUPPLIER queue, so it lands in the admin's "Supplier support"
// tab and mirrors the app's host Inbox.
export default function HostSupportPage() {
  return <UserSupportPage queue="supplier" />;
}
