import React from 'react';
import { AccountSettings } from '../../components/settings/AccountSettings';

export default function SuperAdminAccount() {
  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-up max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Hesabım</h1>
        <p className="text-slate-500 mt-2 text-lg">Süper admin hesap bilgilerinizi ve şifrenizi yönetin.</p>
      </div>

      <AccountSettings />
    </div>
  );
}
