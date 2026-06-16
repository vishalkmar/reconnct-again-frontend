import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function FacilitiesPage() {
  return (
    <TaxonomyManager
      resource="facilities"
      title="Facilities"
      subtitle="Master list of facilities attached to Hotels and Rooms (Wi-Fi, Pool, Spa, Restaurant, …). Used on filter sidebars."
      labels={{ singular: 'facility', plural: 'facilities' }}
      extraFields={[
        { name: 'icon', label: 'Lucide icon name', placeholder: 'Wifi, Coffee, Utensils, …' },
      ]}
      color="brand"
    />
  );
}
