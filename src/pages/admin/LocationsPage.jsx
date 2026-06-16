import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function LocationsPage() {
  return (
    <TaxonomyManager
      resource="locations"
      title="Locations"
      subtitle="Master list of locations used by Hotels, Packages and Events. Powers the home-page search dropdown."
      labels={{ singular: 'location', plural: 'locations' }}
      extraFields={[
        { name: 'country', label: 'Country', placeholder: 'India, Thailand, etc.' },
      ]}
      color="brand"
    />
  );
}
