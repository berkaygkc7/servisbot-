import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Send } from 'lucide-react';

interface QrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    type: 'driver' | 'parent';
    userName: string;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, token, type, userName }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !token) return null;

    // Use placeholder domain or app scheme. Expo go deep link for dev, custom scheme for prod.
    const baseUrl = 'servisbot://login';
    const loginLink = `${baseUrl}?token=${token}&type=${type}`;
    const roleText = type === 'driver' ? 'Şoför' : 'Veli';

    const handleCopy = () => {
        navigator.clipboard.writeText(loginLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsAppShare = () => {
        const message = `Merhaba ${userName},\n\nServisBot uygulamasına şifresiz giriş yapmak için aşağıdaki linke tıklayabilirsiniz:\n\n${loginLink}\n\nİyi günler dileriz.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-slate-50 p-5 flex items-center justify-between border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{roleText} Girişi</h3>
                        <p className="text-sm font-medium text-slate-500">{userName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* QR Code Content */}
                <div className="p-6 flex flex-col items-center">
                    <p className="text-sm text-center text-slate-600 mb-6 font-medium">
                        Mobil uygulamadan, kamerayı kullanarak aşağıdaki QR kodu okutun:
                    </p>

                    <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 mb-6 relative">
                        {/* Decorative borders for QR */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>

                        <QRCodeSVG
                            value={loginLink}
                            size={180}
                            level="H"
                            includeMargin={false}
                            fgColor="#0f172a"
                        />
                    </div>

                    <div className="w-full h-px bg-slate-100 my-4 relative flex items-center justify-center">
                        <span className="bg-white px-3 text-xs font-bold text-slate-300 uppercase tracking-widest">veya</span>
                    </div>

                    <p className="text-sm text-center text-slate-600 mb-4 font-medium">
                        Doğrudan giriş linkini paylaşın:
                    </p>

                    <div className="flex gap-2 w-full">
                        <button
                            onClick={handleCopy}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${copied
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Kopyalandı' : 'Kopyala'}
                        </button>

                        <button
                            onClick={handleWhatsAppShare}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold transition-colors shadow-lg shadow-green-200"
                        >
                            <Send size={18} />
                            WhatsApp
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default QrCodeModal;
