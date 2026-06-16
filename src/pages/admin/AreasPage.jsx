import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function AreasPage() {
  return (
    <TaxonomyManager
      resource="areas"
      title="Areas"
      subtitle="Geographic areas / regions used as a package filter (e.g. North India, South India, Coastal, …)."
      labels={{ singular: 'area', plural: 'areas' }}
      color="brand"
    />
  );
}
