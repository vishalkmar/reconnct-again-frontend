import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function RoomViewsPage() {
  return (
    <TaxonomyManager
      resource="room-views"
      title="Room Views"
      subtitle="Master list of room views (Sea View, Garden View, Mountain View, …). Used on hotel filter sidebar and room form."
      labels={{ singular: 'room view', plural: 'room views' }}
      color="brand"
    />
  );
}
