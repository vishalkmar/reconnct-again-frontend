import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function NearbyPlacesPage() {
  return (
    <TaxonomyManager
      resource="nearby-places"
      title="Nearby Places"
      subtitle="Master list of nearby places (Beach, Temple, Cafe street, …). Selectable on each Hotel to show on its detail page."
      labels={{ singular: 'nearby place', plural: 'nearby places' }}
      color="brand"
    />
  );
}
