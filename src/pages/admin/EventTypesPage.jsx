import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function EventTypesPage() {
  return (
    <TaxonomyManager
      resource="event-types"
      title="Event Types"
      subtitle="Categories of events (Concert, Workshop, Cricket Box, …). Mark sport-type to enable hour-slot booking on the public detail page."
      labels={{ singular: 'event type', plural: 'event types' }}
      extraFields={[
        {
          name: 'isSport',
          label: 'Sport / slot-bookable',
          type: 'checkbox',
          help: 'Events of this type get an hour-by-hour slot booking widget.',
        },
      ]}
      color="brand"
    />
  );
}
