// src/components/admin/bulkupload.jsx
// Admin Bulk Upload — CSV/XLSX/JSON per entity, optional images ZIP,
// per-row error report with downloadable error CSV.
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  UploadCloud, Download, FileSpreadsheet, FileArchive, X, CheckCircle2,
  RefreshCw, AlertTriangle, Loader2, SkipForward, XCircle, PlusCircle,
} from 'lucide-react';
import { bulkApi, BULK_ENTITIES } from '../api/bulkapi';
import { useProductStore } from '../store/productstore';
import { useCategoryStore } from '../store/categorystore';
import { useBannerStore } from '../store/bannerstore';

const DATA_EXT = ['.csv', '.xlsx', '.xls', '.json'];
const MAX_DATA_BYTES = 5 * 1024 * 1024;   // 5MB data file
const MAX_ZIP_BYTES = 50 * 1024 * 1024;   // 50MB images zip (each image ≤10MB, checked server-side too)

const fmtMB = (b) => `${(b / 1024 / 1024).toFixed(1)}MB`;

export default function BulkUpload() {
  const [entity, setEntity] = useState('products');
  const [dataFile, setDataFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState(null);
  const [requestError, setRequestError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const dataInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const { fetchProducts } = useProductStore();
  const { fetchCategories } = useCategoryStore();
  const { fetchBanners } = useBannerStore();

  // ── Client-side file checks (level 1 of the 3-level limit) ────────────────
  const acceptDataFile = (f) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!DATA_EXT.some((e) => name.endsWith(e))) {
      toast.error(`"${f.name}" is not a CSV, Excel or JSON file`);
      return;
    }
    if (f.size > MAX_DATA_BYTES) {
      toast.error(`"${f.name}" is ${fmtMB(f.size)} — the data file limit is 5MB`);
      return;
    }
    setDataFile(f);
    setReport(null);
    setRequestError('');
  };

  const acceptZipFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.zip')) {
      toast.error(`"${f.name}" is not a .zip archive`);
      return;
    }
    if (f.size > MAX_ZIP_BYTES) {
      toast.error(`Images ZIP is ${fmtMB(f.size)} — the limit is 50MB (each image inside must be ≤10MB)`);
      return;
    }
    setZipFile(f);
  };

  const refetchEntity = () => {
    // Make new rows appear immediately in the existing admin tables.
    if (entity === 'products') fetchProducts({ limit: 100, includeInactive: true });
    if (entity === 'categories') fetchCategories();
    if (entity === 'banners') fetchBanners();
    // seasonal-sales pages fetch on mount via their own local loaders
  };

  const handleUpload = async () => {
    if (!dataFile || uploading) return;
    setUploading(true);
    setProgress(0);
    setReport(null);
    setRequestError('');
    try {
      const res = await bulkApi.upload(entity, dataFile, zipFile, setProgress);
      const data = res.data?.data || null;
      setReport(data);
      if (data?.summary?.failed === 0) toast.success(res.data?.message || 'Upload complete');
      else toast(`Completed with ${data?.summary?.failed ?? '?'} failed rows — see report`, { icon: '⚠️' });
      refetchEntity();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Upload failed. Please check the file and try again.';
      setRequestError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorCsv = () => {
    if (!report?.errors?.length) return;
    const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = ['row,field,value,message', ...report.errors.map((e) => [e.row, e.field, e.value, e.message].map(esc).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${entity}-errors.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const summaryCards = report ? [
    { label: 'Inserted', value: report.summary.inserted, icon: PlusCircle, cls: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Updated', value: report.summary.updated, icon: RefreshCw, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Skipped', value: report.summary.skipped, icon: SkipForward, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Failed', value: report.summary.failed, icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200' },
  ] : [];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
        <p className="mt-1 text-gray-600">Import categories, products, banners and sales from CSV, Excel or JSON files.</p>
      </div>

      {/* Entity tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {BULK_ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => { setEntity(e.key); setReport(null); setRequestError(''); setDataFile(null); setZipFile(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              entity === e.key ? 'bg-[#1A3C8A] text-white shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Template download */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-sm font-semibold text-gray-600">Download template:</span>
        {['csv', 'xlsx', 'json'].map((fmt) => (
          <button
            key={fmt}
            onClick={() => bulkApi.downloadTemplate(entity, fmt).catch(() => toast.error('Could not download template'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> {fmt}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); acceptDataFile(e.dataTransfer.files?.[0]); }}
        onClick={() => dataInputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition ${
          dragOver ? 'border-[#1A3C8A] bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <input ref={dataInputRef} type="file" accept=".csv,.xlsx,.xls,.json" className="hidden"
          onChange={(e) => acceptDataFile(e.target.files?.[0])} />
        <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        {dataFile ? (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> {dataFile.name} ({fmtMB(dataFile.size)})
            <button onClick={(e) => { e.stopPropagation(); setDataFile(null); }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <>
            <p className="font-semibold text-gray-700">Drag & drop your file here, or click to browse</p>
            <p className="mt-1 text-xs text-gray-400">.csv, .xlsx or .json — max 5MB</p>
          </>
        )}
      </div>

      {/* Optional images ZIP */}
      <div className="mt-4 flex items-center gap-3">
        <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => acceptZipFile(e.target.files?.[0])} />
        <button onClick={() => zipInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl bg-white hover:bg-gray-50">
          <FileArchive className="w-4 h-4" /> {zipFile ? 'Change images ZIP' : 'Attach images ZIP (optional)'}
        </button>
        {zipFile && (
          <span className="inline-flex items-center gap-2 text-sm text-gray-700">
            {zipFile.name} ({fmtMB(zipFile.size)})
            <button onClick={() => setZipFile(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </span>
        )}
        <span className="text-xs text-gray-400">Use the imageFile column to reference filenames inside the ZIP. Images: jpg/png/webp, ≤10MB each.</span>
      </div>

      {/* Submit + progress */}
      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleUpload}
          disabled={!dataFile || uploading}
          className="inline-flex items-center gap-2 px-6 py-3 font-bold text-white bg-[#1A3C8A] rounded-xl hover:bg-[#112960] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {uploading ? `Uploading… ${progress}%` : 'Upload'}
        </button>
        {uploading && (
          <div className="flex-1 max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1A3C8A] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Request-level error (415/413/422 …) */}
      {requestError && (
        <div className="mt-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {requestError}
        </div>
      )}

      {/* Result report */}
      {report && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Upload report — {report.summary.totalRows} rows
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {summaryCards.map(({ label, value, icon: Icon, cls }) => (
              <div key={label} className={`border rounded-xl p-4 ${cls}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide"><Icon className="w-4 h-4" /> {label}</div>
                <div className="mt-1 text-2xl font-black">{value}</div>
              </div>
            ))}
          </div>

          {report.errors?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-700">{report.errors.length} row error{report.errors.length !== 1 ? 's' : ''} — fix the file and re-upload (existing rows are updated, not duplicated)</span>
                <button onClick={downloadErrorCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> Error CSV
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs uppercase text-gray-500">
                      <th className="px-4 py-2">Row</th><th className="px-4 py-2">Field</th>
                      <th className="px-4 py-2">Value</th><th className="px-4 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.map((e, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-mono font-bold text-gray-700">{e.row}</td>
                        <td className="px-4 py-2 font-semibold text-gray-700">{e.field}</td>
                        <td className="px-4 py-2 text-gray-500 max-w-[160px] truncate" title={e.value}>{e.value || '—'}</td>
                        <td className="px-4 py-2 text-red-600">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
