import React, { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    eachDayOfInterval,
    isWithinInterval,
    parseISO
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

export interface DriverLeave {
    id: string;
    driver_id: string;
    start_date: string;
    end_date: string;
    reason?: string;
    driver_name?: string;
}

interface DriverLeaveCalendarProps {
    leaves: DriverLeave[];
    onDateClick: (date: Date) => void;
}

const DriverLeaveCalendar: React.FC<DriverLeaveCalendarProps> = ({ leaves, onDateClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                        <CalendarIcon size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-3 py-1 text-sm font-medium text-secondary hover:bg-secondary/5 rounded-md transition-colors"
                    >
                        Bugün
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        return (
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                {days.map((day, i) => (
                    <div key={i} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const calendarDays = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        const rows: React.ReactNode[] = [];
        let days: React.ReactNode[] = [];

        calendarDays.forEach((day: Date, i: number) => {
            const formattedDate = format(day, 'd');
            const isSelected = isSameDay(day, new Date());
            const dayLeaves = leaves.filter(leave =>
                isWithinInterval(day, {
                    start: parseISO(leave.start_date),
                    end: parseISO(leave.end_date)
                })
            );

            days.push(
                <div
                    key={day.toString()}
                    className={`min-h-[100px] border-r border-b border-slate-100 p-2 transition-all relative group cursor-pointer hover:bg-slate-50/50 ${!isSameMonth(day, monthStart) ? 'bg-slate-50/30 text-slate-300' : 'text-slate-700'
                        }`}
                    onClick={() => onDateClick(day)}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-secondary text-white shadow-md shadow-blue-200' : ''
                            }`}>
                            {formattedDate}
                        </span>
                    </div>

                    <div className="space-y-1 overflow-hidden">
                        {dayLeaves.map((leave, idx) => (
                            <div
                                key={leave.id || idx}
                                className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 rounded-md truncate flex items-center gap-1"
                                title={`${leave.driver_name}: ${leave.reason || 'İzinli'}`}
                            >
                                <span className="w-1 h-1 bg-amber-400 rounded-full flex-shrink-0"></span>
                                <span className="font-medium">{leave.driver_name}</span>
                            </div>
                        ))}
                        {dayLeaves.length > 3 && (
                            <div className="text-[9px] text-slate-400 font-medium pl-1">
                                +{dayLeaves.length - 3} daha...
                            </div>
                        )}
                    </div>

                    <button className="absolute bottom-2 right-2 p-1 bg-secondary/10 text-secondary rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={12} />
                    </button>
                </div>
            );

            if ((i + 1) % 7 === 0) {
                rows.push(
                    <div className="grid grid-cols-7" key={day.toString()}>
                        {days}
                    </div>
                );
                days = [];
            }
        });

        return <div className="bg-white">{rows}</div>;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
            {renderHeader()}
            {renderDays()}
            <div className="flex-1 overflow-auto">
                {renderCells()}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-sm"></span>
                    <span>Sürücü İzni</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-secondary rounded-full"></span>
                    <span>Bugün</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <Info size={14} className="text-slate-400" />
                    <span>Güne tıklayarak yeni izin ekleyebilirsiniz.</span>
                </div>
            </div>
        </div>
    );
};

export default DriverLeaveCalendar;
