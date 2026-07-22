import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Printer, Download, 
    ChevronDown, ChevronUp, Building2, Truck, 
    FileText, Plus, AlertCircle, Receipt, Loader2, X, Save,
    Check, Edit2, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types
interface RouteAttendance {
    id: string;
    route_id: string;
    attendance_date: string;
    trip_count: number;
}

interface Adjustment {
    id: string;
    type: 'extra' | 'deduction';
    description: string;
    amount: number;
}

interface RouteData {
    id: string;
    name: string;
    price: number;
    vehicle_id: string | null;
    kurum: string;
    plaka: string;
}

const Timesheets: React.FC = () => {
    const { profile } = useAuth();
    
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return (d.getMonth() + 1).toString().padStart(2, '0');
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        return new Date().getFullYear().toString();
    });
    const [selectedSchool, setSelectedSchool] = useState<string>('all');
    
    const [loading, setLoading] = useState(false);
    const [routes, setRoutes] = useState<RouteData[]>([]);
    const [attendances, setAttendances] = useState<RouteAttendance[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ routeId: string, day: number, value: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
    
    // Custom Rows States (Inline Editing inside single table)
    const [customRows, setCustomRows] = useState<any[]>([]);
    const [pendingRowEdits, setPendingRowEdits] = useState<Record<string, any>>({});
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [rowEditValues, setRowEditValues] = useState<any>({});
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'extra' | 'deduction'>('extra');
    const [newAdj, setNewAdj] = useState({ description: '', amount: '' });

    // Filter lists
    const schoolsList = useMemo(() => {
        const schools = new Set<string>();
        routes.forEach(r => {
            if (r.kurum) schools.add(r.kurum);
        });
        customRows.forEach(r => {
            if (r.kurum) schools.add(r.kurum);
        });
        return Array.from(schools).sort();
    }, [routes, customRows]);

    useEffect(() => {
        if (profile?.company_id) {
            fetchData();
            setPendingChanges({});
            setPendingRowEdits({});
            setEditingRowId(null);
            
            // Load custom rows from local storage
            const key = `custom_timesheet_rows_${profile.company_id}_${selectedYear}_${selectedMonth}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    setCustomRows(JSON.parse(saved));
                } catch (e) {
                    console.error('Error parsing custom rows:', e);
                    setCustomRows([]);
                }
            } else {
                setCustomRows([]);
            }
        }
    }, [profile?.company_id, selectedMonth, selectedYear]);

    const fetchData = async () => {
        if (!profile?.company_id) return;
        setLoading(true);

        try {
            // 1. Fetch Routes with related School and Vehicle
            const { data: routesData, error: routesError } = await supabase
                .from('routes')
                .select(`
                    id, 
                    name, 
                    price,
                    vehicle_id,
                    schools(name),
                    vehicles(id, plate_number)
                `)
                .eq('company_id', profile.company_id);

            if (routesError) throw routesError;
            
            const formattedRoutes: RouteData[] = (routesData || []).map((r: any) => {
                const schoolObj = Array.isArray(r.schools) ? r.schools[0] : r.schools;
                const vehicleObj = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
                
                return {
                    id: r.id,
                    name: r.name,
                    price: r.price || 0,
                    vehicle_id: r.vehicle_id || vehicleObj?.id || null,
                    kurum: schoolObj?.name || 'Bilinmeyen Kurum',
                    plaka: vehicleObj?.plate_number || 'Atanmamış'
                };
            });

            setRoutes(formattedRoutes);

            // 2. Fetch Attendances for the selected month/year
            // Format: YYYY-MM
            const startDate = `${selectedYear}-${selectedMonth}-01`;
            // Get last day of the month
            const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
            const endDate = `${selectedYear}-${selectedMonth}-${lastDay}`;

            // We only query if the table exists. If it fails, it means the user hasn't run the SQL yet.
            const { data: attData, error: attError } = await supabase
                .from('route_attendances')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('source', 'manual')
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate);

            if (attError) {
                console.warn('Attendance table might not exist yet:', attError.message);
                setAttendances([]);
            } else {
                setAttendances(attData || []);
            }

            // 3. Fetch Adjustments
            const { data: adjData, error: adjError } = await supabase
                .from('timesheet_adjustments')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('month', selectedMonth)
                .eq('year', selectedYear);

            if (adjError) {
                console.warn('Adjustments table error:', adjError.message);
                setAdjustments([]);
            } else {
                setAdjustments(adjData || []);
            }

        } catch (error) {
            console.error('Error fetching timesheet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdjustment = (type: 'extra' | 'deduction') => {
        setModalType(type);
        setNewAdj({ description: '', amount: '' });
        setShowModal(true);
    };

    const handleSaveNewAdjustment = async () => {
        if (!newAdj.description || !newAdj.amount || !profile?.company_id) return;
        
        const amount = parseFloat(newAdj.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Lütfen geçerli bir tutar girin.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('timesheet_adjustments')
                .insert({
                    company_id: profile.company_id,
                    month: selectedMonth,
                    year: selectedYear,
                    type: modalType,
                    description: newAdj.description,
                    amount
                });

            if (error) throw error;
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error adding adjustment:', error);
            alert('Eklenirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAdjustment = async (id: string) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('timesheet_adjustments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting adjustment:', error);
            alert('Silinirken bir hata oluştu.');
        }
    };

    const toggleRow = (id: string) => {
        if (expandedRow === id) setExpandedRow(null);
        else setExpandedRow(id);
    };

    // Calculate Days in Month
    const daysInMonth = useMemo(() => {
        return Array.from({ length: new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate() }, (_, i) => i + 1);
    }, [selectedMonth, selectedYear]);

    // Data Processing
    const processedData = useMemo(() => {
        let totalVal = 0;
        let totalTrips = 0;

        // 1. Process Database Routes
        const dbRows = routes
            .filter(r => selectedSchool === 'all' || r.kurum === selectedSchool)
            .map(route => {
                const routeAtts = attendances.filter(a => a.route_id === route.id);
                const daysMap: Record<string, number> = {};
                let routeTotalTrips = 0;

                routeAtts.forEach(att => {
                    const day = new Date(att.attendance_date).getDate().toString();
                    daysMap[day] = att.trip_count;
                });

                // Apply any pending cell edits
                daysInMonth.forEach(day => {
                    const key = `${route.id}_${day}`;
                    if (key in pendingChanges) {
                        daysMap[day.toString()] = pendingChanges[key];
                    }
                });

                Object.values(daysMap).forEach(v => {
                    routeTotalTrips += v;
                });

                // Apply metadata overrides
                const overrides = pendingRowEdits[route.id] || {};
                const price = overrides.tekFiyat !== undefined ? overrides.tekFiyat : (route.price || 0);
                const kurum = overrides.kurum !== undefined ? overrides.kurum : (route.kurum || 'Bilinmeyen Kurum');
                const guzergah = overrides.guzergah !== undefined ? overrides.guzergah : route.name;
                const arac = overrides.arac !== undefined ? overrides.arac : route.plaka;

                const totalPrice = routeTotalTrips * price;
                totalTrips += routeTotalTrips;
                totalVal += totalPrice;

                return {
                    id: route.id,
                    isCustom: false,
                    kurum,
                    guzergah,
                    arac,
                    tekFiyat: price,
                    daysMap,
                    totalTek: routeTotalTrips,
                    toplamTutar: totalPrice,
                    vehicle_id: route.vehicle_id
                };
            });

        // 2. Process Custom Rows
        const customRowsProcessed = customRows
            .filter(r => selectedSchool === 'all' || r.kurum === selectedSchool)
            .map(row => {
                const daysMap = { ...row.daysMap };
                let rowTotalTrips = 0;

                // Apply any pending cell edits for custom rows
                daysInMonth.forEach(day => {
                    const key = `${row.id}_${day}`;
                    if (key in pendingChanges) {
                        daysMap[day.toString()] = pendingChanges[key];
                    }
                });

                Object.values(daysMap).forEach((v: any) => {
                    rowTotalTrips += v;
                });

                // Apply metadata overrides
                const overrides = pendingRowEdits[row.id] || {};
                const price = overrides.tekFiyat !== undefined ? overrides.tekFiyat : row.tekFiyat;
                const kurum = overrides.kurum !== undefined ? overrides.kurum : row.kurum;
                const guzergah = overrides.guzergah !== undefined ? overrides.guzergah : row.guzergah;
                const arac = overrides.arac !== undefined ? overrides.arac : row.arac;

                const totalPrice = rowTotalTrips * price;
                totalTrips += rowTotalTrips;
                totalVal += totalPrice;

                return {
                    id: row.id,
                    isCustom: true,
                    kurum,
                    guzergah,
                    arac,
                    tekFiyat: price,
                    daysMap,
                    totalTek: rowTotalTrips,
                    toplamTutar: totalPrice
                };
            });

        const combined = [...dbRows, ...customRowsProcessed]
            .sort((a, b) => a.kurum.localeCompare(b.kurum));

        return { rows: combined, grandTotalPrice: totalVal, grandTotalTrips: totalTrips };
    }, [routes, attendances, customRows, pendingChanges, pendingRowEdits, selectedSchool, daysInMonth]);

    // Invoice Calculations
    const tripTotal = processedData.grandTotalPrice;
    const extrasTotal = adjustments.filter(a => a.type === 'extra').reduce((sum, a) => sum + a.amount, 0);
    const deductionsTotal = adjustments.filter(a => a.type === 'deduction').reduce((sum, a) => sum + a.amount, 0);
    
    const islemBedeli = tripTotal + extrasTotal - deductionsTotal;
    const kdv10 = islemBedeli * 0.10;
    const tevkifatOrani = 0.5; // 5/10
    const tevkifEdilecek = kdv10 * tevkifatOrani;
    const tevkifatDahil = islemBedeli + kdv10;
    const tevkifatHaric = tevkifatDahil - tevkifEdilecek;

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadExcel = () => {
        // Create header row for days
        const daysHeader = daysInMonth.map(d => d.toString());
        const header = ['Kurum', 'Güzergah', 'Araç', ...daysHeader, 'Toplam Sefer', 'Birim Fiyat', 'Toplam Tutar'];
        
        // Map data rows
        const rows = processedData.rows.map(row => {
            const dayValues = daysInMonth.map(d => row.daysMap[d.toString()] || '');
            return [
                row.kurum,
                row.guzergah,
                row.arac,
                ...dayValues,
                row.totalTek,
                row.tekFiyat,
                row.toplamTutar
            ];
        });

        // Add summary rows at the bottom
        const emptyRow = new Array(header.length).fill('');
        const totalRow = new Array(header.length).fill('');
        totalRow[0] = 'GENEL TOPLAM';
        totalRow[header.indexOf('Toplam Sefer')] = processedData.grandTotalTrips;
        totalRow[header.indexOf('Toplam Tutar')] = processedData.grandTotalPrice;

        const footerData = [
            emptyRow,
            ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Fatura Özeti'],
            ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'İşlem Bedeli', islemBedeli],
            ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'KDV (%10)', kdv10],
            ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Tevkif Edilecek KDV', -tevkifEdilecek],
            ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Ödenecek Net Tutar', tevkifatHaric]
        ];

        const fullData = [header, ...rows, totalRow, ...footerData];

        const ws = XLSX.utils.aoa_to_sheet(fullData);
        
        // Auto-size columns (rough estimate)
        const wscols = [
            {wch: 20}, // Kurum
            {wch: 25}, // Güzergah
            {wch: 15}, // Araç
            ...daysInMonth.map(() => ({wch: 3})), // Days
            {wch: 12}, // Toplam Sefer
            {wch: 12}, // Birim Fiyat
            {wch: 15}, // Toplam Tutar
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Puantaj");
        
        // Month name for filename
        const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleString('tr-TR', { month: 'long' });
        XLSX.writeFile(wb, `Puantaj_${monthName}_${selectedYear}.xlsx`);
    };

    const handleCellEditCommit = () => {
        if (!editingCell) return;
        const key = `${editingCell.routeId}_${editingCell.day}`;
        const val = parseInt(editingCell.value) || 0;

        // Find original value in processedData to see if it actually changed
        const originalRow = processedData.rows.find(row => row.id === editingCell.routeId);
        const originalVal = originalRow ? (originalRow.daysMap[editingCell.day.toString()] || 0) : 0;

        setPendingChanges(prev => {
            const next = { ...prev };
            if (val === originalVal) {
                delete next[key];
            } else {
                next[key] = val;
            }
            return next;
        });
        setEditingCell(null);
    };

    const handleDiscardChanges = () => {
        if (confirm('Kaydedilmemiş tüm değişiklikleri geri almak istediğinize emin misiniz?')) {
            setPendingChanges({});
            setPendingRowEdits({});
            setEditingRowId(null);
            // Reload customRows from localStorage
            if (profile?.company_id) {
                const key = `custom_timesheet_rows_${profile.company_id}_${selectedYear}_${selectedMonth}`;
                const saved = localStorage.getItem(key);
                setCustomRows(saved ? JSON.parse(saved) : []);
            }
        }
    };

    const handleSaveChanges = async () => {
        if (Object.keys(pendingChanges).length === 0 && Object.keys(pendingRowEdits).length === 0) return;
        if (!profile?.company_id) return;
        setSaving(true);

        try {
            // 1. Save daily trip count changes (Supabase database attendances)
            const dbTripPromises = Object.entries(pendingChanges)
                .filter(([key]) => !key.startsWith('custom_')) // Only DB routes go to Supabase
                .map(async ([key, tripCount]) => {
                    const [routeId, day] = key.split('_');
                    const date = `${selectedYear}-${selectedMonth}-${day.padStart(2, '0')}`;

                    await supabase
                        .from('route_attendances')
                        .delete()
                        .eq('route_id', routeId)
                        .eq('attendance_date', date)
                        .eq('source', 'manual');

                    if (tripCount > 0) {
                        const route = routes.find(r => r.id === routeId);
                        await supabase
                            .from('route_attendances')
                            .insert({
                                company_id: profile.company_id,
                                route_id: routeId,
                                vehicle_id: route?.vehicle_id || null,
                                attendance_date: date,
                                trip_count: tripCount,
                                source: 'manual'
                            });
                    }
                });

            // 2. Save DB Route Metadata Changes (Name & Price) to Supabase
            const dbRoutePromises = Object.entries(pendingRowEdits)
                .filter(([id]) => !id.startsWith('custom_'))
                .map(async ([routeId, overrides]) => {
                    const updateData: any = {};
                    if (overrides.guzergah !== undefined) updateData.name = overrides.guzergah;
                    if (overrides.tekFiyat !== undefined) updateData.price = overrides.tekFiyat;

                    if (Object.keys(updateData).length > 0) {
                        await supabase
                            .from('routes')
                            .update(updateData)
                            .eq('id', routeId);
                    }
                });

            await Promise.all([...dbTripPromises, ...dbRoutePromises]);

            // 3. Save Custom Rows & their internal trip counts to local storage
            const updatedCustomRows = customRows.map(row => {
                const overrides = pendingRowEdits[row.id] || {};
                const daysMap = { ...row.daysMap };

                daysInMonth.forEach(day => {
                    const key = `${row.id}_${day}`;
                    if (key in pendingChanges) {
                        daysMap[day.toString()] = pendingChanges[key];
                    }
                });

                return {
                    ...row,
                    kurum: overrides.kurum !== undefined ? overrides.kurum : row.kurum,
                    guzergah: overrides.guzergah !== undefined ? overrides.guzergah : row.guzergah,
                    arac: overrides.arac !== undefined ? overrides.arac : row.arac,
                    tekFiyat: overrides.tekFiyat !== undefined ? overrides.tekFiyat : row.tekFiyat,
                    daysMap
                };
            });

            // Save custom rows list to local storage
            const key = `custom_timesheet_rows_${profile.company_id}_${selectedYear}_${selectedMonth}`;
            localStorage.setItem(key, JSON.stringify(updatedCustomRows));
            setCustomRows(updatedCustomRows);

            setPendingChanges({});
            setPendingRowEdits({});
            setEditingRowId(null);
            await fetchData();
            alert('Tüm değişiklikler başarıyla kaydedildi ve hakedişler güncellendi!');
        } catch (error: any) {
            console.error('Batch save error:', error);
            alert(error.message || 'Değişiklikler kaydedilirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    // Inline row editing helpers
    const handleStartEditRow = (row: any) => {
        setEditingRowId(row.id);
        setRowEditValues({
            kurum: row.kurum,
            guzergah: row.guzergah,
            arac: row.arac,
            tekFiyat: row.tekFiyat
        });
    };

    const handleSaveRowEdit = (rowId: string) => {
        setPendingRowEdits(prev => ({
            ...prev,
            [rowId]: {
                ...prev[rowId],
                ...rowEditValues
            }
        }));
        setEditingRowId(null);
        setRowEditValues({});
    };

    const handleCancelRowEdit = () => {
        setEditingRowId(null);
        setRowEditValues({});
    };

    const handleAddNewRow = () => {
        const newId = 'custom_' + Math.random().toString(36).substring(2, 15);
        const newRow = {
            id: newId,
            isCustom: true,
            kurum: 'Yeni Kurum',
            guzergah: 'Yeni Güzergah',
            arac: 'Atanmamış',
            tekFiyat: 0,
            daysMap: {}
        };
        
        setCustomRows(prev => [...prev, newRow]);
        setEditingRowId(newId);
        setRowEditValues({
            kurum: 'Yeni Kurum',
            guzergah: 'Yeni Güzergah',
            arac: 'Atanmamış',
            tekFiyat: 0
        });
    };

    const handleDeleteRow = (rowId: string, isCustom: boolean) => {
        if (confirm('Bu satırı silmek istediğinize emin misiniz?')) {
            if (isCustom) {
                setCustomRows(prev => {
                    const updated = prev.filter(r => r.id !== rowId);
                    const key = `custom_timesheet_rows_${profile?.company_id}_${selectedYear}_${selectedMonth}`;
                    localStorage.setItem(key, JSON.stringify(updated));
                    return updated;
                });
                setPendingRowEdits(prev => {
                    const next = { ...prev };
                    delete next[rowId];
                    return next;
                });
                setPendingChanges(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => {
                        if (k.startsWith(rowId + '_')) delete next[k];
                    });
                    return next;
                });
            }
        }
    };

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print, 
                    button, 
                    select, 
                    .sidebar, 
                    header, 
                    nav,
                    .filters-container {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .main-content {
                        margin: 0 !important;
                        padding: 20px !important;
                        width: 100% !important;
                    }
                    .print-header {
                        display: block !important;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 10px !important;
                    }
                    th, td {
                        border: 1px solid #ddd !important;
                        padding: 4px !important;
                    }
                    .bg-slate-50 {
                        background-color: #f8fafc !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .bg-secondary {
                        background-color: #3b82f6 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                }
                .print-header {
                    display: none;
                }
            `}} />

            {/* Print Header */}
            <div className="print-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">PUANTAJ VE HAKEDİŞ EKSTRESİ</h1>
                        <p className="text-slate-600">Dönem: {selectedMonth}/{selectedYear}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">{profile?.full_name}</p>
                        <p className="text-sm text-slate-500">{new Date().toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Puantaj ve Hakedişler</h1>
                    <p className="text-slate-500 mt-1">Aylık araç ve güzergah bazlı puantaj ekstreleri.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm"
                    >
                        <Printer size={18} />
                        <span className="hidden sm:inline">Yazdır</span>
                    </button>
                    <button 
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-sm"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Ekstre İndir</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full relative">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Kurum Seçin</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            value={selectedSchool}
                            onChange={(e) => setSelectedSchool(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all appearance-none cursor-pointer font-medium text-slate-700"
                        >
                            <option value="all">Tüm Kurumlar</option>
                            {schoolsList.map(school => (
                                <option key={school} value={school}>{school}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="w-full md:w-48">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Ay</label>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all appearance-none cursor-pointer font-medium text-slate-700"
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const month = (i + 1).toString().padStart(2, '0');
                            return <option key={month} value={month}>{new Date(2000, i, 1).toLocaleString('tr-TR', { month: 'long' })}</option>
                        })}
                    </select>
                </div>
                <div className="w-full md:w-32">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Yıl</label>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all appearance-none cursor-pointer font-medium text-slate-700"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
            </div>

            {/* Unsaved Changes Banner */}
            {(Object.keys(pendingChanges).length > 0 || Object.keys(pendingRowEdits).length > 0) && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 no-print shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                            <AlertCircle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-900 text-sm">Puantaj Tablosunda Kaydedilmemiş Değişiklikler Var!</h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                                {Object.keys(pendingChanges).length > 0 && <span>Toplam <strong>{Object.keys(pendingChanges).length} günün</strong> sefer sayısı güncellendi. </span>}
                                {Object.keys(pendingRowEdits).length > 0 && <span>Toplam <strong>{Object.keys(pendingRowEdits).length} satırın</strong> bilgileri (Kurum, Güzergah, Fiyat vb.) düzenlendi. </span>}
                                Hakediş hesaplamalarının ve fatura özetinin güncellenmesi için değişiklikleri kaydetmeniz gerekmektedir.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                            onClick={handleDiscardChanges}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold shadow-sm"
                            disabled={saving}
                        >
                            İptal Et
                        </button>
                        <button
                            onClick={handleSaveChanges}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all shadow-sm text-xs font-bold"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>Kaydediliyor...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    <span>Değişiklikleri Kaydet</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Price Update Tip */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 no-print shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">Puantaj Düzenleme Bilgilendirmesi</h4>
                    <p className="text-sm text-blue-700 mt-0.5">
                        Tablodaki Kurum Adı, Güzergah, Plaka ve Birim Fiyatları doğrudan satırların sağındaki <b>Düzenle (kalem)</b> ikonuna tıklayarak değiştirebilirsiniz. Satırları düzenledikten veya <b>"Yeni Satır Ekle"</b> ile satır ekledikten sonra en üstteki <b>Değişiklikleri Kaydet</b> butonu ile topluca veritabanına kaydedebilirsiniz.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Sefer Puantaj Tablosu</h2>
                            <p className="text-sm text-slate-500">Satırlara tıklayarak günlük detayları görebilirsiniz.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddNewRow}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                        <Plus size={14} />
                        <span>Yeni Satır Ekle</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="p-4 font-semibold text-slate-600 text-sm">Kurum Bilgisi</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Güzergah & Araç</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm text-center">Toplam Sefer</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Birim Fiyat</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Tutar</th>
                                <th className="p-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-secondary" size={32} />
                                        Yükleniyor...
                                    </td>
                                </tr>
                            ) : processedData.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <AlertCircle size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-700">Kayıt bulunamadı</p>
                                            <p className="text-sm text-slate-500 max-w-md mt-2">
                                                Seçilen kriterlere uygun rota veya sefer kaydı bulunmuyor.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : processedData.rows.map((row) => (
                                <React.Fragment key={row.id}>
                                    <tr 
                                        onClick={() => {
                                            if (editingRowId === row.id) return;
                                            toggleRow(row.id);
                                        }}
                                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${expandedRow === row.id ? 'bg-slate-50/80' : ''}`}
                                    >
                                        <td className="p-4">
                                            {editingRowId === row.id ? (
                                                <input 
                                                    type="text"
                                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                                                    value={rowEditValues.kurum || ''}
                                                    onChange={e => setRowEditValues({ ...rowEditValues, kurum: e.target.value })}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 uppercase">
                                                        {row.kurum.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{row.kurum}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingRowId === row.id ? (
                                                <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                                    <input 
                                                        type="text"
                                                        placeholder="Güzergah"
                                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                                                        value={rowEditValues.guzergah || ''}
                                                        onChange={e => setRowEditValues({ ...rowEditValues, guzergah: e.target.value })}
                                                    />
                                                    <input 
                                                        type="text"
                                                        placeholder="Plaka / Araç"
                                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                                                        value={rowEditValues.arac || ''}
                                                        onChange={e => setRowEditValues({ ...rowEditValues, arac: e.target.value })}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-slate-800 font-medium text-sm">{row.guzergah}</span>
                                                    <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                                                        <Truck size={12} />
                                                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                                                            {row.arac}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm">
                                                {row.totalTek}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-600">
                                            {editingRowId === row.id ? (
                                                <input 
                                                    type="number"
                                                    className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-right focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                                                    value={rowEditValues.tekFiyat || 0}
                                                    onChange={e => setRowEditValues({ ...rowEditValues, tekFiyat: parseFloat(e.target.value) || 0 })}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                `${row.tekFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-bold text-slate-900">
                                            {row.toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                {editingRowId === row.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleSaveRowEdit(row.id)}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Kaydet"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelRowEdit}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="İptal"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleStartEditRow(row)}
                                                            className="p-1.5 text-slate-400 hover:text-secondary hover:bg-slate-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Satırı Düzenle"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        {row.isCustom && (
                                                            <button
                                                                onClick={() => handleDeleteRow(row.id, row.isCustom)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Satırı Sil"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => toggleRow(row.id)}
                                                            className="p-1.5 text-slate-400 hover:text-secondary transition-colors"
                                                        >
                                                            {expandedRow === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Expanded Daily Details */}
                                    {expandedRow === row.id && (() => {
                                        const firstDayDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
                                        const firstDayOfWeek = firstDayDate.getDay();
                                        const startingOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

                                        return (
                                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                                <td colSpan={6} className="p-6">
                                                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md max-w-4xl mx-auto">
                                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
                                                            <div>
                                                                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                                    <Calendar className="text-blue-500" size={18} />
                                                                    <span>Aylık Puantaj Takvimi</span>
                                                                </h4>
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {row.kurum} - {row.guzergah} güzergahına ait günlük sefer adetlerini takvim üzerinden yönetin.
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block"></span>
                                                                    <span>Sefer Var</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200 inline-block"></span>
                                                                    <span>Sefer Yok</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Calendar Grid Container */}
                                                        <div className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50 p-3 sm:p-4">
                                                            {/* Weekdays Header */}
                                                            <div className="grid grid-cols-7 gap-1.5 mb-2">
                                                                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((dayName, idx) => (
                                                                    <div 
                                                                        key={dayName} 
                                                                        className={`text-center font-bold text-xs py-1.5 uppercase tracking-wider ${
                                                                            idx >= 5 ? 'text-red-500/80' : 'text-slate-400'
                                                                        }`}
                                                                    >
                                                                        {dayName}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Calendar Days Grid */}
                                                            <div className="grid grid-cols-7 gap-1.5">
                                                                {/* Blank cells for offset */}
                                                                {Array.from({ length: startingOffset }).map((_, i) => (
                                                                    <div 
                                                                        key={`empty-${i}`} 
                                                                        className="bg-slate-100/30 rounded-xl h-16 sm:h-20 border border-slate-200/20 pointer-events-none opacity-40"
                                                                    ></div>
                                                                ))}

                                                                {/* Actual calendar days */}
                                                                {daysInMonth.map(day => {
                                                                    const key = `${row.id}_${day}`;
                                                                    const hasPending = key in pendingChanges;
                                                                    const count = hasPending ? pendingChanges[key] : (row.daysMap[day.toString()] || 0);
                                                                    const isEditing = editingCell?.routeId === row.id && editingCell?.day === day;
                                                                    const dateObj = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, day);
                                                                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                                                                    if (isEditing) {
                                                                        return (
                                                                            <div 
                                                                                key={day} 
                                                                                className="flex flex-col items-center justify-between bg-white border-2 border-secondary rounded-xl p-1.5 shadow-xl h-16 sm:h-20 z-10 scale-105 transition-transform"
                                                                            >
                                                                                <span className="text-[10px] font-bold text-slate-400">{day}</span>
                                                                                <input 
                                                                                    autoFocus
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="10"
                                                                                    className="w-full text-center font-black text-slate-800 bg-transparent focus:outline-none text-base border-b border-slate-100 pb-1"
                                                                                    value={editingCell.value}
                                                                                    onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                                                                                    onBlur={handleCellEditCommit}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === 'Enter') handleCellEditCommit();
                                                                                        if (e.key === 'Escape') setEditingCell(null);
                                                                                    }}
                                                                                />
                                                                                <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">Tamam</span>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <button 
                                                                            key={day} 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingCell({ 
                                                                                    routeId: row.id, 
                                                                                    day, 
                                                                                    value: (count || 0).toString() 
                                                                                });
                                                                            }}
                                                                            className={`flex flex-col justify-between items-start p-2 rounded-xl border text-xs transition-all hover:border-secondary hover:bg-white hover:shadow-md active:scale-95 text-left h-16 sm:h-20
                                                                                ${hasPending
                                                                                    ? 'bg-amber-50/80 border-amber-300 text-amber-800 shadow-sm'
                                                                                    : count 
                                                                                        ? 'bg-blue-50/80 border-blue-200 text-blue-700 shadow-sm' 
                                                                                        : isWeekend
                                                                                            ? 'bg-red-50/20 border-slate-200/60 text-slate-600'
                                                                                            : 'bg-white border-slate-200/80 text-slate-600'
                                                                                }
                                                                            `}
                                                                        >
                                                                            <span className={`font-extrabold text-xs px-1.5 py-0.5 rounded-md ${
                                                                                hasPending
                                                                                    ? 'bg-amber-250 text-amber-900'
                                                                                    : count 
                                                                                        ? 'bg-blue-100 text-blue-800' 
                                                                                        : isWeekend 
                                                                                            ? 'bg-red-100/50 text-red-600' 
                                                                                            : 'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                                {day} {hasPending && '•'}
                                                                            </span>
                                                                            <div className="w-full text-right pr-1">
                                                                                {count ? (
                                                                                    <div className="flex flex-col items-end">
                                                                                        <span className={`font-black text-sm sm:text-base leading-none ${hasPending ? 'text-amber-600' : 'text-blue-600'}`}>{count}</span>
                                                                                        <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${hasPending ? 'text-amber-500' : 'text-blue-500'}`}>Sefer</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-slate-300 font-semibold italic text-[11px]">-</span>
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </React.Fragment>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                                <td colSpan={2} className="p-4 font-bold text-slate-800 text-right">GENEL TOPLAM</td>
                                <td className="p-4 text-center">
                                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm">
                                        {processedData.grandTotalTrips}
                                    </span>
                                </td>
                                <td></td>
                                <td className="p-4 text-right font-black text-lg text-slate-900">
                                    {processedData.grandTotalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>



            {/* Bottom Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Extra & Deductions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Extra İşler */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Plus size={18} className="text-emerald-500" />
                                Ekstra İşler
                            </h3>
                            <button 
                                onClick={() => handleAddAdjustment('extra')}
                                className="text-xs font-bold text-secondary hover:underline"
                            >
                                Yeni Ekle
                            </button>
                        </div>
                        {adjustments.filter(a => a.type === 'extra').length > 0 ? (
                            <div className="space-y-2">
                                {adjustments.filter(a => a.type === 'extra').map(adj => (
                                    <div key={adj.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-800">{adj.description}</span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ekstra Ödeme</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-emerald-600">+{adj.amount.toLocaleString('tr-TR')} ₺</span>
                                            <button 
                                                onClick={() => handleDeleteAdjustment(adj.id)}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <AlertCircle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
                                <p className="text-sm text-slate-500">Bu ay için kaydedilmiş ekstra iş bulunmuyor.</p>
                            </div>
                        )}
                    </div>

                    {/* Kesintiler */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-500" />
                                Kesintiler ve Ek Ücretler
                            </h3>
                            <button 
                                onClick={() => handleAddAdjustment('deduction')}
                                className="text-xs font-bold text-secondary hover:underline"
                            >
                                Yeni Ekle
                            </button>
                        </div>
                        {adjustments.filter(a => a.type === 'deduction').length > 0 ? (
                            <div className="space-y-2">
                                {adjustments.filter(a => a.type === 'deduction').map(adj => (
                                    <div key={adj.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-800">{adj.description}</span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kesinti / Gider</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-red-600">-{adj.amount.toLocaleString('tr-TR')} ₺</span>
                                            <button 
                                                onClick={() => handleDeleteAdjustment(adj.id)}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <AlertCircle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
                                <p className="text-sm text-slate-500">Bu ay için kaydedilmiş kesinti bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Final Invoice Statement */}
                <div className="lg:col-span-1">
                    <div className="premium-card rounded-2xl shadow-xl overflow-hidden relative">
                        {/* Content */}
                        
                        <div className="p-6 relative z-10">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-secondary/10 text-secondary rounded-xl">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Fatura Özeti</h2>
                                    <p className="text-slate-500 text-sm">Kesilecek Fatura Detayı</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>İşlem Bedeli</span>
                                    <span className="font-bold text-slate-800">{islemBedeli.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>KDV (%8)</span>
                                    <span>0,00 ₺</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>KDV (%10)</span>
                                    <span className="font-bold text-slate-800">{kdv10.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>KDV (%20)</span>
                                    <span className="font-bold text-slate-800">0,00 ₺</span>
                                </div>
                                
                                <div className="h-px bg-slate-100 my-2"></div>
                                
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>Tevkifat Oranı</span>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">5/10</span>
                                </div>
                                <div className="flex justify-between items-center text-amber-600 font-medium">
                                    <span>Tevkif Edilecek KDV</span>
                                    <span>- {tevkifEdilecek.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>

                                <div className="h-px bg-slate-100 my-2"></div>

                                <div className="flex justify-between items-center text-slate-600 pt-1">
                                    <span>Tevkifat Dahil Tutar</span>
                                    <span className="font-bold text-slate-800">{tevkifatDahil.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-secondary p-6 mt-2">
                            <p className="text-blue-100 text-sm font-medium mb-1">ÖDENECEK NET TUTAR</p>
                            <p className="text-3xl font-black tracking-tight text-white">{tevkifatHaric.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                        </div>
                    </div>
                </div>

            </div>
            {/* Adjustment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`p-6 text-white flex justify-between items-center ${modalType === 'extra' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                            <div className="flex items-center gap-3">
                                {modalType === 'extra' ? <Plus size={24} /> : <AlertCircle size={24} />}
                                <h3 className="text-xl font-bold">
                                    {modalType === 'extra' ? 'Yeni Ekstra İş Ekle' : 'Yeni Kesinti Ekle'}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder={modalType === 'extra' ? 'Örn: Ek servis, hafta sonu mesaisi...' : 'Örn: Yakıt kesintisi, ceza...'}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-slate-700"
                                    value={newAdj.description}
                                    onChange={e => setNewAdj({ ...newAdj, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tutar (₺)</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-bold text-slate-800 text-lg"
                                        value={newAdj.amount}
                                        onChange={e => setNewAdj({ ...newAdj, amount: e.target.value })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₺</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex gap-3">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-bold"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={handleSaveNewAdjustment}
                                disabled={!newAdj.description || !newAdj.amount || saving}
                                className={`flex-1 px-4 py-3 text-white rounded-xl transition-all font-bold shadow-md shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed
                                    ${modalType === 'extra' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                                `}
                            >
                                {saving ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Kaydediliyor...</span>
                                    </div>
                                ) : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Table Modal */}

        </div>
    );
};

export default Timesheets;
