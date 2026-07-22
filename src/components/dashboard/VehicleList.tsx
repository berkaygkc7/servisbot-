import React from 'react';
import { Edit, Trash2, MapPin } from 'lucide-react';

export interface Vehicle {
    id: string;
    plate: string;
    driver: string;
    capacity: number;
    status: 'active' | 'maintenance' | 'out_of_service' | 'inactive';
    location: string;
    current_latitude?: number;
    current_longitude?: number;
    driver_id?: string;
}

interface VehicleListProps {
    vehicles: Vehicle[];
    onEdit: (vehicle: Vehicle) => void;
    onDelete: (id: string) => void;
    onShowLocation: (vehicle: Vehicle) => void;
}

const VehicleList: React.FC<VehicleListProps> = ({ vehicles, onEdit, onDelete, onShowLocation }) => {
    const getStatusColor = (status: Vehicle['status']) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'maintenance': return 'bg-amber-100 text-amber-700';
            case 'out_of_service': return 'bg-red-100 text-red-700';
            case 'inactive': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusText = (status: Vehicle['status']) => {
        switch (status) {
            case 'active': return 'Aktif';
            case 'maintenance': return 'Bakımda';
            case 'out_of_service': return 'Servis Dışı';
            case 'inactive': return 'Pasif';
            default: return status;
        }
    };

    const getStatusDotColor = (status: Vehicle['status']) => {
        switch (status) {
            case 'active': return 'bg-emerald-500';
            case 'maintenance': return 'bg-amber-500';
            case 'out_of_service': return 'bg-red-500';
            case 'inactive': return 'bg-slate-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Plaka</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Sürücü</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Kapasite</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Konum</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Durum</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {vehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4 text-slate-800 font-medium">{vehicle.plate}</td>
                                <td className="p-4 text-slate-600">{vehicle.driver}</td>
                                <td className="p-4 text-slate-600">{vehicle.capacity} Kişilik</td>
                                <td className="p-4 text-slate-600">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <MapPin size={14} />
                                        {vehicle.location}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDotColor(vehicle.status)}`}></span>
                                        {getStatusText(vehicle.status)}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onShowLocation(vehicle)}
                                            className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Konumu Göster"
                                        >
                                            <MapPin size={16} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(vehicle)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-secondary transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Bu aracı silmek istediğinize emin misiniz?')) {
                                                    onDelete(vehicle.id);
                                                }
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                            title="Sil"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VehicleList;
