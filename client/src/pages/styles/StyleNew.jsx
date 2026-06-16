import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { X, Plus, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { asArray } from '../../lib/api';

const PRESET_SIZES = {
  "Kids (Children's)": ['3Y-4Y', '5Y-6Y', '7Y-8Y', '9Y-10Y', '11Y-12Y', '13Y-14Y', '15Y-16Y'],
  'Adults (Standard)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Adults (Numeric)': ['34', '36', '38', '40', '42', '44', '46'],
  "Kids (Next Style)": ['3Y-6Y', '7Y-10Y', '11Y-14Y', '15Y-16Y'],
};

export default function StyleNew() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState([]);
  const [factories, setFactories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [customSize, setCustomSize] = useState('');
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    Promise.all([api.get('/buyers'), api.get('/factories')])
      .then(([b, f]) => {
        setBuyers(asArray(b.data));
        setFactories(asArray(f.data));
      })
      .catch(() => toast.error('Failed to load buyers/factories'));
  }, []);

  const toggleSize = (s) => setSizes((prev) =>
    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
  );

  const addCustom = () => {
    const s = customSize.trim().toUpperCase();
    if (s && !sizes.includes(s)) { setSizes((prev) => [...prev, s]); }
    setCustomSize('');
  };

  const onSubmit = async (data) => {
    if (sizes.length === 0) { toast.error('Select at least one size'); return; }
    setSaving(true);
    try {
      const res = await api.post('/styles', { ...data, packOf: Number(data.packOf) || 1, sizes });
      toast.success('Style created!');
      navigate(`/styles/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create style');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <LayoutGrid size={17} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-none">New Style</h1>
          <p className="text-xs text-slate-400 mt-0.5">Define style details and size range</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Style Info */}
        <div className="card">
          <div className="card-header"><h2 className="section-title">Style Information</h2><span className="text-xs text-slate-400">Fields marked * are required</span></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div>
              <label className="label">Style Number *</label>
              <input {...register('styleNo', { required: 'Required' })} className="input" placeholder="e.g. YESS6444" />
              {errors.styleNo && <p className="text-red-500 text-xs mt-1">{errors.styleNo.message}</p>}
            </div>
            <div>
              <label className="label">Department</label>
              <input {...register('department')} className="input" placeholder="e.g. Older Boy's" />
            </div>
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input {...register('description', { required: 'Required' })} className="input" placeholder="e.g. GREEN & WHITE COLOUR BLOCK FUNNEL NECK" />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="label">Buyer</label>
              <select {...register('buyerId')} className="input">
                <option value="">-- Select Buyer --</option>
                {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Factory</label>
              <select {...register('factoryId')} className="input">
                <option value="">-- Select Factory --</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <input {...register('category')} className="input" placeholder="e.g. Sweater, T-Shirt..." />
            </div>
            <div>
              <label className="label">Season</label>
              <input {...register('season')} className="input" placeholder="e.g. AW25" />
            </div>
            <div>
              <label className="label">Pack Of</label>
              <input {...register('packOf')} type="number" defaultValue={1} className="input" />
            </div>
          </div>
        </div>

        {/* Size Declaration */}
        <div className="card">
          <div className="card-header">
            <h2 className="section-title">Size Declaration</h2>
            <span className="text-xs text-gray-400">Select all sizes for this style</span>
          </div>
          <div className="card-body space-y-4">
            {Object.entries(PRESET_SIZES).map(([group, sizeList]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-slate-500 mb-2">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {sizeList.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        sizes.includes(s)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom size */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Custom Size</p>
              <div className="flex gap-2">
                <input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                  placeholder="e.g. 2XL, 0-3M..."
                  className="input w-40"
                />
                <button type="button" onClick={addCustom} className="btn-secondary btn-sm">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Selected sizes */}
            {sizes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Selected Sizes ({sizes.length})</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <span key={s} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {s}
                      <button type="button" onClick={() => toggleSize(s)} className="hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Creating...' : 'Create Style'}
          </button>
          <button type="button" onClick={() => navigate('/styles')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
