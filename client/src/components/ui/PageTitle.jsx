import { useEffect } from 'react';

export default function PageTitle({ title }) {
  useEffect(() => {
    document.title = title ? `${title} — OCS` : 'Garments Costing System';
    return () => { document.title = 'Garments Costing System'; };
  }, [title]);
  return null;
}
