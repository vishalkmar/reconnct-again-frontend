import PwaUsersPage from './PwaUsersPage.jsx';

// Salespeople admin CRUD — handed off to the shared PwaUsersPage component
// that already powers Auditors and Officers.
export default function SalespeoplePage() {
  return <PwaUsersPage resource="salespersons" />;
}
