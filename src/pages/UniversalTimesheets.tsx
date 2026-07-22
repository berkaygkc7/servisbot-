import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Save, 
    Layers, 
    Settings2, 
    Percent, 
    Coins, 
    X, 
    Check, 
    Info, 
    Loader2, 
    AlertCircle,
    Sliders,
    Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TaxRate {
    id: string;
    tax_name: string;
    tax_rate: number; // e.g. 10.00 for 10%
    is_active: boolean;
}

interface TimesheetRow {
    id: string;
    primary_name: string;
    category: string;
    unique_identifier: string;
    description: string;
    unit_price: number;
    extra_payment: number;
    deduction: number;
    days_data: Record<string, any>;
}

interface UniversalTimesheet {
    id: string;
    title: string;
    month: string;
    year: string;
    primary_label: string;
    category_label: string;
    unique_key_label: string;
    cell_type: 'number' | 'number_or_text' | 'text';
}

const UniversalTimesheets: React.FC = () => {
    const { profile } = useAuth();
    
    // Period selection
    const [selectedMonth, setSelectedMonth] = useState<string>(
        (new Date().getMonth() + 1).toString().padStart(2, '0')
    );
    const [selectedYear, setSelectedYear] = useState<string>(
        new Date().getFullYear().toString()
    );

    // Dynamic Sheet Config & State
    const [timesheet, setTimesheet] = useState<UniversalTimesheet | null>(null);
    const [rows, setRows] = useState<TimesheetRow[]>([]);
    const [taxes, setTaxes] = useState<TaxRate[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [usingFallback, setUsingFallback] = useState(false);

    // Edit controls for sheet settings
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configForm, setConfigForm] = useState({
        title: '',
        primary_label: 'Personel Adı / Hizmet',
        category_label: 'Departman / Güzergah',
        unique_key_label: 'Sicil No / Plaka',
        cell_type: 'number_or_text' as 'number' | 'number_or_text' | 'text'
    });

    // Tevkifat/Stopaj Module State
    const [tevkifatEnabled, setTevkifatEnabled] = useState(false);
    const [tevkifatRateNumerator, setTevkifatRateNumerator] = useState(5);
    const [tevkifatRateDenominator, setTevkifatRateDenominator] = useState(10);

    // Inline Editing States
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [rowEditValues, setRowEditValues] = useState<Partial<TimesheetRow>>({});
    const [editingCell, setEditingCell] = useState<{
        rowId: string;
        day: number;
        value: string;
        note: string;
    } | null>(null);

    // Inline Tax Editing State
    const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
    const [taxEditValues, setTaxEditValues] = useState<{ tax_name: string; tax_rate: number }>({ tax_name: '', tax_rate: 0 });

    // Dynamic Tax Addition Form State
    const [newTaxName, setNewTaxName] = useState('');
    const [newTaxRate, setNewTaxRate] = useState<number | ''>('');

    // Daily Column Notes States
    const [dailyNotes, setDailyNotes] = useState<Record<string, string>>({});
    const [editingColumnNoteDay, setEditingColumnNoteDay] = useState<number | null>(null);
    const [columnNoteValue, setColumnNoteValue] = useState('');

    // Fetch or initialize timesheet for selected month/year
    const periodKey = `${selectedYear}_${selectedMonth}`;

    const loadTimesheetData = async () => {
        setLoading(true);
        setErrorMsg(null);
        setUsingFallback(false);

        try {
            // First check if tables exist by performing a small query — always scope by company_id
            const sheetsQuery = supabase
                .from('universal_timesheets')
                .select('*')
                .eq('month', selectedMonth)
                .eq('year', selectedYear);

            if (profile?.company_id) {
                sheetsQuery.eq('company_id', profile.company_id);
            }

            const { data: sheets, error: sheetError } = await sheetsQuery.limit(1);

            if (sheetError) {
                throw new Error("Supabase tables not found, switching to local storage");
            }

            if (sheets && sheets.length > 0) {
                const activeSheet = sheets[0];
                setTimesheet(activeSheet);
                // Fetch rows
                const { data: rowData, error: rowError } = await supabase
                    .from('universal_timesheet_rows')
                    .select('*')
                    .eq('timesheet_id', activeSheet.id);

                if (rowError) throw rowError;
                
                const normalRows = rowData ? rowData.filter(r => r.primary_name !== '__daily_notes__') : [];
                const notesRow = rowData ? rowData.find(r => r.primary_name === '__daily_notes__') : null;
                
                setRows(normalRows);
                setDailyNotes(notesRow ? notesRow.days_data : {});

                // Fetch taxes
                const { data: taxData, error: taxError } = await supabase
                    .from('universal_timesheet_taxes')
                    .select('*')
                    .eq('timesheet_id', activeSheet.id);

                if (taxError) throw taxError;
                setTaxes(taxData || []);
            } else {
                // Initialize default sheet configuration for this period
                const newSheet: UniversalTimesheet = {
                    id: crypto.randomUUID(),
                    title: `${selectedMonth}/${selectedYear} Evrensel Hakediş ve Puantajı`,
                    month: selectedMonth,
                    year: selectedYear,
                    primary_label: 'Personel Adı / Hizmet',
                    category_label: 'Departman / Güzergah',
                    unique_key_label: 'Sicil No / Plaka',
                    cell_type: 'number_or_text'
                };
                
                // Try to insert it into Supabase
                const { error: insertError } = await supabase
                    .from('universal_timesheets')
                    .insert([{
                        id: newSheet.id,
                        company_id: profile?.company_id || null,
                        title: newSheet.title,
                        month: newSheet.month,
                        year: newSheet.year,
                        primary_label: newSheet.primary_label,
                        category_label: newSheet.category_label,
                        unique_key_label: newSheet.unique_key_label
                    }]);

                if (insertError) throw insertError;

                setTimesheet(newSheet);
                setRows([]);
                setDailyNotes({});
                setTaxes([
                    { id: crypto.randomUUID(), tax_name: 'KDV %10', tax_rate: 10, is_active: true }
                ]);
            }
        } catch (err: any) {
            console.warn("Using local storage fallback due to:", err.message);
            setUsingFallback(true);
            
            // LocalStorage Fallback Logic
            const localDataStr = localStorage.getItem(`universal_ts_${periodKey}`);
            if (localDataStr) {
                try {
                    const parsed = JSON.parse(localDataStr);
                    setTimesheet(parsed.timesheet);
                    
                    const rawRows = parsed.rows || [];
                    const normalRows = rawRows.filter((r: any) => r.primary_name !== '__daily_notes__');
                    const notesRow = rawRows.find((r: any) => r.primary_name === '__daily_notes__');
                    
                    setRows(normalRows);
                    setDailyNotes(notesRow ? notesRow.days_data : (parsed.dailyNotes || {}));
                    
                    setTaxes(parsed.taxes || []);
                    if (parsed.tevkifat) {
                        setTevkifatEnabled(parsed.tevkifat.enabled);
                        setTevkifatRateNumerator(parsed.tevkifat.numerator);
                        setTevkifatRateDenominator(parsed.tevkifat.denominator);
                    }
                } catch (jsonErr) {
                    initFallbackDefault();
                }
            } else {
                initFallbackDefault();
            }
        } finally {
            setLoading(false);
        }
    };

    const initFallbackDefault = () => {
        const defaultSheet: UniversalTimesheet = {
            id: `local_${periodKey}`,
            title: `${selectedMonth}/${selectedYear} Evrensel Hakediş ve Puantajı`,
            month: selectedMonth,
            year: selectedYear,
            primary_label: 'Personel Adı / Hizmet',
            category_label: 'Departman / Güzergah',
            unique_key_label: 'Sicil No / Plaka',
            cell_type: 'number_or_text'
        };
        setTimesheet(defaultSheet);
        setRows([]);
        setDailyNotes({});
        setTaxes([
            { id: `tax_kdv10_${periodKey}`, tax_name: 'KDV %10', tax_rate: 10, is_active: true }
        ]);
        setTevkifatEnabled(false);
    };

    // Load data on month/year/profile change
    useEffect(() => {
        if (profile?.company_id || usingFallback || !profile) {
            loadTimesheetData();
        }
    }, [selectedMonth, selectedYear, profile?.company_id]);

    // Save all changes (database commit or localStorage save)
    const handleSaveAll = async () => {
        if (!timesheet) return;
        setSaving(true);
        setErrorMsg(null);

        try {
            // Auto-commit any active inline row edits first!
            let activeRows = rows;
            if (editingRowId && Object.keys(rowEditValues).length > 0) {
                activeRows = rows.map(r => (r.id === editingRowId ? { ...r, ...rowEditValues } as TimesheetRow : r));
                setRows(activeRows);
                setEditingRowId(null);
                setRowEditValues({});
            }

            if (usingFallback) {
                const allRows = [
                    ...activeRows,
                    {
                        id: `notes_${timesheet.id}`,
                        primary_name: '__daily_notes__',
                        category: '',
                        unique_identifier: '',
                        description: '',
                        unit_price: 0,
                        extra_payment: 0,
                        deduction: 0,
                        days_data: dailyNotes
                    }
                ];
                const localData = {
                    timesheet,
                    rows: allRows,
                    taxes,
                    tevkifat: {
                        enabled: tevkifatEnabled,
                        numerator: tevkifatRateNumerator,
                        denominator: tevkifatRateDenominator
                    }
                };
                localStorage.setItem(`universal_ts_${periodKey}`, JSON.stringify(localData));
                // Update state directly — do NOT re-call loadTimesheetData() which would
                // hit Supabase and potentially overwrite our fresh localStorage data.
                setRows(activeRows);
                // (taxes, tevkifat, timesheet are already up-to-date in state)
            } else {
                // 1. Update Timesheet Configuration in Supabase
                const { error: tsUpdateError } = await supabase
                    .from('universal_timesheets')
                    .update({
                        title: timesheet.title,
                        primary_label: timesheet.primary_label,
                        category_label: timesheet.category_label,
                        unique_key_label: timesheet.unique_key_label
                    })
                    .eq('id', timesheet.id);

                if (tsUpdateError) throw tsUpdateError;

                // 2. Prepare rows to insert BEFORE deleting anything
                //    so that if something goes wrong, we haven't lost data yet
                const allRows = [
                    ...activeRows,
                    {
                        primary_name: '__daily_notes__',
                        category: '',
                        unique_identifier: '',
                        description: '',
                        unit_price: 0,
                        extra_payment: 0,
                        deduction: 0,
                        days_data: dailyNotes
                    }
                ];

                const rowsToInsert = allRows.map(r => ({
                    timesheet_id: timesheet.id,
                    primary_name: r.primary_name,
                    category: r.category || '',
                    unique_identifier: r.unique_identifier || '',
                    description: r.description || '',
                    unit_price: Number(r.unit_price) || 0,
                    extra_payment: Number(r.extra_payment) || 0,
                    deduction: Number(r.deduction) || 0,
                    days_data: r.days_data || {}
                }));

                // 3. Now delete old rows and insert the new ones
                const { error: rowDeleteError } = await supabase
                    .from('universal_timesheet_rows')
                    .delete()
                    .eq('timesheet_id', timesheet.id);

                if (rowDeleteError) throw rowDeleteError;

                const { error: rowInsertError } = await supabase
                    .from('universal_timesheet_rows')
                    .insert(rowsToInsert);

                if (rowInsertError) throw rowInsertError;

                // 4. Delete old taxes and re-insert current ones
                const { error: taxDeleteError } = await supabase
                    .from('universal_timesheet_taxes')
                    .delete()
                    .eq('timesheet_id', timesheet.id);

                if (taxDeleteError) throw taxDeleteError;

                if (taxes.length > 0) {
                    const taxesToInsert = taxes.map(t => ({
                        timesheet_id: timesheet.id,
                        tax_name: t.tax_name,
                        tax_rate: t.tax_rate,
                        is_active: t.is_active
                    }));

                    const { error: taxInsertError } = await supabase
                        .from('universal_timesheet_taxes')
                        .insert(taxesToInsert);

                    if (taxInsertError) throw taxInsertError;
                }

                // Keep state in sync immediately (so UI reflects saved data right away)
                setRows(activeRows);
            }

            // For Supabase path: reload to get server-assigned IDs for newly inserted rows
            if (!usingFallback) {
                await loadTimesheetData();
            }
        } catch (err: any) {
            console.error("Save failed:", err.message);
            setErrorMsg(err.message || "Kaydedilirken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    // Calculate days of the selected month
    const daysInMonth = useMemo(() => {
        const yearInt = parseInt(selectedYear);
        const monthInt = parseInt(selectedMonth);
        const date = new Date(yearInt, monthInt, 0); // day 0 gets last day of previous month
        const count = date.getDate();
        return Array.from({ length: count }, (_, i) => i + 1);
    }, [selectedMonth, selectedYear]);

    // Check if weekend
    const getDayStyle = (day: number) => {
        const yearInt = parseInt(selectedYear);
        const monthInt = parseInt(selectedMonth);
        const dateObj = new Date(yearInt, monthInt - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return 'bg-red-50/50 text-red-600 font-bold border-red-100/40';
        }
        return 'bg-slate-50/30 text-slate-600 border-slate-100';
    };

    // Table settings configurator modal helpers
    const handleOpenConfig = () => {
        if (!timesheet) return;
        setConfigForm({
            title: timesheet.title,
            primary_label: timesheet.primary_label,
            category_label: timesheet.category_label,
            unique_key_label: timesheet.unique_key_label,
            cell_type: timesheet.cell_type
        });
        setShowConfigModal(true);
    };

    const handleSaveConfig = () => {
        if (!timesheet) return;
        setTimesheet({
            ...timesheet,
            title: configForm.title,
            primary_label: configForm.primary_label,
            category_label: configForm.category_label,
            unique_key_label: configForm.unique_key_label,
            cell_type: configForm.cell_type
        });
        setShowConfigModal(false);
    };

    // Adding & deleting rows
    const handleAddRow = () => {
        // Auto-commit any currently active inline edit first so no data is lost
        let currentRows = rows;
        if (editingRowId && Object.keys(rowEditValues).length > 0) {
            currentRows = rows.map(r => (r.id === editingRowId ? { ...r, ...rowEditValues } as TimesheetRow : r));
            setRows(currentRows);
            setEditingRowId(null);
            setRowEditValues({});
        }

        const newRow: TimesheetRow = {
            id: `new_${crypto.randomUUID()}`,
            primary_name: 'Yeni Öğe',
            category: '',
            unique_identifier: '',
            description: '',
            unit_price: 0,
            extra_payment: 0,
            deduction: 0,
            days_data: {}
        };
        setRows([...currentRows, newRow]);
        // Open the new row immediately in edit mode
        setEditingRowId(newRow.id);
        setRowEditValues({ ...newRow });
    };

    const handleDeleteRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    // Row Inline editing
    const handleStartEditRow = (row: TimesheetRow) => {
        setEditingRowId(row.id);
        setRowEditValues({ ...row });
    };

    const handleSaveRowEdit = (id: string) => {
        setRows(rows.map(r => (r.id === id ? { ...r, ...rowEditValues } as TimesheetRow : r)));
        setEditingRowId(null);
        setRowEditValues({});
    };

    const handleCancelRowEdit = () => {
        setEditingRowId(null);
        setRowEditValues({});
    };

    // Cell data entry validation & commit
    const handleCellClick = (rowId: string, day: number, currentValueRaw: any) => {
        let value = '';
        let note = '';
        if (typeof currentValueRaw === 'object' && currentValueRaw !== null) {
            value = currentValueRaw.value || '';
            note = currentValueRaw.note || '';
        } else {
            value = String(currentValueRaw || '');
        }

        setEditingCell({
            rowId,
            day,
            value,
            note
        });
    };

    const handleCellCommit = () => {
        if (!editingCell || !timesheet) return;
        const { rowId, day, value, note } = editingCell;

        // Apply cell entry type constraint
        let sanitizedValue = value.trim();

        if (timesheet.cell_type === 'number') {
            // Remove non-numeric characters
            sanitizedValue = sanitizedValue.replace(/[^0-9.]/g, '');
        } else if (timesheet.cell_type === 'number_or_text') {
            // Allow numbers or defined shorthand letters (case-insensitive conversion)
            const upper = sanitizedValue.toUpperCase();
            if (['R', 'İ', 'M', 'X', 'İZ', 'RPR'].includes(upper)) {
                sanitizedValue = upper;
            }
        }

        setRows(rows.map(r => {
            if (r.id === rowId) {
                return {
                    ...r,
                    days_data: {
                        ...r.days_data,
                        [day.toString()]: {
                            value: sanitizedValue,
                            note: note.trim()
                        }
                    }
                };
            }
            return r;
        }));

        setEditingCell(null);
    };

    const handleEditColumnNote = (day: number) => {
        setEditingColumnNoteDay(day);
        setColumnNoteValue(dailyNotes[day.toString()] || '');
    };

    const handleSaveColumnNote = () => {
        if (!editingColumnNoteDay) return;
        setDailyNotes({
            ...dailyNotes,
            [editingColumnNoteDay.toString()]: columnNoteValue.trim()
        });
        setEditingColumnNoteDay(null);
    };

    // Calculations helper per row
    const rowCalculations = (row: TimesheetRow) => {
        let numericSum = 0;
        let activeDaysCount = 0;

        Object.values(row.days_data).forEach(v => {
            if (!v) return;
            let valStr = '';
            if (typeof v === 'object' && v !== null) {
                valStr = (v as any).value || '';
            } else {
                valStr = String(v);
            }
            if (!valStr) return;

            const parsed = parseFloat(valStr);
            if (!isNaN(parsed)) {
                numericSum += parsed;
                activeDaysCount++;
            } else {
                // If it is a character code (like R, İ, M), we count it as 1 active day
                activeDaysCount++;
            }
        });

        // The count factor for total calculation
        // For hours/sefer calculation we sum the values, otherwise we count days
        const totalAdet = timesheet?.cell_type === 'number' || numericSum > 0 ? (numericSum || activeDaysCount) : activeDaysCount;
        
        const totalAmount = (totalAdet * row.unit_price) + row.extra_payment - row.deduction;

        return {
            totalAdet,
            totalAmount
        };
    };

    // Real-time aggregations (Genel Toplam)
    const aggregatedTotals = useMemo(() => {
        let grandTotalAdet = 0;
        let grandTotalAmount = 0;
        let grandTotalExtras = 0;
        let grandTotalDeductions = 0;

        const daySums = daysInMonth.reduce((acc, day) => {
            acc[day] = 0;
            return acc;
        }, {} as Record<number, number>);

        rows.forEach(row => {
            const { totalAdet, totalAmount } = rowCalculations(row);
            grandTotalAdet += totalAdet;
            grandTotalAmount += totalAmount;
            grandTotalExtras += row.extra_payment;
            grandTotalDeductions += row.deduction;

            // Day sum mapping
            daysInMonth.forEach(day => {
                const cellValRaw = row.days_data[day.toString()] || '';
                let cellVal = '';
                if (typeof cellValRaw === 'object' && cellValRaw !== null) {
                    cellVal = (cellValRaw as any).value || '';
                } else {
                    cellVal = String(cellValRaw);
                }

                const parsed = parseFloat(cellVal);
                if (!isNaN(parsed)) {
                    daySums[day] += parsed;
                } else if (cellVal !== '') {
                    // Shorthands count as 1
                    daySums[day] += 1;
                }
            });
        });

        return {
            grandTotalAdet,
            grandTotalAmount,
            grandTotalExtras,
            grandTotalDeductions,
            daySums
        };
    }, [rows, daysInMonth, timesheet]);

    // Financial tax computations
    const financeSummary = useMemo(() => {
        const baseAmount = aggregatedTotals.grandTotalAmount;
        const brut = baseAmount + aggregatedTotals.grandTotalExtras - aggregatedTotals.grandTotalDeductions;
        const taxableBrut = Math.max(0, brut);
        
        let totalTaxAmount = 0;
        
        const taxesListCalculated = taxes.map(t => {
            const amount = taxableBrut * (t.tax_rate / 100);
            if (t.is_active) {
                totalTaxAmount += amount;
            }
            return {
                ...t,
                computed_amount: amount
            };
        });

        // Tevkifat / Stopaj calculation
        let tevkifatAmount = 0;
        if (tevkifatEnabled) {
            // Calculated on KDV or directly (assuming tevkifat ratio is applied over the active positive taxes)
            const kdvOnlyTax = taxesListCalculated.find(t => t.tax_name.toUpperCase().includes('KDV') && t.is_active);
            if (kdvOnlyTax) {
                tevkifatAmount = kdvOnlyTax.computed_amount * (tevkifatRateNumerator / tevkifatRateDenominator);
            } else {
                // Or fallback to direct stopaj calculation on gross
                tevkifatAmount = taxableBrut * 0.05; // 5% default
            }
        }

        const netTutar = brut + totalTaxAmount - tevkifatAmount;

        return {
            baseAmount,
            brut,
            taxesList: taxesListCalculated,
            tevkifatAmount,
            netTutar
        };
    }, [aggregatedTotals, taxes, tevkifatEnabled, tevkifatRateNumerator, tevkifatRateDenominator]);

    // Tax actions
    const handleAddTaxRate = () => {
        if (!newTaxName || newTaxRate === '') return;
        const newTax: TaxRate = {
            id: `tax_${crypto.randomUUID()}`,
            tax_name: newTaxName,
            tax_rate: Number(newTaxRate),
            is_active: true
        };
        setTaxes([...taxes, newTax]);
        setNewTaxName('');
        setNewTaxRate('');
    };

    const handleDeleteTaxRate = (id: string) => {
        setTaxes(taxes.filter(t => t.id !== id));
    };

    const handleToggleTaxRate = (id: string) => {
        setTaxes(taxes.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t));
    };

    const handleStartEditTax = (tax: TaxRate) => {
        setEditingTaxId(tax.id);
        setTaxEditValues({ tax_name: tax.tax_name, tax_rate: tax.tax_rate });
    };

    const handleSaveTaxEdit = (id: string) => {
        setTaxes(taxes.map(t => t.id === id ? { ...t, ...taxEditValues } : t));
        setEditingTaxId(null);
    };

    const handleCancelTaxEdit = () => {
        setEditingTaxId(null);
    };

    return (
        <div className="space-y-6">
            
            {/* Header Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm no-print">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-xl shadow-md shadow-blue-500/10">
                        <Layers size={22} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">
                            {timesheet?.title || 'Evrensel Puantaj ve Hakediş Paneli'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400 font-medium">Esnek, Sektör Bağımsız Takip Modülü</span>
                            {usingFallback && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                                    <Info size={10} /> Local Storage Aktif
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    {/* Period selection */}
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const m = (i + 1).toString().padStart(2, '0');
                            return (
                                <option key={m} value={m}>
                                    {new Date(2000, i, 1).toLocaleString('tr-TR', { month: 'long' })}
                                </option>
                            );
                        })}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>

                    <button 
                        onClick={handleOpenConfig}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                        <Sliders size={14} />
                        <span>Başlıkları Özelleştir</span>
                    </button>

                    <button 
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                        <Plus size={14} />
                        <span>Yeni Satır Ekle</span>
                    </button>

                    <button 
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/10 disabled:opacity-50"
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

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Grid Spreadsheet and Calculations */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                
                {loading ? (
                    <div className="p-20 text-center text-slate-500">
                        <Loader2 className="animate-spin mx-auto mb-3 text-blue-600" size={32} />
                        <span className="text-sm font-medium">Yükleniyor...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto relative max-w-full">
                        <table className="w-max min-w-full text-left border-collapse table-auto">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 text-[11px] font-bold tracking-wider uppercase">
                                    <th className="p-3 text-center whitespace-nowrap sticky left-0 bg-slate-50/90 z-20 shadow-[1px_0_0_0_#f1f5f9]">Sıra</th>
                                    <th className="p-3 whitespace-nowrap sticky left-12 bg-slate-50/90 z-20 shadow-[1px_0_0_0_#f1f5f9]">
                                        {timesheet?.primary_label || 'Öğe Adı'}
                                    </th>
                                    <th className="p-3 whitespace-nowrap">
                                        {timesheet?.category_label || 'Kategori'}
                                    </th>
                                    <th className="p-3 whitespace-nowrap">
                                        {timesheet?.unique_key_label || 'Kimlik No'}
                                    </th>
                                    <th className="p-3 whitespace-nowrap">Açıklama</th>

                                    {/* Days Columns */}
                                    {daysInMonth.map(day => (
                                        <th 
                                            key={day} 
                                            className={`p-3 text-center border-l border-slate-100/60 whitespace-nowrap ${getDayStyle(day)}`}
                                        >
                                            {day.toString().padStart(2, '0')}
                                        </th>
                                    ))}

                                    {/* Financial Headers */}
                                    <th className="p-3 text-center border-l border-slate-200 bg-blue-50/30 text-blue-900 whitespace-nowrap">Adet/Gün</th>
                                    <th className="p-3 text-right border-l border-slate-100 whitespace-nowrap">B. Fiyat</th>
                                    <th className="p-3 text-right whitespace-nowrap">Prim/Ek</th>
                                    <th className="p-3 text-right text-red-700 whitespace-nowrap">Kesinti</th>
                                    <th className="p-3 text-right bg-slate-900 text-white sticky right-0 z-10 whitespace-nowrap">Tutar</th>
                                    <th className="p-3 text-center whitespace-nowrap">İşlem</th>
                                </tr>
                            </thead>
                            
                            <tbody className="divide-y divide-slate-100">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={daysInMonth.length + 11} className="p-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Info size={28} className="text-slate-300" />
                                                <span className="text-sm font-medium">Bu tablo için henüz satır eklenmemiş.</span>
                                                <button 
                                                    onClick={handleAddRow}
                                                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                                                >
                                                    Bir satır ekleyerek başlayın
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        const isEditing = editingRowId === row.id;
                                        const { totalAdet, totalAmount } = rowCalculations(row);

                                        return (
                                            <tr key={row.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-700">
                                                
                                                {/* Sticky ID */}
                                                <td className="p-3 text-center font-bold text-slate-400 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9] whitespace-nowrap">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </td>

                                                {/* Sticky Primary Name */}
                                                <td className="p-3 sticky left-12 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9] font-bold whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text"
                                                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
                                                            value={rowEditValues.primary_name || ''}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, primary_name: e.target.value })}
                                                        />
                                                    ) : (
                                                        <span className="text-slate-800">{row.primary_name}</span>
                                                    )}
                                                </td>

                                                {/* Category */}
                                                <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text"
                                                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none min-w-[100px]"
                                                            value={rowEditValues.category || ''}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, category: e.target.value })}
                                                        />
                                                    ) : (
                                                        row.category || '-'
                                                    )}
                                                </td>

                                                {/* Unique Identifier */}
                                                <td className="p-3 font-semibold text-slate-500 font-mono whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text"
                                                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none min-w-[100px]"
                                                            value={rowEditValues.unique_identifier || ''}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, unique_identifier: e.target.value })}
                                                        />
                                                    ) : (
                                                        row.unique_identifier || '-'
                                                    )}
                                                </td>

                                                {/* Description */}
                                                <td className="p-3 text-slate-500 whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text"
                                                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none min-w-[120px]"
                                                            value={rowEditValues.description || ''}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, description: e.target.value })}
                                                        />
                                                    ) : (
                                                        row.description || '-'
                                                    )}
                                                </td>

                                                {/* Dynamic Days Grid */}
                                                {daysInMonth.map(day => {
                                                    const cellValRaw = row.days_data[day.toString()] || '';
                                                    let cellValDisplay = '';
                                                    let cellNote = '';
                                                    if (typeof cellValRaw === 'object' && cellValRaw !== null) {
                                                        cellValDisplay = cellValRaw.value || '';
                                                        cellNote = cellValRaw.note || '';
                                                    } else {
                                                        cellValDisplay = String(cellValRaw);
                                                    }

                                                    let displayVal = cellValDisplay;
                                                    if (!displayVal && cellNote) {
                                                        displayVal = cellNote;
                                                    }

                                                    return (
                                                        <td 
                                                            key={day}
                                                            onClick={() => handleCellClick(row.id, day, cellValRaw)}
                                                            className={`p-1 border-l border-slate-100 text-center cursor-pointer select-none relative min-w-[2.5rem] whitespace-nowrap px-2 ${getDayStyle(day)}`}
                                                        >
                                                            <div className="relative w-full h-full flex items-center justify-center min-h-[1.5rem] whitespace-nowrap" title={cellNote ? `Not: ${cellNote}` : undefined}>
                                                                <span className={`font-bold text-[11px] whitespace-nowrap ${
                                                                    cellValDisplay === 'R' ? 'text-rose-500' :
                                                                    cellValDisplay === 'İ' ? 'text-amber-500' :
                                                                    cellValDisplay === 'M' ? 'text-emerald-500' : 'text-slate-800'
                                                                }`}>
                                                                    {displayVal || '-'}
                                                                </span>
                                                                {cellNote && (
                                                                    <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* Calculations and Accrual Totals */}
                                                <td className="p-3 text-center border-l border-slate-200 font-extrabold bg-blue-50/10 text-blue-700">
                                                    {totalAdet}
                                                </td>

                                                {/* Unit price */}
                                                <td className="p-3 text-right border-l border-slate-100 font-medium">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number"
                                                            className="w-24 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded font-bold focus:outline-none"
                                                            value={rowEditValues.unit_price || 0}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, unit_price: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    ) : (
                                                        `${row.unit_price.toLocaleString('tr-TR')} ₺`
                                                    )}
                                                </td>

                                                {/* Extra Bonuses */}
                                                <td className="p-3 text-right font-medium text-emerald-600">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number"
                                                            className="w-20 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded focus:outline-none"
                                                            value={rowEditValues.extra_payment || 0}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, extra_payment: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    ) : (
                                                        row.extra_payment > 0 ? `+${row.extra_payment.toLocaleString('tr-TR')} ₺` : '-'
                                                    )}
                                                </td>

                                                {/* Deductions */}
                                                <td className="p-3 text-right font-medium text-rose-600">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number"
                                                            className="w-20 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded focus:outline-none"
                                                            value={rowEditValues.deduction || 0}
                                                            onChange={e => setRowEditValues({ ...rowEditValues, deduction: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    ) : (
                                                        row.deduction > 0 ? `-${row.deduction.toLocaleString('tr-TR')} ₺` : '-'
                                                    )}
                                                </td>

                                                {/* Row total final */}
                                                <td className="p-3 text-right bg-slate-900 text-white font-extrabold sticky right-0 z-10">
                                                    {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </td>

                                                {/* Action buttons */}
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {isEditing ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleSaveRowEdit(row.id)}
                                                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                                    title="Tamam"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={handleCancelRowEdit}
                                                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                                    title="İptal"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleStartEditRow(row)}
                                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                                                    title="Satırı Düzenle"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteRow(row.id)}
                                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>

                            {/* Aggregates Summary Row */}
                            {rows.length > 0 && (
                                <tfoot className="bg-slate-100/80 border-t-2 border-slate-200 text-slate-800 font-extrabold text-[11px] uppercase">
                                    {/* Daily column notes row */}
                                    <tr className="bg-slate-50 border-b border-slate-200/60 no-print">
                                        <td colSpan={5} className="p-2.5 text-right font-bold sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#cbd5e1] text-slate-500 text-[10px]">
                                            GÜN AÇIKLAMALARI / NOTLAR
                                        </td>
                                        {daysInMonth.map(day => {
                                            const noteVal = dailyNotes[day.toString()] || '';
                                            return (
                                                <td 
                                                    key={day} 
                                                    onClick={() => handleEditColumnNote(day)}
                                                    className="p-1 text-center font-semibold border-l border-slate-200/50 cursor-pointer hover:bg-blue-50/70 min-w-[2.5rem] whitespace-nowrap px-2 text-[9px] text-slate-500 normal-case"
                                                    title={noteVal ? `Sütun Notu: ${noteVal}` : 'Gün açıklaması ekle'}
                                                >
                                                    {noteVal || '-'}
                                                </td>
                                            );
                                        })}
                                        <td colSpan={5} className="p-2.5 border-l border-slate-200 bg-slate-50"></td>
                                    </tr>

                                    <tr>
                                        <td colSpan={5} className="p-3 text-right font-black sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_0_#cbd5e1]">
                                            GENEL TOPLAM
                                        </td>
                                        
                                        {/* Day sums */}
                                        {daysInMonth.map(day => (
                                            <td key={day} className="p-1 text-center font-bold border-l border-slate-200/50">
                                                {aggregatedTotals.daySums[day] || '-'}
                                            </td>
                                        ))}

                                        {/* Financial aggregates */}
                                        <td className="p-3 text-center border-l border-slate-350 bg-blue-100/50 text-blue-900 font-black">
                                            {aggregatedTotals.grandTotalAdet}
                                        </td>
                                        <td className="p-3 border-l border-slate-200"></td>
                                        <td className="p-3 text-right text-emerald-700">
                                            +{aggregatedTotals.grandTotalExtras.toLocaleString('tr-TR')} ₺
                                        </td>
                                        <td className="p-3 text-right text-rose-700">
                                            -{aggregatedTotals.grandTotalDeductions.toLocaleString('tr-TR')} ₺
                                        </td>
                                        <td className="p-3 text-right bg-slate-950 text-white text-xs font-black sticky right-0 z-10">
                                            {aggregatedTotals.grandTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

            {/* Config & Tax calculations widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom Tax Configurator Panel */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                            <Percent size={18} className="text-blue-500 animate-pulse" />
                            <span>Vergi ve Yasal Kesinti Oranları</span>
                        </h3>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Dinamik Matrah Ayarı</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Vergi Adı</label>
                            <input 
                                type="text"
                                placeholder="Örn: KDV %20 veya Stopaj"
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                                value={newTaxName}
                                onChange={e => setNewTaxName(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Oran (%)</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    placeholder="20"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold focus:outline-none"
                                    value={newTaxRate}
                                    onChange={e => setNewTaxRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                            </div>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleAddTaxRate}
                                disabled={!newTaxName || newTaxRate === ''}
                                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                            >
                                <Plus size={14} />
                                <span>Listeye Ekle</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktif Vergi/Katsayı Kırılımları</h4>
                        {taxes.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Henüz bir vergi oranı tanımlanmamış. Eklenen tutar brüt üzerinden hakedişe yansır.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {taxes.map(t => {
                                    const isTaxEditing = editingTaxId === t.id;
                                    return (
                                        <div key={t.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                                            <div className="flex-1 flex items-center gap-3">
                                                <input 
                                                    type="checkbox"
                                                    checked={t.is_active}
                                                    onChange={() => handleToggleTaxRate(t.id)}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20"
                                                />
                                                {isTaxEditing ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input 
                                                            type="text"
                                                            className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                                                            value={taxEditValues.tax_name}
                                                            onChange={e => setTaxEditValues({ ...taxEditValues, tax_name: e.target.value })}
                                                        />
                                                        <input 
                                                            type="number"
                                                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-right"
                                                            value={taxEditValues.tax_rate}
                                                            onChange={e => setTaxEditValues({ ...taxEditValues, tax_rate: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-xs">{t.tax_name}</span>
                                                        <span className="text-[10px] text-slate-400">Çarpan Oranı: %{t.tax_rate}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 ml-2">
                                                {isTaxEditing ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleSaveTaxEdit(t.id)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={handleCancelTaxEdit}
                                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStartEditTax(t)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Düzenle"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteTaxRate(t.id)}
                                                            className="p-1 text-slate-300 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Sil"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Payroll Financial Summary Widget */}
                <div className="lg:col-span-1 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                    
                    {/* Decorative Blurs */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-4 border-b border-slate-700/50 pb-5">
                            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 rounded-2xl shadow-inner">
                                <Coins size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg tracking-tight text-slate-100">Modüler Bordro & Hakediş</h3>
                                <p className="text-[11px] text-slate-400 font-medium">Birim Fiyat ve Yasal Katsayı Toplamları</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <span className="text-slate-300 font-medium">Toplam İşlem Bedeli (Brüt)</span>
                                <span className="font-bold text-white text-base">
                                    {financeSummary.brut.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                            </div>

                            {/* List computed active taxes */}
                            {financeSummary.taxesList.filter(t => t.is_active).map(t => (
                                <div key={t.id} className="flex justify-between items-center text-slate-300 pl-2 border-l border-slate-800">
                                    <span>{t.tax_name}</span>
                                    <span>+{t.computed_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                            ))}

                            {/* Tevkifat Toggle / Ratio setup */}
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-4"></div>
                            
                            <div className="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 transition-all hover:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox"
                                            id="tevkifat_toggle"
                                            checked={tevkifatEnabled}
                                            onChange={e => setTevkifatEnabled(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <label htmlFor="tevkifat_toggle" className="text-slate-300 font-bold cursor-pointer">Tevkifat Uygula</label>
                                </div>
                                {tevkifatEnabled && (
                                    <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                        <input 
                                            type="number"
                                            className="w-6 text-center font-bold bg-transparent text-white focus:outline-none"
                                            value={tevkifatRateNumerator}
                                            onChange={e => setTevkifatRateNumerator(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                        <span className="text-slate-500">/</span>
                                        <input 
                                            type="number"
                                            className="w-6 text-center font-bold bg-transparent text-white focus:outline-none"
                                            value={tevkifatRateDenominator}
                                            onChange={e => setTevkifatRateDenominator(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                    </div>
                                )}
                            </div>
                            {tevkifatEnabled && (
                                <div className="flex justify-between items-center text-rose-400 font-bold bg-rose-950/20 p-3 rounded-xl border border-rose-900/30">
                                    <span>Uygulanan Tevkifat</span>
                                    <span>-{financeSummary.tevkifatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl mt-8 shadow-lg shadow-blue-900/50 group overflow-hidden border border-blue-500/30 cursor-default">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
                        
                        <p className="text-[11px] text-blue-100 font-bold uppercase tracking-widest mb-2 opacity-90">Nihai Ödenecek Net Tutar</p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                                {financeSummary.netTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                            <span className="text-xl font-bold text-blue-200">₺</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Labels Configuration Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Settings2 size={22} className="text-blue-400" />
                                <h3 className="text-lg font-bold">Kolon Başlıklarını Özelleştir</h3>
                            </div>
                            <button 
                                onClick={() => setShowConfigModal(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tablo Başlığı</label>
                                <input 
                                    type="text"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 text-sm"
                                    value={configForm.title}
                                    onChange={e => setConfigForm({ ...configForm, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ana Öğe Kolon Başlığı</label>
                                <input 
                                    type="text"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                    value={configForm.primary_label}
                                    onChange={e => setConfigForm({ ...configForm, primary_label: e.target.value })}
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Örn: Personel Adı, Araç Plaka, Taşeron Adı vb.</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kategori Kolon Başlığı</label>
                                <input 
                                    type="text"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                    value={configForm.category_label}
                                    onChange={e => setConfigForm({ ...configForm, category_label: e.target.value })}
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Örn: Departman, Şantiye Bölümü, Servis Güzergahı vb.</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Benzersiz Kimlik Kolon Başlığı</label>
                                <input 
                                    type="text"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                    value={configForm.unique_key_label}
                                    onChange={e => setConfigForm({ ...configForm, unique_key_label: e.target.value })}
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Örn: Sicil No, T.C. Kimlik, Sözleşme ID vb.</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Hücre Veri Giriş Kuralı</label>
                                <select 
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 text-sm"
                                    value={configForm.cell_type}
                                    onChange={e => setConfigForm({ ...configForm, cell_type: e.target.value as any })}
                                >
                                    <option value="number">Yalnızca Sayı Girişi (Çalışma Saati, Sefer vb.)</option>
                                    <option value="number_or_text">Sayı ve Harf Kodları (R, İ, M gibi kısaltmalar)</option>
                                    <option value="text">Serbest Metin Girişi</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex gap-3">
                            <button 
                                onClick={() => setShowConfigModal(false)}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={handleSaveConfig}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-xs shadow-md"
                            >
                                Uygula
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cell Edit Modal */}
            {editingCell && (() => {
                const targetRow = rows.find(r => r.id === editingCell.rowId);
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800">
                            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Calendar size={22} className="text-blue-400" />
                                    <h3 className="text-lg font-bold">
                                        Puantaj Girişi - Gün {editingCell.day.toString().padStart(2, '0')}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                {targetRow && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seçili Satır</span>
                                        <span className="font-bold text-slate-800 text-sm">{targetRow.primary_name}</span>
                                        {targetRow.category && (
                                            <span className="text-xs text-slate-500 block mt-0.5">({targetRow.category})</span>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Değer / Kod</label>
                                    <input 
                                        autoFocus
                                        type="text"
                                        placeholder={
                                            timesheet?.cell_type === 'number' ? 'Çalışma saati, sefer vb. sayı girin' :
                                            timesheet?.cell_type === 'number_or_text' ? 'Sayı veya harf kodu (R, İ, M) girin' : 'Serbest metin girin'
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-800 text-sm"
                                        value={editingCell.value}
                                        onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleCellCommit();
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Günlük Açıklama / Not</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="Bu güne ait not veya detaylı açıklama girin..."
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 text-sm resize-none"
                                        value={editingCell.note}
                                        onChange={e => setEditingCell({ ...editingCell, note: e.target.value })}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleCellCommit();
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 flex gap-3">
                                <button 
                                    onClick={() => setEditingCell(null)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs"
                                >
                                    İptal
                                </button>
                                <button 
                                    onClick={handleCellCommit}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-xs shadow-md"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Column Note Edit Modal */}
            {editingColumnNoteDay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Info size={22} className="text-blue-400" />
                                <h3 className="text-lg font-bold">
                                    Gün Açıklaması / Sütun Notu - Gün {editingColumnNoteDay.toString().padStart(2, '0')}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setEditingColumnNoteDay(null)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-500 font-medium">
                                Bu günün sütununun en altında görünecek genel notu veya açıklamayı (tatil, vardiya detayı vb.) buraya yazabilirsiniz.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sütun Notu</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Örn: Resmi Tatil, Nöbet Değişimi..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 text-sm"
                                    value={columnNoteValue}
                                    onChange={e => setColumnNoteValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveColumnNote();
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex gap-3">
                            <button 
                                onClick={() => setEditingColumnNoteDay(null)}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={handleSaveColumnNote}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-xs shadow-md"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UniversalTimesheets;
