/*
  Which team roles get a dashboard, and where each role starts.

  Center Ops and QCOPS work a single queue each — their queue IS the landing
  page, so a summary screen in front of it was only an extra click. Every other
  role (BD, Account Manager, CSM) keeps theirs, because their boards aggregate
  across suppliers/customers rather than being one list.

  Plain module (no components) so the layout can ask these questions without
  pulling the dashboard page into its bundle.
*/
const NO_DASHBOARD_ROLES = ['cops', 'qcops'];

export const hasDashboard = (member) => !NO_DASHBOARD_ROLES.includes(member?.roleType);

export const teamLandingPath = (member) => {
  if (member?.roleType === 'qcops') return '/team/qc-visits';
  if (member?.roleType === 'cops') return '/team/review-queue';
  return '/team/dashboard';
};
