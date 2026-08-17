import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, Loader2, AlertCircle, FileText } from 'lucide-react';

interface VehicleTimesheetReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    timesheetId?: string;
    month: string;
    year: string;
}

const VehicleTimesheetReportModal: React.FC<VehicleTimesheetReportModalProps> = ({ isOpen, onClose, timesheetId, month, year }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState<{id: string, plate_number: string}[]>([]);
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && profile?.company_id) {
            fetchVehicles();
        }
    }, [isOpen, profile?.company_id]);

    const fetchVehicles = async () => {
        const { data } = await supabase
            .from('vehicles')
            .select('id, plate_number')
            .eq('company_id', profile!.company_id)
            .order('plate_number');
        if (data) {
            setVehicles(data);
            if (data.length > 0) {
                setSelectedVehiclePlate(data[0].plate_number);
            }
        }
    };

    const handleExport = async () => {
        if (!selectedVehiclePlate || !profile?.company_id) return;
        setLoading(true);
        setErrorMsg(null);

        try {
            // 1. Fetch Timesheet Rows for this vehicle (using unique_identifier)
            let timesheetRowsData: any[] = [];
            if (timesheetId) {
                const { data: tRows, error: tError } = await supabase
                    .from('universal_timesheet_rows')
                    .select('*')
                    .eq('timesheet_id', timesheetId)
                    .ilike('unique_identifier', `%${selectedVehiclePlate}%`);
                
                if (tError) throw tError;
                if (tRows) timesheetRowsData = tRows;
            }

            // 2. Fetch Expenses for this vehicle for Yakıt and Gezi/Ekstra İş
            // We need the vehicle_id for this plate
            const vehicle = vehicles.find(v => v.plate_number === selectedVehiclePlate);
            let expensesData: any[] = [];
            if (vehicle) {
                const startDate = `${year}-${month.padStart(2, '0')}-01`;
                // Calculate end date
                const nextMonth = new Date(parseInt(year), parseInt(month), 1);
                const endDate = nextMonth.toISOString().split('T')[0];

                const { data: eRows, error: eError } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('company_id', profile.company_id)
                    .eq('vehicle_id', vehicle.id)
                    .in('expense_category', ['Yakıt', 'Gezi / Ekstra İş'])
                    .gte('expense_date', startDate)
                    .lt('expense_date', endDate)
                    .order('expense_date', { ascending: true });
                
                if (eError) throw eError;
                if (eRows) expensesData = eRows;
            }

            // 3. Build Excel Data
            const wb = XLSX.utils.book_new();

            // Sheet 1: Puantaj ve Seferler (Timesheet)
            const timesheetExportData: any[] = [];
            timesheetRowsData.forEach(row => {
                const baseRow: any = {
                    'Öğe Adı': row.primary_name,
                    'Kategori': row.category,
                    'Plaka/Sicil': row.unique_identifier,
                    'Açıklama': row.description,
                };
                
                let totalDays = 0;
                // Add days (1-31 depending on month)
                const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    const dayData = row.days_data?.[i.toString()];
                    let val = '';
                    if (typeof dayData === 'object' && dayData !== null) {
                        val = dayData.value || '';
                    } else if (dayData !== undefined && dayData !== null) {
                        val = String(dayData);
                    }
                    baseRow[`Gün ${i}`] = val;
                    if (val) totalDays++;
                }
                
                baseRow['Toplam Adet'] = totalDays;
                baseRow['Birim Fiyat'] = row.unit_price;
                baseRow['Prim/Ek'] = row.extra_payment;
                baseRow['Kesinti'] = row.deduction;
                baseRow['Net Tutar'] = (totalDays * row.unit_price) + row.extra_payment - row.deduction;
                
                timesheetExportData.push(baseRow);
            });

            if (timesheetExportData.length > 0) {
                const wsTimesheet = XLSX.utils.json_to_sheet(timesheetExportData);
                XLSX.utils.book_append_sheet(wb, wsTimesheet, "Puantaj");
            } else {
                // Empty sheet
                const wsEmpty = XLSX.utils.json_to_sheet([{ Mesaj: 'Bu araca ait puantaj kaydı bulunamadı.' }]);
                XLSX.utils.book_append_sheet(wb, wsEmpty, "Puantaj");
            }

            // Sheet 2: Yakıt ve Ekstra İşler
            const expenseExportData: any[] = [];
            expensesData.forEach(exp => {
                expenseExportData.push({
                    'Tarih': new Date(exp.expense_date).toLocaleDateString('tr-TR'),
                    'Kategori': exp.expense_category,
                    'Başlık': exp.title,
                    'Açıklama': exp.description || '-',
                    'Kilometre': exp.kilometer || '-',
                    'Tutar (₺)': exp.amount
                });
            });

            if (expenseExportData.length > 0) {
                const wsExpenses = XLSX.utils.json_to_sheet(expenseExportData);
                XLSX.utils.book_append_sheet(wb, wsExpenses, "Yakıt ve Gezi");
            } else {
                const wsEmpty2 = XLSX.utils.json_to_sheet([{ Mesaj: 'Bu araca ait yakıt veya gezi kaydı bulunamadı.' }]);
                XLSX.utils.book_append_sheet(wb, wsEmpty2, "Yakıt ve Gezi");
            }

            // Download
            const fileName = `Arac_Raporu_${selectedVehiclePlate}_${month}_${year}.xlsx`;
            XLSX.writeFile(wb, fileName);
            onClose();

        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Rapor oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FileText size={22} className="text-blue-400" />
                        <h3 className="text-lg font-bold">Araç Raporu Al</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 flex items-start gap-2 text-sm font-medium">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>{errorMsg}</p>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Araç Plakası Seçin</label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                            value={selectedVehiclePlate}
                            onChange={(e) => setSelectedVehiclePlate(e.target.value)}
                        >
                            {vehicles.map(v => (
                                <option key={v.id} value={v.plate_number}>{v.plate_number}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                            Seçilen aracın {month}/{year} dönemindeki puantaj verileri ve Yakıt/Gezi kayıtları Excel olarak indirilecektir.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm"
                    >
                        İptal
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={loading || !selectedVehiclePlate}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold text-sm shadow-md disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                        Excel İndir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VehicleTimesheetReportModal;
