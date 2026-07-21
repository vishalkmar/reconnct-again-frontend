import { Navigate } from 'react-router-dom';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';
import TeamDashboardPage from '../../pages/team/TeamDashboardPage.jsx';
import { hasDashboard, teamLandingPath } from './teamNav.js';

// /team → wherever this role actually starts.
export function TeamLanding() {
  const { member } = useTeamAuth();
  return <Navigate to={teamLandingPath(member)} replace />;
}

// /team/dashboard → the real page, or bounced for the roles that have none
// (so an old bookmark or link can't strand them on a screen they don't use).
export default function TeamDashboardGate() {
  const { member } = useTeamAuth();
  if (!hasDashboard(member)) return <Navigate to={teamLandingPath(member)} replace />;
  return <TeamDashboardPage />;
}
