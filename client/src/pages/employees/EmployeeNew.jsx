import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  joiningDate: z.string().min(1, 'Joining date required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  nid: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  basicSalary: z.string().optional(),
  houseRent: z.string().optional(),
  medicalAllowance: z.string().optional(),
  transportAllowance: z.string().optional(),
  mobileBill: z.string().optional(),
  taxDeduction: z.string().optional(),
  otherDeductions: z.string().optional(),
});

export default function EmployeeNew() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { joiningDate: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (data) => {
    const { emergencyName, emergencyPhone, bankName, accountNo, basicSalary, houseRent, medicalAllowance, transportAllowance, mobileBill, taxDeduction, otherDeductions, ...rest } = data;

    try {
      const res = await api.post('/employees', {
        ...rest,
        emergencyContact: emergencyName ? { name: emergencyName, phone: emergencyPhone } : {},
        bankDetails: bankName ? { bankName, accountNo } : {},
      });

      // Add initial salary structure if provided
      if (basicSalary) {
        await api.post(`/employees/${res.data.id}/salary`, {
          effectiveFrom: data.joiningDate,
          basicSalary, houseRent: houseRent || '0',
          medicalAllowance: medicalAllowance || '0',
          transportAllowance: transportAllowance || '0',
          mobileBill: mobileBill || '0',
          taxDeduction: taxDeduction || '0',
          otherDeductions: otherDeductions || '0',
        });
      }

      toast.success(`Employee ${res.data.employeeCode} created`);
      navigate(`/employees/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon"><ArrowLeft size={16} /></button>
        <h1 className="text-xl font-bold text-slate-900">New Employee</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Full Name *</label>
              <input {...register('name')} className="input" placeholder="Full name" />
              {errors.name && <p className="field-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="field-label">Joining Date *</label>
              <input {...register('joiningDate')} type="date" className="input" />
              {errors.joiningDate && <p className="field-error">{errors.joiningDate.message}</p>}
            </div>
            <div>
              <label className="field-label">Designation</label>
              <input {...register('designation')} className="input" placeholder="e.g. Merchandiser" />
            </div>
            <div>
              <label className="field-label">Department</label>
              <input {...register('department')} className="input" placeholder="e.g. Merchandising" />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input {...register('phone')} className="input" placeholder="+880…" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input {...register('email')} type="email" className="input" />
            </div>
            <div>
              <label className="field-label">NID / Passport</label>
              <input {...register('nid')} className="input" />
            </div>
          </div>
          <div>
            <label className="field-label">Address</label>
            <textarea {...register('address')} className="input" rows={2} />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Emergency Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Name</label>
              <input {...register('emergencyName')} className="input" />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input {...register('emergencyPhone')} className="input" />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Bank Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Bank Name</label>
              <input {...register('bankName')} className="input" />
            </div>
            <div>
              <label className="field-label">Account No</label>
              <input {...register('accountNo')} className="input" />
            </div>
          </div>
        </div>

        {/* Initial Salary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Initial Salary Structure (optional)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="field-label">Basic Salary</label>
              <input {...register('basicSalary')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">House Rent</label>
              <input {...register('houseRent')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Medical Allow.</label>
              <input {...register('medicalAllowance')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Transport Allow.</label>
              <input {...register('transportAllowance')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Mobile Bill</label>
              <input {...register('mobileBill')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Tax Deduction</label>
              <input {...register('taxDeduction')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Other Deductions</label>
              <input {...register('otherDeductions')} className="input" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Creating…' : 'Create Employee'}</button>
        </div>
      </form>
    </div>
  );
}
