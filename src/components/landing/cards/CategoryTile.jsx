import { Link } from 'react-router-dom';
import { categoryImage } from '../../../constants/categoryImages';
import { DUMMY_IMAGE } from '../../../utils/format';

/*
  "Experiences for every moment" tile — background photo + scrim + title,
  links to that category's experiences (app CategoryTile).
*/
export default function CategoryTile({ cat, width = 120, height = 156 }) {
  return (
    <Link
      to={`/experiences?categoryIds=${cat.id}`}
      className="group relative block rounded-xl overflow-hidden bg-[#DCE0E6] focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand"
      style={{ width, height }}
    >
      <img src={categoryImage(cat.slug, cat.name)} onError={(e) => { if (e.currentTarget.src !== DUMMY_IMAGE) e.currentTarget.src = DUMMY_IMAGE; }} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition duration-700" />
      <div className="rc-scrim absolute inset-0" />
      <span className="absolute left-2 right-2 bottom-2.5 text-white text-sm font-extrabold leading-tight line-clamp-2">{cat.name}</span>
    </Link>
  );
}
