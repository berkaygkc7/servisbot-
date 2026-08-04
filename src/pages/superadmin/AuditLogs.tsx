import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, Clock, Globe, User, Database, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  action_type: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  ip_address: string;
  created_at: string;
  companies?: { company_name: string };
  users?: { full_name: string, email: string };
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          companies ( company_name ),
          users ( full_name, email )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLogs(data as AuditLog[]);
      if (count !== null) setTotalLogs(count);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return 'Ekleme';
      case 'UPDATE': return 'Güncelleme';
      case 'DELETE': return 'Silme';
      case 'LOGIN': return 'Sisteme Giriş';
      default: return action;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-blue-500" />
            Denetim Kayıtları (Audit Logs)
          </h1>
          <p className="text-slate-500 mt-1">Sistemdeki tüm kullanıcı hareketlerini ve veri değişikliklerini takip edin.</p>
        </div>
        <button onClick={fetchLogs} className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="p-4 font-semibold">Tarih</th>
                <th className="p-4 font-semibold">İşlem / Tablo</th>
                <th className="p-4 font-semibold">Kullanıcı & IP</th>
                <th className="p-4 font-semibold">Firma</th>
                <th className="p-4 font-semibold text-right">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Kayıtlar yükleniyor...</td>
                </tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock size={16} className="text-slate-400" />
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getActionColor(log.action_type)}`}>
                          {getActionLabel(log.action_type)}
                        </span>
                        <div className="flex items-center gap-1 text-sm text-slate-600 font-medium">
                          <Database size={14} className="text-slate-400" />
                          {log.table_name}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                          <User size={14} className="text-slate-400" />
                          {log.users?.full_name || log.users?.email || 'Sistem / Anonim'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Globe size={12} />
                          {log.ip_address || 'Bilinmiyor'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-700 font-medium">{log.companies?.company_name || '-'}</span>
                    </td>
                    <td className="p-4 text-right">
                      {(log.old_data || log.new_data) && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center"
                        >
                          {expandedLogId === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded Row for JSON Diff */}
                  {expandedLogId === log.id && (log.old_data || log.new_data) && (
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={5} className="p-0">
                        <div className="p-4 px-6 grid grid-cols-2 gap-4">
                          {log.old_data && (
                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                              <h4 className="text-xs font-bold text-red-600 uppercase mb-2">Eski Veri (Silinen/Değişen)</h4>
                              <pre className="text-xs text-slate-700 overflow-x-auto font-mono">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                              <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Yeni Veri (Eklenen/Güncel)</h4>
                              <pre className="text-xs text-slate-700 overflow-x-auto font-mono">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalLogs > 0 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Toplam <span className="font-bold text-slate-700">{totalLogs}</span> işlem kaydından <span className="font-bold text-slate-700">{(page - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-700">{Math.min(page * pageSize, totalLogs)}</span> arası gösteriliyor.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Önceki
              </button>
              <div className="flex items-center px-4 py-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-700">
                {page} / {Math.ceil(totalLogs / pageSize)}
              </div>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(totalLogs / pageSize), p + 1))}
                disabled={page >= Math.ceil(totalLogs / pageSize)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
