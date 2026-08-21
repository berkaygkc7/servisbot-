import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Search, Filter, Loader2, TrendingUp, AlertTriangle, FileText, Download, CheckSquare, CheckCircle, Archive, Trash2, RotateCcw, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PaymentList, { type Payment } from '../components/dashboard/PaymentList';
import BulkBillingModal from '../components/dashboard/BulkBillingModal';
import * as XLSX from 'xlsx';

const Payments = () => {
    const { profile, loading: authLoading } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [schoolLevelFilter, setSchoolLevelFilter] = useState('all');
    const [isBulkBillingModalOpen, setIsBulkBillingModalOpen] = useState(false);
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [availableSchoolLevels, setAvailableSchoolLevels] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [stats, setStats] = useState({ receivable: 0, collected: 0, overdue: 0, annualRemaining: 0 });

    // Pagination refs
    const PAGE_SIZE = 50;
    const pageRef = useRef(0);
    const hasMoreRef = useRef(true);
    const loadingRef = useRef(false);

    // Reset visible count when filters change
    useEffect(() => {
        // This useEffect was for visibleCount, which is now replaced by pagination logic.
        // If visibleCount is still needed for something else, it should be re-evaluated.
        // For now, removing the setVisibleCount(30) as it's not directly applicable to the new pagination.
        // The pagination logic will handle resetting when filters change by calling fetchPayments(true).
    }, [searchQuery, statusFilter, monthFilter, schoolLevelFilter]);

    useEffect(() => {
        if (!authLoading) {
            if (profile?.company_id) {
                // Reset pagination and fetch payments when filters or archived status changes
                pageRef.current = 0;
                hasMoreRef.current = true;
                fetchPayments(true);
            } else {
                // Auth is ready but no profile found - stop the spinner
                setIsLoading(false);
            }
        }
    }, [profile?.company_id, authLoading, searchQuery, statusFilter, monthFilter, schoolLevelFilter, showArchived]); // Added showArchived and authLoading

    const fetchPayments = async (reset = false) => {
        console.log("fetchPayments started", { reset, profileId: profile?.id });
        if (!profile?.company_id) {
            console.log("No profile company_id, stopping loading");
            setIsLoading(false);
            return;
        }

        if (loadingRef.current && !reset) return;

        // Fail-safe timeout
        const timeoutId = setTimeout(() => {
            if (loadingRef.current) {
                console.warn("fetchPayments timeout reached");
                loadingRef.current = false;
                setLoading(false);
                setIsLoading(false);
            }
        }, 10000);

        loadingRef.current = true;
        if (reset) {
            setIsLoading(true);
            setPayments([]);
            pageRef.current = 0;
            hasMoreRef.current = true;
        }
        setLoading(true);

        try {
            console.log("Querrying Supabase...");

            // -- NEW STATS QUERY (Ignores statusFilter and pagination) --
            let statsQuery = supabase
                .from('payments')
                .select('amount, status, due_date')
                .eq('company_id', profile.company_id);

            if (!showArchived) {
                statsQuery = statsQuery.eq('is_archived', false);
            }
            if (monthFilter !== 'all') {
                statsQuery = statsQuery.eq('month', monthFilter);
            }

            const { data: statsData } = await statsQuery;
            let totalReceivable = 0;
            let totalCollected = 0;
            let totalOverdue = 0;

            const today = new Date().toISOString().split('T')[0];

            if (statsData) {
                statsData.forEach((p: any) => {
                    if (p.status === 'Ödendi') {
                        totalCollected += p.amount;
                    } else if (p.status === 'Bekliyor') {
                        totalReceivable += p.amount;
                        if (p.due_date < today) {
                            totalOverdue += p.amount;
                        }
                    }
                });
            }

            // Calculate total annual remaining debt from student records
            let totalAnnualRemaining = 0;

            const { data: activeStudents } = await supabase
                .from('students')
                .select('id, total_debt')
                .eq('company_id', profile.company_id)
                .neq('status', 'pending');

            if (activeStudents) {
                activeStudents.forEach((s: any) => {
                    const debt = Number(s.total_debt) || 0;
                    if (debt > 0) {
                        totalAnnualRemaining += debt;
                    }
                });
            }

            setStats({
                receivable: totalReceivable,
                collected: totalCollected,
                overdue: totalOverdue,
                annualRemaining: totalAnnualRemaining
            });
            // -------------------------------------------------------------

            let query = supabase
                .from('payments')
                .select(`
                    id, invoice_no, student_id, month, amount, due_date, status, payment_method, is_archived,
                    student:students(full_name, parent_name, parent_phone, school_level, neighborhood, total_debt, custom_price)
                `);

            if (!showArchived) {
                query = query.eq('is_archived', false);
            } else {
                query = query.eq('is_archived', true);
            }

            let matchedStudentIds: string[] | null = null;
            if (searchQuery || schoolLevelFilter !== 'all') {
                let sq = supabase.from('students').select('id').eq('company_id', profile.company_id);
                if (searchQuery) {
                    sq = sq.or(`full_name.ilike.%${searchQuery}%,parent_name.ilike.%${searchQuery}%`);
                }
                if (schoolLevelFilter !== 'all') {
                    sq = sq.eq('school_level', schoolLevelFilter);
                }
                const { data: stData } = await sq;
                matchedStudentIds = stData ? stData.map(s => s.id) : [];
                if (matchedStudentIds.length === 0) {
                    matchedStudentIds = ['00000000-0000-0000-0000-000000000000'];
                }
            }

            if (searchQuery && schoolLevelFilter === 'all') {
                query = query.or(`invoice_no.ilike.%${searchQuery}%,month.ilike.%${searchQuery}%${matchedStudentIds ? `,student_id.in.(${matchedStudentIds.join(',')})` : ''}`);
            } else if (searchQuery && schoolLevelFilter !== 'all') {
                // If there's a school filter, we only want payments from those students
                query = query.in('student_id', matchedStudentIds || []);
                query = query.or(`invoice_no.ilike.%${searchQuery}%,month.ilike.%${searchQuery}%,student_id.in.(${matchedStudentIds?.join(',') || ''})`);
            } else if (!searchQuery && schoolLevelFilter !== 'all') {
                query = query.in('student_id', matchedStudentIds || []);
            }

            if (statusFilter !== 'all') {
                if (statusFilter === 'gecikti') {
                    query = query.eq('status', 'Bekliyor').lt('due_date', new Date().toISOString().split('T')[0]);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }
            if (monthFilter !== 'all') {
                query = query.eq('month', monthFilter);
            }

            const { data, error } = await query
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false })
                .range(pageRef.current * PAGE_SIZE, (pageRef.current + 1) * PAGE_SIZE - 1);

            if (error) throw error;

            if (data) {
                const mappedPayments: Payment[] = data.map(p => {
                    // Temporarily using empty data while debugging the hang
                    const studentData = (p as any).student ? (Array.isArray((p as any).student) ? (p as any).student[0] : (p as any).student) : undefined;

                    return {
                        id: p.id,
                        invoice_no: p.invoice_no,
                        student_id: p.student_id,
                        month: p.month,
                        amount: p.amount,
                        due_date: p.due_date,
                        status: p.status as Payment['status'],
                        payment_method: p.payment_method,
                        is_archived: p.is_archived,
                        student: studentData
                    };
                });

                setPayments(prevPayments => reset ? mappedPayments : [...prevPayments, ...mappedPayments]);
                hasMoreRef.current = data.length === PAGE_SIZE;

                // Update available months and levels only if we got data or it's a reset
                if (reset || data.length > 0) {
                    const allLoaded = reset ? mappedPayments : [...payments, ...mappedPayments];
                    const uniqueMonths = Array.from(new Set(allLoaded.map(p => p.month))).filter(Boolean);
                    setAvailableMonths(uniqueMonths);

                    const uniqueLevels = Array.from(new Set(allLoaded.map(p => p.student?.school_level).filter(Boolean)));
                    setAvailableSchoolLevels(uniqueLevels as string[]);
                }
            } else {
                hasMoreRef.current = false;
            }
        } catch (error: any) {
            console.error('Error fetching payments:', error);
            alert(`Sorgu hatası: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            clearTimeout(timeoutId);
            loadingRef.current = false;
            setLoading(false);
            setIsLoading(false);
        }
    };

    const handleBulkBilling = async (month: string, dueDate: string) => {
        if (!profile?.company_id) {
            alert('Hata: Profil bilgilerine ulaşılamıyor. Lütfen sayfayı yenileyip tekrar deneyin.');
            return;
        }

        try {
            // 1. Fetch active students and global pricing rules
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id, school_id, school_level, neighborhood, custom_price, total_debt')
                .eq('status', 'active')
                .eq('company_id', profile.company_id)
                .limit(5000);
            
            if (studentError) throw studentError;

            const { data: pricingRules, error: pricingError } = await supabase
                .from('pricing_rules')
                .select('id, school_id, school_level, amount')
                .eq('company_id', profile.company_id);

            if (pricingError) throw pricingError;

            // Optional: check existing bills for that month to avoid duplicates
            const { data: existingPayments } = await supabase
                .from('payments')
                .select('student_id')
                .eq('month', month)
                .eq('company_id', profile.company_id)
                .limit(5000);

            const existingStudentIds = new Set(existingPayments?.map(ep => ep.student_id) || []);

            const invoicesToInsert = [];
            let skippedNoPriceCount = 0;

            for (let i = 0; i < (students || []).length; i++) {
                const s = students![i];

                if (existingStudentIds.has(s.id)) continue; // skip already billed

                // Determine price
                let billAmount = s.custom_price;
                if (!billAmount) {
                    const normNeighborhood = s.neighborhood?.toLocaleLowerCase('tr-TR')?.trim();
                    // 1. Try school-specific pricing rule
                    let rule = pricingRules?.find(pr => 
                        pr.school_id === s.school_id &&
                        pr.school_level?.toLocaleLowerCase('tr-TR')?.trim() === normNeighborhood
                    );
                    // 2. Fallback to general pricing rule (where school_id is null)
                    if (!rule) {
                        rule = pricingRules?.find(pr => 
                            !pr.school_id &&
                            pr.school_level?.toLocaleLowerCase('tr-TR')?.trim() === normNeighborhood
                        );
                    }

                    if (rule && rule.amount) {
                        billAmount = rule.amount;
                    } else if (s.total_debt && s.total_debt > 0) {
                        // Divide annual debt by multiplier to get monthly bill amount
                        const { data: comp2 } = await supabase.from('companies').select('company_name').eq('id', profile?.company_id).single();
                        const isH = (comp2?.company_name || '').toLowerCase().includes('halegül') || (comp2?.company_name || '').toLowerCase().includes('halegul');
                        const isOzhamle = (comp2?.company_name || '').toLowerCase().includes('özhamle') || (comp2?.company_name || '').toLowerCase().includes('ozhamle');
                        const isHakanGuvencer = isOzhamle && s.schools && (s.schools.name || '').toLowerCase().replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/\s+/g, '').includes('hakanguvencer');
                        const divMultiplier = isHakanGuvencer ? 11 : (isH ? 9 : 10);
                        billAmount = Math.round(s.total_debt / divMultiplier);
                    } else {
                        billAmount = 0;
                    }
                }

                if (billAmount === 0 || billAmount === null || billAmount === undefined) {
                    skippedNoPriceCount++;
                    continue;
                }

                invoicesToInsert.push({
                    company_id: profile.company_id,
                    invoice_no: '',
                    student_id: s.id,
                    month: month,
                    amount: billAmount,
                    due_date: dueDate,
                    status: 'Bekliyor'
                });
            }

            if (invoicesToInsert.length === 0) {
                if (skippedNoPriceCount > 0) {
                    alert(`Oluşturulacak fatura bulunamadı. Aktif ${skippedNoPriceCount} öğrencinin özel fiyatı yok veya Okul Kademesi için 'Ayarlar' sayfasında bir standart fiyat tanımlanmamış.`);
                } else {
                    alert(`Bu ay (${month}) için tüm aktif öğrencilerin zaten faturası var.`);
                }
                return;
            }

            // 3. Insert into database
            const { error: insertError } = await supabase
                .from('payments')
                .insert(invoicesToInsert);

            if (insertError) throw insertError;

            let successMessage = `${invoicesToInsert.length} öğrenci için ${month} faturası başarıyla oluşturuldu!`;
            if (skippedNoPriceCount > 0) {
                successMessage += `\n\nDikkat: ${skippedNoPriceCount} adet öğrenci için fiyat bilgisi bulunamadığı (Özel fiyat veya Ayarlarda Kademe fiyatı eksik) için borçlandırılmadı.`;
            }

            alert(successMessage);
            window.location.reload(); // Force reload to ensure everything is fresh
        } catch (error) {
            console.error('BulkBilling error:', error);
            alert('Hata: Faturalandırma tamamlanamadı. Veritabanı bağlantısını kontrol edin.');
        }
    };

    const handleMarkAsPaid = async (payment: Payment) => {
        if (!confirm(`${payment.student?.full_name} isimli öğrencinin ${payment.month} ayı (${payment.amount}₺) faturasını ödendi olarak işaretlemek istiyor musunuz?`)) return;

        try {
            // Set payment as paid today
            const { error } = await supabase
                .from('payments')
                .update({
                    status: 'Ödendi',
                    payment_method: 'Nakit/Banka Transferi' // Or leave empty / show a modal to select
                })
                .eq('id', payment.id);

            if (error) throw error;

            // Deduct paid amount from student's total_debt
            if (payment.student_id && payment.amount > 0) {
                const { data: st } = await supabase.from('students').select('total_debt, custom_price, schools(name)').eq('id', payment.student_id).single();
                let currentDebt = Number(st?.total_debt) || 0;

                // Only initialize debt if it was never set (null/undefined), NOT if it's 0
                if (st?.total_debt === null || st?.total_debt === undefined) {
                      const { data: comp } = await supabase.from('companies').select('company_name').eq('id', profile?.company_id).single();
                      const isHalegul = (comp?.company_name || '').toLowerCase().includes('halegül') || (comp?.company_name || '').toLowerCase().includes('halegul');
                      const isGuroz = (comp?.company_name || '').toLowerCase().includes('güroz') || (comp?.company_name || '').toLowerCase().includes('guroz');
                      const isOzhamle = (comp?.company_name || '').toLowerCase().includes('özhamle') || (comp?.company_name || '').toLowerCase().includes('ozhamle');
                      const isHakanGuvencer = isOzhamle && st?.schools && (st.schools.name || '').toLowerCase().replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/\s+/g, '').includes('hakanguvencer');
                      const multiplier = isHakanGuvencer ? 11 : ((isHalegul || isGuroz) ? 9 : 10);
                      currentDebt = Number(payment.amount) * multiplier;
                }

                const newDebt = Math.max(0, currentDebt - Number(payment.amount));
                await supabase.from('students').update({ total_debt: newDebt }).eq('id', payment.student_id);
            }

            fetchPayments(true); // Reset and refetch all payments
        } catch (error) {
            console.error('Error marking as paid:', error);
            alert('Hata: Ödendi olarak işaretlenemedi.');
        }
    };

    const handleMarkAsUnpaid = async (payment: Payment) => {
        if (!confirm(`Bu ödemeyi "Bekliyor" durumuna geri almak istediğinize emin misiniz?`)) return;
        try {
            const { error } = await supabase.from('payments').update({ status: 'Bekliyor' }).eq('id', payment.id);
            if (error) throw error;

            // Refund paid amount back to student's total_debt (unconditional)
            if (payment.student_id && payment.amount > 0) {
                const { data: st } = await supabase.from('students').select('total_debt').eq('id', payment.student_id).single();
                const currentDebt = Number(st?.total_debt) || 0;
                const newDebt = currentDebt + Number(payment.amount);
                await supabase.from('students').update({ total_debt: newDebt }).eq('id', payment.student_id);
            }

            fetchPayments(true); // Reset and refetch all payments
        } catch (error) {
            console.error(error);
            alert('Hata: Durum geri alınamadı.');
        }
    };

    const handleRemind = (payment: Payment) => {
        const phone = payment.student?.parent_phone;
        if (!phone) {
            alert('Bu öğrencinin veli telefon numarası kayıtlı değil.');
            return;
        }

        const message = `Sayın ${payment.student?.parent_name},\n\n${payment.student?.full_name} isimli öğrencinizin ServisBot sistemindeki ${payment.month} ayı servis ücreti olan ${payment.amount} TL henüz ödenmemiş görünmektedir. Lütfen gecikme yaşamamak adına ödemenizi yapınız. Anlayışınız için teşekkürler.`;

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        // Convert local 05xx to 905xx
        const formattedPhone = cleanPhone.startsWith('0') ? '9' + cleanPhone : (cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone);

        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleDelete = async (payment: Payment) => {
        if (!confirm(`Bu ödeme kaydını ${payment.is_archived ? 'arşivden çıkarmak' : 'arşivlemek'} istediğinize emin misiniz?`)) return;
        try {
            const { error } = await supabase.from('payments').update({ is_archived: !payment.is_archived }).eq('id', payment.id);
            if (error) throw error;
            // Full reset to not mess up infinite scroll
            setPayments([]);
            pageRef.current = 0;
            hasMoreRef.current = true;
            fetchPayments(true);
        } catch (error) {
            alert('Hata oluştu');
        }
    };

    // Derived Statistics and Filters
    const filteredPayments = useMemo(() => {
        // With infinite scroll, `payments` already contains the loaded and potentially filtered data.
        // This `useMemo` is now primarily for client-side filtering of the *currently loaded* payments
        // if the backend filtering isn't comprehensive enough, or for stats.
        // However, the `fetchPayments` already applies all filters, so `payments` should already be filtered.
        // This `filteredPayments` might be redundant if `payments` is always the result of the full query.
        // For now, keeping it as it was, assuming `payments` might contain more than just the current view.
        // If `payments` is always the fully filtered and paginated list, then `filteredPayments` would just be `payments`.
        return payments.filter(payment => {
            const matchesSearch =
                payment.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.student?.parent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'gecikti' && payment.status === 'Bekliyor' && new Date(payment.due_date) < new Date()) ||
                (statusFilter === payment.status);

            const matchesMonth = monthFilter === 'all' || payment.month === monthFilter;

            const matchesSchoolLevel = schoolLevelFilter === 'all' || payment.student?.school_level === schoolLevelFilter;

            return matchesSearch && matchesStatus && matchesMonth && matchesSchoolLevel;
        });
    }, [payments, searchQuery, statusFilter, monthFilter, schoolLevelFilter]);

    // Financial calculations handled by fetchPayments

    // Selection Handlers
    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]);
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.length === filteredPayments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPayments.map(p => p.id));
        }
    };

    // CSV Export
    const handleExportExcel = () => {
        if (filteredPayments.length === 0) {
            alert('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        const exportData = filteredPayments.map(p => {
            let sl = p.student?.school_level || '';
            if (sl === 'primary') sl = 'İlkokul';
            else if (sl === 'middle') sl = 'Ortaokul';
            else if (sl === 'high') sl = 'Lise';

            return {
                "Fatura No": p.invoice_no,
                "Ay": p.month,
                "Öğrenci Adı": p.student?.full_name || '',
                "Veli Adı": p.student?.parent_name || '',
                "Telefon": p.student?.parent_phone || '',
                "Okul Kademesi": sl,
                "Tutar": p.amount,
                "Son Ödeme Tarihi": p.due_date,
                "Durum": p.status
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Auto-fit columns
        const colWidths = [
            { wch: 20 }, // Fatura No
            { wch: 15 }, // Ay
            { wch: 30 }, // Öğrenci Adı
            { wch: 30 }, // Veli Adı
            { wch: 15 }, // Telefon
            { wch: 15 }, // Okul Kademesi
            { wch: 15 }, // Tutar
            { wch: 20 }, // Son Ödeme Tarihi
            { wch: 15 }  // Durum
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ödemeler Raporu");
        XLSX.writeFile(wb, `Odemeler_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Batch Actions
    const handleBatchMarkAsPaid = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Seçili ${selectedIds.length} faturayı "Ödendi" olarak işaretlemek istediğinize emin misiniz?`)) return;

        try {
            const selectedPayments = payments.filter(p => selectedIds.includes(p.id) && p.status !== 'Ödendi');

            const { error } = await supabase
                .from('payments')
                .update({ status: 'Ödendi', payment_method: 'Toplu İşlem' })
                .in('id', selectedIds);

            if (error) throw error;

            const { data: comp } = await supabase.from('companies').select('company_name').eq('id', profile?.company_id).single();
            const isHalegul = (comp?.company_name || '').toLowerCase().includes('halegül') || (comp?.company_name || '').toLowerCase().includes('halegul');
            const isGuroz = (comp?.company_name || '').toLowerCase().includes('güroz') || (comp?.company_name || '').toLowerCase().includes('guroz');
            const multiplier = (isHalegul || isGuroz) ? 9 : 10;

            // Group payments by student to handle multiple payments per student correctly
            const studentPaymentMap = new Map<string, number>();
            for (const p of selectedPayments) {
                if (p.student_id && p.amount > 0) {
                    studentPaymentMap.set(p.student_id, (studentPaymentMap.get(p.student_id) || 0) + Number(p.amount));
                }
            }

            // Deduct total per-student amount in a single update
            for (const [studentId, totalAmount] of studentPaymentMap) {
                const { data: st } = await supabase.from('students').select('total_debt').eq('id', studentId).single();
                let currentDebt = Number(st?.total_debt) || 0;

                // Only initialize debt if it was never set (null/undefined)
                if (st?.total_debt === null || st?.total_debt === undefined) {
                    currentDebt = totalAmount * multiplier;
                }

                const newDebt = Math.max(0, currentDebt - totalAmount);
                await supabase.from('students').update({ total_debt: newDebt }).eq('id', studentId);
            }

            setSelectedIds([]);
            fetchPayments(true); // Reset and refetch all payments
        } catch (error) {
            console.error('Batch update error:', error);
            alert('Hata oluştu.');
        }
    };

    const handleBatchArchive = async () => {
        if (selectedIds.length === 0) return;
        const actionText = showArchived ? 'arşivden çıkarmak' : 'arşivlemek';
        if (!confirm(`Seçili ${selectedIds.length} faturayı ${actionText} istediğinize emin misiniz?`)) return;

        try {
            const { error } = await supabase.from('payments').update({ is_archived: !showArchived }).in('id', selectedIds);
            if (error) throw error;
            setSelectedIds([]);
            setPayments([]);
            pageRef.current = 0;
            hasMoreRef.current = true;
            fetchPayments(true);
        } catch (error) {
            console.error('Batch archive error:', error);
            alert('Hata oluştu.');
        }
    };



    const handleDeleteAll = async () => {
        if (!window.confirm('DİKKAT: Tüm ödeme kayıtlarını (faturaları) kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;

        const confirmText = window.prompt('Tüm kayıtları silmek için kutuya "SİL" yazın:');
        if (confirmText !== 'SİL') {
            alert('İşlem iptal edildi.');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('payments')
                .delete()
                .eq('company_id', profile?.company_id);

            if (error) throw error;

            alert('Tüm ödeme kayıtları başarıyla silindi.');
            setPayments([]);
            pageRef.current = 0;
            hasMoreRef.current = true;
            fetchPayments(true);
        } catch (error) {
            console.error('Error deleting all payments:', error);
            alert('Silme işlemi sırasında hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Refetch on toggle show archived
    useEffect(() => {
        if (profile?.company_id) {
            setPayments([]);
            pageRef.current = 0;
            hasMoreRef.current = true;
            fetchPayments(true);
        }
    }, [showArchived]);

    // Infinite Scroll handler with IntersectionObserver
    const observer = useRef<IntersectionObserver | null>(null);
    const lastPaymentElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loadingRef.current) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreRef.current) {
                pageRef.current += 1;
                fetchPayments(false);
            }
        }, { rootMargin: '200px' });

        if (node) observer.current.observe(node);
    }, [loadingRef.current, hasMoreRef.current]); // Dependencies for useCallback



    return (
        <div className="w-full px-4 md:px-8 py-8 mx-auto flex flex-col gap-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        Ödeme & Tahsilat
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Öğrenci ödemelerini, gecikmiş alacakları ve tahsilatları yönetin.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto flex-wrap">
                    <button
                        onClick={handleDeleteAll}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                        title="Tüm ödeme kayıtlarını kalıcı olarak sil"
                    >
                        <Trash2 size={20} />
                        <span className="hidden sm:inline">Tümünü Sil</span>
                    </button>

                    <button
                        onClick={() => setIsBulkBillingModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Toplu Borçlandır</span>
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                    >
                        <Download size={20} />
                        <span className="hidden sm:inline">Rapor İndir</span>
                    </button>
                </div>
            </div>

            {/* Financial Highlights (Stats) - 5 Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 shrink-0">
                {/* Show All */}
                <div 
                    onClick={() => {
                        setStatusFilter('all');
                        setMonthFilter('all');
                        setSchoolLevelFilter('all');
                        setSearchQuery('');
                    }}
                    className={`cursor-pointer bg-white p-3.5 md:p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border transition-all hover:shadow-md hover:-translate-y-0.5 group flex items-center justify-between ${
                        statusFilter === 'all' && monthFilter === 'all' && schoolLevelFilter === 'all' && !searchQuery
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
                            : 'border-slate-100 hover:border-indigo-200'
                    }`}
                >
                    <div>
                        <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px] mb-0.5">Tüm Kayıtlar</p>
                        <h3 className="text-lg lg:text-xl font-black text-indigo-600 transition-colors group-hover:text-indigo-700">Tümünü Gör</h3>
                    </div>
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                        <Layers size={18} />
                    </div>
                </div>

                {/* Collected */}
                <div 
                    onClick={() => setStatusFilter('Ödendi')}
                    className={`cursor-pointer bg-white p-3.5 md:p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border transition-all hover:shadow-md hover:-translate-y-0.5 group flex items-center justify-between ${
                        statusFilter === 'Ödendi' 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
                            : 'border-slate-100 hover:border-emerald-200'
                    }`}
                >
                    <div>
                        <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px] mb-0.5">Tahsil Edilen (Kasa)</p>
                        <h3 className="text-lg lg:text-xl font-black text-emerald-600 transition-colors group-hover:text-emerald-700">{stats.collected.toLocaleString('tr-TR')} ₺</h3>
                    </div>
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                        <TrendingUp size={18} />
                    </div>
                </div>

                {/* Pending */}
                <div 
                    onClick={() => setStatusFilter('Bekliyor')}
                    className={`cursor-pointer bg-white p-3.5 md:p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border transition-all hover:shadow-md hover:-translate-y-0.5 group flex items-center justify-between ${
                        statusFilter === 'Bekliyor' 
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' 
                            : 'border-slate-100 hover:border-blue-200'
                    }`}
                >
                    <div>
                        <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px] md:text-[11px] mb-0.5">Bekleyen Alacak</p>
                        <h3 className="text-lg lg:text-xl font-black text-blue-600 transition-colors group-hover:text-blue-700">{stats.receivable.toLocaleString('tr-TR')} ₺</h3>
                    </div>
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                        <FileText size={18} />
                    </div>
                </div>

                {/* Overdue */}
                <div 
                    onClick={() => setStatusFilter('gecikti')}
                    className={`cursor-pointer bg-white p-3.5 md:p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group flex items-center justify-between ${
                        statusFilter === 'gecikti' 
                            ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20' 
                            : 'border-red-100 hover:border-red-200'
                    }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="z-10 relative">
                        <p className="text-red-600/80 font-bold uppercase tracking-wider text-[10px] md:text-[11px] mb-0.5">Gecikmiş Alacak</p>
                        <h3 className="text-lg lg:text-xl font-black text-red-700">{stats.overdue.toLocaleString('tr-TR')} ₺</h3>
                    </div>
                    <div className="w-9 h-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center z-10 relative shrink-0 transition-transform group-hover:scale-110">
                        <AlertTriangle size={18} />
                    </div>
                </div>

                {/* Total Annual Remaining Debt */}
                <div 
                    className="col-span-2 sm:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 p-3.5 md:p-4 rounded-2xl shadow-md border border-slate-700 text-white flex items-center justify-between transition-transform hover:-translate-y-0.5 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="z-10 relative">
                        <p className="text-slate-300 font-bold uppercase tracking-wider text-[10px] md:text-[11px] mb-0.5">Yıllık Kalan</p>
                        <h3 className="text-lg lg:text-xl font-black text-white">{(stats.annualRemaining || 0).toLocaleString('tr-TR')} ₺</h3>
                    </div>
                    <div className="w-9 h-9 bg-white/10 text-white rounded-xl flex items-center justify-center z-10 relative shrink-0 backdrop-blur-sm transition-transform group-hover:scale-110">
                        <span className="text-base">💰</span>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-3 md:p-4 rounded-t-2xl border border-b-0 border-slate-100 flex flex-col xl:flex-row gap-3 items-center justify-between shadow-sm mt-2">
                <div className="flex gap-2 w-full xl:w-2/5">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="İsim veya Fatura No..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm bg-slate-50 hover:bg-white text-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-2 w-full xl:w-auto flex-wrap md:flex-nowrap">
                    <div className="relative flex-1 md:flex-none min-w-[140px]">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white"
                        >
                            <option value="all">Tüm Durumlar</option>
                            <option value="Bekliyor">Bekleyenler</option>
                            <option value="Ödendi">Ödenenler</option>
                            <option value="gecikti">Gecikenler</option>
                        </select>
                    </div>

                    <select
                        value={schoolLevelFilter}
                        onChange={(e) => setSchoolLevelFilter(e.target.value)}
                        className="flex-1 md:flex-none min-w-[140px] py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white"
                    >
                        <option value="all">Kademeler</option>
                        {availableSchoolLevels.map(sl => {
                            let displaySl = sl;
                            if (sl === 'primary') displaySl = 'İlkokul';
                            else if (sl === 'middle') displaySl = 'Ortaokul';
                            else if (sl === 'high') displaySl = 'Lise';
                            return <option key={sl} value={sl}>{displaySl}</option>;
                        })}
                    </select>

                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="flex-1 md:flex-none min-w-[120px] py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white"
                    >
                        <option value="all">Tüm Aylar</option>
                        {availableMonths.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    
                    <label className="flex flex-1 md:flex-none items-center justify-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Arşiv</span>
                    </label>
                </div>
            </div>

            {/* Table Area - Scrollable */}
            {isLoading && payments.length === 0 ? (
                <div className="flex-1 bg-white border border-t-0 border-slate-100 rounded-b-2xl flex items-center justify-center p-12">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Loader2 size={24} className="text-blue-500 animate-spin" />
                        </div>
                        <p className="text-slate-500 font-medium">Ödemeler yükleniyor...</p>
                    </div>
                </div>
            ) : (!profile && !authLoading) ? (
                <div className="flex-1 bg-white border border-t-0 border-slate-100 rounded-b-2xl flex items-center justify-center p-12 text-center">
                    <div className="max-w-md">
                        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Profil Bilgisi Bulunamadı</h3>
                        <p className="text-slate-600 mb-6">
                            Giriş yapmış görünüyorsunuz ancak veritabanında kullanıcı profilinize ulaşılamadı.
                            Eğer veritabanını sıfırladıysanız lütfen tekrar kayıt olun.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Sayfayı Yenile
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full">
                    {/* Archive Mode Banner */}
                    {showArchived && (
                        <div className="bg-amber-50 border-b border-amber-200 p-3 px-6 flex items-center justify-between text-amber-900 text-sm font-semibold">
                            <div className="flex items-center gap-2">
                                <Archive size={18} className="text-amber-600" />
                                <span>📁 Arşivlenmiş Faturalar Gösteriliyor. Arşivdeki faturaları yeniden aktife almak için "Arşivden Çıkar" butonunu kullanabilirsiniz.</span>
                            </div>
                        </div>
                    )}

                    {/* Batch Actions Bar */}
                    {selectedIds.length > 0 && (
                        <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 flex items-center justify-between animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <CheckSquare size={18} className="text-blue-600" />
                                <span className="font-bold text-blue-800">{selectedIds.length} fatura seçildi</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {!showArchived && (
                                    <button
                                        onClick={handleBatchMarkAsPaid}
                                        className="px-4 py-2 bg-white text-blue-600 font-bold border border-blue-200 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
                                    >
                                        <CheckCircle size={16} />
                                        Toplu Ödendi İşaretle
                                    </button>
                                )}
                                <button
                                    onClick={handleBatchArchive}
                                    className="px-4 py-2 bg-white text-slate-700 font-bold border border-slate-300 rounded-lg shadow-sm hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
                                >
                                    {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                    {showArchived ? 'Toplu Arşivden Çıkar' : 'Toplu Arşivle'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="w-full p-0 m-0">
                        <PaymentList
                            payments={payments}
                            selectedIds={selectedIds}
                            onToggleSelect={handleToggleSelect}
                            onToggleSelectAll={handleToggleSelectAll}
                            onMarkAsPaid={handleMarkAsPaid}
                            onMarkAsUnpaid={handleMarkAsUnpaid}
                            onDelete={handleDelete}
                            onRemind={handleRemind}
                        />
                        {/* Infinite Scroll Trigger Element Inside Table */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 border-t border-slate-100">
                                <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
                                <span className="text-slate-500 font-medium text-lg">Yükleniyor...</span>
                            </div>
                        )}
                        {!loading && hasMoreRef.current && (
                            <div ref={lastPaymentElementRef} className="h-10 w-full shrink-0" />
                        )}
                        {!hasMoreRef.current && payments.length > 0 && (
                            <div className="text-center text-slate-600 text-lg font-bold py-8 bg-slate-50 border-t border-slate-200 shadow-inner">
                                Bütün ödeme kayıtları listelendi.
                            </div>
                        )}
                        {!loading && payments.length === 0 && (
                            <div className="text-center text-slate-500 text-lg font-bold py-12 bg-slate-50 border-t border-slate-100">
                                Bu kriterlere uygun ödeme bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <BulkBillingModal
                isOpen={isBulkBillingModalOpen}
                onClose={() => setIsBulkBillingModalOpen(false)}
                onConfirm={handleBulkBilling}
            />
        </div>
    );
};

export default Payments;
