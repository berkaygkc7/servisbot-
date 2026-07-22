import React from 'react';
import { Map, Clock, Navigation, Trash2 } from 'lucide-react';

interface RouteDef {
    id: string;
    name: string;
    vehicle: string;
    distance: string;
    duration: string;
    stops: number;
    status: 'active' | 'completed' | 'pending';
    time?: string;
    school_name?: string;
    tags?: string[];
}

interface RouteListProps {
    routes: RouteDef[];
    selectedRouteId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit?: (id: string) => void;
}

const RouteList: React.FC<RouteListProps> = ({ routes, selectedRouteId, onSelect, onDelete, onEdit }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Rotalar</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{routes.length} Rota</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {routes.map((route) => (
                    <div
                        key={route.id}
                        onClick={() => onSelect(route.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-md ${selectedRouteId === route.id
                            ? 'border-secondary bg-secondary/5 shadow-md'
                            : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-secondary/50'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-bold text-sm ${selectedRouteId === route.id ? 'text-secondary' : 'text-slate-800'}`}>
                                        {route.name}
                                    </h4>
                                    {route.time && (
                                        <span className="text-xs font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded shadow-sm border border-blue-200">
                                            {route.time}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] font-bold text-indigo-600 mt-0.5 uppercase tracking-wider">
                                    {route.school_name || 'Okul Belirsiz'}
                                </div>
                                {route.tags && route.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {route.tags.map((tag, idx) => (
                                            <span key={idx} className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 mt-1">{route.vehicle}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(route.id);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Rotayı Düzenle"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Bu rotayı silmek istediğinize emin misiniz?')) {
                                            onDelete(route.id);
                                        }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Rotayı Sil"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className={`w-2 h-2 rounded-full ${route.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                                    route.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
                                    }`} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-600 mt-3">
                            <div className="flex items-center gap-1">
                                <Navigation size={14} className={selectedRouteId === route.id ? 'text-secondary' : 'text-slate-400'} />
                                {route.distance}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock size={14} className="text-amber-500" />
                                {route.duration}
                            </div>
                            <div className="flex items-center gap-1">
                                <Map size={14} className="text-purple-500" />
                                {route.stops} Durak
                            </div>
                        </div>
                    </div>
                ))}

            </div>
        </div>
    );
};

export default RouteList;
